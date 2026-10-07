/*
  Portal do professor. Publica uma vez para várias turmas, confere entregas de tarefa, corrige redação pelas
  cinco competências do Enem, chama a fila do plantão e envia avisos às próprias turmas.
*/
import { useState } from "preact/hooks";
import * as acao from "../dominio/acoes";
import {
  COMPETENCIAS,
  NIVEIS_COMPETENCIA,
  notaRedacao,
  alunosDaTurma,
  aulasDoProfessor,
  diaDe,
  disciplina,
  entregaDe,
  filaAtiva,
  nomeDe,
  plantoesDoDia,
  podeEditarMaterial,
  podeRetirarMaterial,
  situacaoTarefa,
  TIPOS_MATERIAL,
  turma,
  validarLink,
  adesaoAviso,
} from "../dominio/regras";
import type { Anexo, Banco, Material } from "../dominio/tipos";
import type { ItemNav } from "../App";
import { href, ir, loja, useLoja } from "../estado/loja";
import { Abas, Avatar, Botao, Cabecalho, Campo, Escolhas, Estado, Icone, Janela, LinkBotao, Numero, Secao, Selo, resultado } from "../ui/base";
import { ItemAviso, Linha, NotaRedacao, SITUACAO } from "../ui/comum";
import { ListaAnexos, Miniatura, SeletorArquivos, useEnvio } from "../ui/envio";
import { data, dataHora, plural, prazo, primeiroNome, quando } from "../ui/formato";
import { Leitor } from "../ui/leitor";

export function navProfessor(b: Banco, id: string, agora: Date): ItemNav[] {
  const paraConferir = b.entregas.filter((e) => e.status === "enviada" && b.tarefas.find((t) => t.id === e.tarefaId)?.professorId === id).length;
  const dia = diaDe(agora);
  const fila = plantoesDoDia(b, dia)
    .filter((p) => p.professorId === id)
    .reduce((s, p) => s + filaAtiva(b, p.id, dia).filter((f) => f.status === "aguardando").length, 0);
  return [
    { id: "inicio", rotulo: "Hoje", icone: "inicio" },
    { id: "materiais", rotulo: "Materiais", icone: "material" },
    { id: "tarefas", rotulo: "Tarefas", icone: "tarefa", contagem: paraConferir },
    { id: "plantao", rotulo: "Plantão", icone: "fila", contagem: fila },
    { id: "avisos", rotulo: "Avisos", icone: "aviso" },
    { id: "turmas", rotulo: "Turmas", icone: "pessoas" },
  ];
}

export function PortalProfessor({ secao, id }: { secao: string; id?: string }) {
  if (secao === "materiais") return id === "novo" ? <FormMaterial /> : id ? <DetalheMaterial id={id} /> : <Materiais />;
  if (secao === "tarefas") return id === "nova" ? <FormTarefa /> : id ? <Entregas id={id} /> : <Tarefas />;
  if (secao === "plantao") return <Plantao />;
  if (secao === "avisos") return <Avisos />;
  if (secao === "turmas") return <Turmas id={id} />;
  return <Hoje />;
}

/** Turmas e disciplinas que a pessoa ensina, agrupadas por disciplina. */
function minhasAulas(b: Banco, id: string, dia: string) {
  const aulas = aulasDoProfessor(b, id, dia);
  const porDisciplina = new Map<string, string[]>();
  aulas.forEach((a) => porDisciplina.set(a.disciplinaId, [...(porDisciplina.get(a.disciplinaId) ?? []), a.turmaId]));
  return porDisciplina;
}

const nomesTurmas = (b: Banco, ids: string[]) => ids.map((t) => turma(b, t)?.nome).join(", ");

/* ---------- hoje ---------- */

function Hoje() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const plantoes = plantoesDoDia(banco, dia).filter((p) => p.professorId === eu!.id);
  const minhasTarefas = banco.tarefas.filter((t) => t.professorId === eu!.id);
  const paraConferir = banco.entregas.filter((e) => e.status === "enviada" && minhasTarefas.some((t) => t.id === e.tarefaId));
  const rascunhos = banco.materiais.filter((m) => m.autorId === eu!.id && m.status === "rascunho");
  const publicados = banco.materiais.filter((m) => m.autorId === eu!.id && m.status === "publicado");

  return (
    <div class="pagina">
      <Cabecalho
        titulo={`Olá, ${primeiroNome(eu!.nome)}`}
        sub={[...minhasAulas(banco, eu!.id, dia).entries()].map(([d, ts]) => `${disciplina(banco, d)?.nome}: ${nomesTurmas(banco, ts)}`).join(" · ")}
        acoes={
          <LinkBotao variante="primario" icone="mais" href={href("professor", "materiais", "novo")}>
            Publicar material
          </LinkBotao>
        }
      />
      <div class="numeros">
        <Numero valor={paraConferir.length} rotulo="entregas para conferir" tom={paraConferir.length ? "acao" : undefined} />
        <Numero valor={publicados.length} rotulo="materiais publicados" />
        <Numero valor={rascunhos.length} rotulo="rascunhos" />
        <Numero valor={plantoes.reduce((s, p) => s + filaAtiva(banco, p.id, dia).length, 0)} rotulo="na fila do plantão hoje" />
      </div>
      <div class="grade-2">
        <Secao titulo="Plantão de hoje">
          {plantoes.length ? (
            <div class="linhas">
              {plantoes.map((p) => (
                <Linha key={p.id} href={href("professor", "plantao")} destaque>
                  <span class="linha__principal">
                    <span class="linha__titulo">
                      {disciplina(banco, p.disciplinaId)?.nome}, {p.inicio}–{p.fim}
                    </span>
                    <span class="linha__meta">{p.local}</span>
                  </span>
                  <span class="linha__lateral">{plural(filaAtiva(banco, p.id, dia).length, "na fila", "na fila")}</span>
                </Linha>
              ))}
            </div>
          ) : (
            <Estado icone="plantao" titulo="Você não tem plantão hoje." />
          )}
        </Secao>
        <Secao titulo="Para conferir">
          {paraConferir.length ? (
            <div class="linhas">
              {minhasTarefas
                .map((t) => ({ t, n: paraConferir.filter((e) => e.tarefaId === t.id).length }))
                .filter((x) => x.n)
                .map(({ t, n }) => (
                  <Linha key={t.id} href={href("professor", "tarefas", t.id)}>
                    <span class="linha__principal">
                      <span class="linha__titulo">{t.titulo}</span>
                      <span class="linha__meta">{nomesTurmas(banco, t.turmaIds)}</span>
                    </span>
                    <Selo tom="acao">{plural(n, "nova", "novas")}</Selo>
                  </Linha>
                ))}
            </div>
          ) : (
            <Estado icone="ok" titulo="Nenhuma entrega esperando." />
          )}
        </Secao>
        {rascunhos.length > 0 && (
          <Secao titulo="Rascunhos">
            <div class="linhas">
              {rascunhos.map((m) => (
                <Linha key={m.id} href={href("professor", "materiais", m.id)}>
                  <span class="linha__principal">
                    <span class="linha__titulo">{m.atual.titulo}</span>
                    <span class="linha__meta">Salvo {quando(m.atual.em, agora)}</span>
                  </span>
                  <Selo>Rascunho</Selo>
                </Linha>
              ))}
            </div>
          </Secao>
        )}
      </div>
    </div>
  );
}

/* ---------- materiais ---------- */

const STATUS_MAT = { publicado: { r: "Publicado", t: "ok" }, rascunho: { r: "Rascunho", t: "neutro" }, retirado: { r: "Retirado", t: "perigo" } } as const;

function Materiais() {
  const { banco, eu, agora } = useLoja();
  const [aba, setAba] = useState<"publicado" | "rascunho" | "retirado">("publicado");
  const meus = banco.materiais.filter((m) => m.autorId === eu!.id);
  const lista = meus.filter((m) => m.status === aba);
  return (
    <div class="pagina">
      <Cabecalho
        titulo="Meus materiais"
        sub="Publique uma vez para todas as turmas da disciplina. O aluno encontra pelo título e pelo contexto da aula."
        acoes={
          <LinkBotao variante="primario" icone="mais" href={href("professor", "materiais", "novo")}>
            Publicar material
          </LinkBotao>
        }
      />
      <Abas
        rotulo="Situação"
        ativa={aba}
        aoMudar={setAba}
        abas={(["publicado", "rascunho", "retirado"] as const).map((s) => ({ id: s, rotulo: STATUS_MAT[s].r + "s", contagem: meus.filter((m) => m.status === s).length }))}
      />
      {lista.length ? (
        <div class="linhas">
          {lista.map((m) => (
            <Linha key={m.id} href={href("professor", "materiais", m.id)}>
              <span class="linha__principal">
                <span class="linha__titulo">{m.atual.titulo}</span>
                <span class="linha__meta">
                  {disciplina(banco, m.disciplinaId)?.nome} · {nomesTurmas(banco, m.turmaIds)} · {quando(m.publicadoEm ?? m.atual.em, agora)}
                </span>
              </span>
              <span class="linha__lateral">{m.atual.versao > 1 && <Selo>v{m.atual.versao}</Selo>}</span>
            </Linha>
          ))}
        </div>
      ) : (
        <Estado titulo={aba === "publicado" ? "Você ainda não publicou nada." : aba === "rascunho" ? "Nenhum rascunho." : "Nada retirado."} />
      )}
    </div>
  );
}

function DetalheMaterial({ id }: { id: string }) {
  const { banco, eu, agora } = useLoja();
  const m = banco.materiais.find((x) => x.id === id);
  const [modo, setModo] = useState<"ver" | "corrigir">("ver");
  const [retirar, setRetirar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [aberto, setAberto] = useState<Anexo | null>(null);
  const voltar = { href: href("professor", "materiais"), rotulo: "Meus materiais" };
  const dia = diaDe(agora);

  if (!m || (m.autorId !== eu!.id && m.status !== "publicado")) {
    return (
      <div class="pagina">
        <Cabecalho titulo="Material" voltar={voltar} />
        <Estado icone="busca" titulo="Material não encontrado." />
      </div>
    );
  }
  if (m.status === "rascunho") return <FormMaterial material={m} />;
  if (modo === "corrigir") return <FormMaterial material={m} correcao aoCancelar={() => setModo("ver")} />;

  const alcance = new Set(m.turmaIds.flatMap((t) => alunosDaTurma(banco, t, dia))).size;
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho
        titulo={m.atual.titulo}
        voltar={voltar}
        sub={`${disciplina(banco, m.disciplinaId)?.nome} · ${nomesTurmas(banco, m.turmaIds)} · ${alcance} alunos`}
        acoes={
          <>
            <Selo tom={STATUS_MAT[m.status].t}>{STATUS_MAT[m.status].r}</Selo>
            {podeEditarMaterial(banco, eu, m, dia) && (
              <Botao variante="secundario" icone="editar" onClick={() => setModo("corrigir")}>
                Corrigir
              </Botao>
            )}
            {podeRetirarMaterial(banco, eu, m, dia) && (
              <Botao variante="perigo" onClick={() => setRetirar(true)}>
                Retirar
              </Botao>
            )}
          </>
        }
      />
      {m.retirada && (
        <Estado icone="alerta" tom="alerta" titulo={`Retirado ${quando(m.retirada.em, agora)} por ${nomeDe(banco, m.retirada.por)}`}>
          Motivo mostrado aos alunos: {m.retirada.motivo}
        </Estado>
      )}
      {m.atual.contexto && <p class="texto">{m.atual.contexto}</p>}
      <ul class="anexos" role="list">
        {m.atual.anexos.map((a) => (
          <li key={a.id} class="anexo anexo--pronto">
            <Miniatura anexo={a} />
            <div class="anexo__info">
              <p class="anexo__nome">{a.nome}</p>
            </div>
            <Botao pequeno variante="secundario" onClick={() => setAberto(a)}>
              Abrir
            </Botao>
          </li>
        ))}
      </ul>
      {m.atual.link && (
        <p class="texto">
          <Icone nome="link" tamanho={16} /> <a href={m.atual.link.url} target="_blank" rel="noopener noreferrer">{m.atual.link.rotulo}</a>
        </p>
      )}
      <Secao titulo="Histórico">
        <ol class="historico">
          {[m.atual, ...m.historico].map((r) => (
            <li key={r.versao}>
              <strong>Versão {r.versao}</strong> · {dataHora(r.em)} · {nomeDe(banco, r.autorId)}
              {r.nota && <p>{r.nota}</p>}
            </li>
          ))}
        </ol>
      </Secao>
      <Janela aberta={retirar} aoFechar={() => setRetirar(false)} titulo="Retirar material">
        <p class="texto">Os alunos deixam de abrir o material e passam a ver o motivo abaixo. O registro fica guardado para a coordenação.</p>
        <Campo rotulo="Motivo" id="motivo" dica="Ex.: publiquei a lista errada; a certa sai amanhã.">
          <textarea id="motivo" rows={3} value={motivo} onInput={(e) => setMotivo(e.currentTarget.value)} />
        </Campo>
        <div class="janela__rodape">
          <Botao variante="fantasma" onClick={() => setRetirar(false)}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              if (resultado(loja.executar((b, a, ag) => acao.retirarMaterial(b, a, m.id, motivo, ag)), "Material retirado.")) setRetirar(false);
            }}
          >
            Retirar material
          </Botao>
        </div>
      </Janela>
      <Leitor anexo={aberto} aoFechar={() => setAberto(null)} />
    </div>
  );
}

/** Publicar, continuar rascunho ou corrigir. Revisão dos destinatários antes de publicar. */
function FormMaterial({ material, correcao, aoCancelar }: { material?: Material; correcao?: boolean; aoCancelar?: () => void }) {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const aulas = minhasAulas(banco, eu!.id, dia);
  const discs = [...aulas.keys()];
  const base = material?.atual;
  const [disc, setDisc] = useState(material?.disciplinaId ?? discs[0]);
  const [turmas, setTurmas] = useState<string[]>(material?.turmaIds ?? []);
  const [titulo, setTitulo] = useState(base?.titulo ?? "");
  const [contexto, setContexto] = useState(base?.contexto ?? "");
  const [comLink, setComLink] = useState(!!base?.link);
  const [url, setUrl] = useState(base?.link?.url ?? "");
  const [rotuloLink, setRotuloLink] = useState(base?.link?.rotulo ?? "");
  const [nota, setNota] = useState("");
  const [revisar, setRevisar] = useState(false);
  const [chave] = useState(() => acao.novoId("mat"));
  const envio = useEnvio(base?.anexos ?? [], TIPOS_MATERIAL);
  const erroLink = comLink && url ? (validarLink(url).ok ? undefined : (validarLink(url) as { erro: string }).erro) : undefined;

  const dados = (): acao.DadosMaterial => ({
    titulo,
    contexto,
    disciplinaId: disc,
    turmaIds: turmas,
    anexos: envio.anexos,
    link: comLink && url ? { url, rotulo: rotuloLink } : undefined,
  });
  const turmasDaDisc = aulas.get(disc) ?? [];
  const alcance = new Set(turmas.flatMap((t) => alunosDaTurma(banco, t, dia))).size;
  const voltar = { href: href("professor", "materiais"), rotulo: "Meus materiais" };

  function salvar(publicar: boolean) {
    const r = loja.executar((b, a, ag) =>
      correcao && material
        ? acao.corrigirMaterial(b, a, material.id, dados(), nota, ag)
        : material
          ? acao.editarRascunho(b, a, material.id, dados(), publicar, ag)
          : acao.criarMaterial(b, a, dados(), publicar, ag, chave),
    );
    const msg = correcao ? "Correção publicada. Os alunos veem a nova versão." : publicar ? "Material publicado." : "Rascunho salvo.";
    if (resultado(r, msg)) {
      setRevisar(false);
      if (correcao) aoCancelar?.();
      else ir("professor", "materiais", r.ok ? r.id : undefined);
    } else setRevisar(false);
  }

  return (
    <div class="pagina pagina--estreita">
      <Cabecalho
        titulo={correcao ? "Corrigir material" : material ? "Continuar rascunho" : "Publicar material"}
        voltar={correcao ? undefined : voltar}
        sub={correcao ? "Os alunos continuam vendo a versão atual até você confirmar a correção." : undefined}
      />
      <form
        class="form"
        onSubmit={(e) => {
          e.preventDefault();
          setRevisar(true);
        }}
      >
        <div class="form__bloco">
          <h2 class="form__titulo">1. Para quem</h2>
          {discs.length > 1 && (
            <Escolhas
              rotulo="Disciplina"
              opcoes={discs.map((d) => ({ id: d, rotulo: disciplina(banco, d)!.nome }))}
              valor={[disc]}
              aoMudar={([d]) => {
                setDisc(d);
                setTurmas([]);
              }}
            />
          )}
          <Escolhas multipla rotulo="Turmas" opcoes={turmasDaDisc.map((t) => ({ id: t, rotulo: turma(banco, t)!.nome }))} valor={turmas} aoMudar={setTurmas} />
          <p class="campo__dica">Só aparecem as turmas em que você dá {disciplina(banco, disc)?.nome}.</p>
        </div>

        <div class="form__bloco">
          <h2 class="form__titulo">2. O material</h2>
          <Campo rotulo="Título" id="titulo" dica="Use o tema da aula. É assim que o aluno vai procurar.">
            <input id="titulo" value={titulo} onInput={(e) => setTitulo(e.currentTarget.value)} placeholder="Ex.: Segunda Guerra: mapas da aula" />
          </Campo>
          <Campo rotulo="Contexto (opcional)" id="contexto" dica="Para que serve, qual aula, o que fazer com ele.">
            <textarea id="contexto" rows={3} value={contexto} onInput={(e) => setContexto(e.currentTarget.value)} />
          </Campo>
          <SeletorArquivos envio={envio} aceitar=".pdf,.jpg,.jpeg,.png,.webp,.heic,.pptx,.docx,.xlsx,.mp3,.mp4" rotulo="Anexar arquivos" dica="PDF, imagens, apresentações, documentos, áudio ou vídeo, até 25 MB cada. Arraste para cá se preferir." />
          <ListaAnexos envio={envio} />
          <label class="pessoa__chave">
            <input type="checkbox" checked={comLink} onChange={(e) => setComLink(e.currentTarget.checked)} /> Incluir um link (vídeo, site, formulário)
          </label>
          {comLink && (
            <div class="grade-campos">
              <Campo rotulo="Endereço" id="url" erro={erroLink}>
                <input id="url" inputMode="url" value={url} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="https://" />
              </Campo>
              <Campo rotulo="Texto do botão" id="rotulo-link">
                <input id="rotulo-link" value={rotuloLink} onInput={(e) => setRotuloLink(e.currentTarget.value)} placeholder="Assistir à aula gravada" />
              </Campo>
            </div>
          )}
          {correcao && (
            <Campo rotulo="O que mudou" id="nota" dica="Aparece para o aluno junto do material.">
              <input id="nota" value={nota} onInput={(e) => setNota(e.currentTarget.value)} placeholder="Ex.: corrigi o gabarito da questão 4" />
            </Campo>
          )}
        </div>

        <div class="acoes-form">
          <Botao type="submit" disabled={envio.pendente}>
            {correcao ? "Revisar correção" : "Revisar e publicar"}
          </Botao>
          {!correcao && (
            <Botao variante="secundario" onClick={() => salvar(false)}>
              Salvar rascunho
            </Botao>
          )}
          {correcao && (
            <Botao variante="fantasma" onClick={aoCancelar}>
              Cancelar
            </Botao>
          )}
          {material?.status === "rascunho" && (
            <Botao variante="fantasma" icone="lixo" onClick={() => confirm("Descartar este rascunho?") && resultado(loja.executar((b, a, ag) => acao.excluirRascunho(b, a, material.id, ag)), "Rascunho descartado.") && ir("professor", "materiais")}>
              Descartar
            </Botao>
          )}
          {envio.pendente && <span class="suave">Esperando os arquivos terminarem.</span>}
        </div>
      </form>

      <Janela aberta={revisar} aoFechar={() => setRevisar(false)} titulo="Confira antes de publicar">
        <dl class="revisao">
          <div>
            <dt>Título</dt>
            <dd>{titulo || <span class="erro-texto">Falta o título</span>}</dd>
          </div>
          <div>
            <dt>Vai para</dt>
            <dd>{turmas.length ? `${nomesTurmas(banco, turmas)} (${alcance} alunos)` : <span class="erro-texto">Nenhuma turma escolhida</span>}</dd>
          </div>
          <div>
            <dt>Disciplina</dt>
            <dd>{disciplina(banco, disc)?.nome}</dd>
          </div>
          <div>
            <dt>Conteúdo</dt>
            <dd>
              {envio.prontos.length ? plural(envio.prontos.length, "arquivo", "arquivos") : "Nenhum arquivo"}
              {comLink && url ? " e um link" : ""}
            </dd>
          </div>
        </dl>
        <p class="campo__dica">Os alunos dessas turmas veem o material na hora, na lista e na tela de início.</p>
        <div class="janela__rodape">
          <Botao variante="fantasma" onClick={() => setRevisar(false)}>
            Voltar e editar
          </Botao>
          <Botao icone="ok" onClick={() => salvar(true)}>
            {correcao ? "Publicar correção" : "Publicar agora"}
          </Botao>
        </div>
      </Janela>
    </div>
  );
}

/* ---------- tarefas ---------- */

function Tarefas() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const minhas = banco.tarefas.filter((t) => t.professorId === eu!.id);
  return (
    <div class="pagina">
      <Cabecalho
        titulo="Tarefas"
        sub="O aluno envia as fotos pelo celular e recebe comprovante. Você confere ou devolve com um comentário."
        acoes={
          <LinkBotao variante="primario" icone="mais" href={href("professor", "tarefas", "nova")}>
            Nova tarefa
          </LinkBotao>
        }
      />
      {minhas.length ? (
        <div class="linhas">
          {minhas.map((t) => {
            const alunos = t.turmaIds.flatMap((x) => alunosDaTurma(banco, x, dia));
            const entregues = alunos.filter((a) => entregaDe(banco, t.id, a)).length;
            const novas = banco.entregas.filter((e) => e.tarefaId === t.id && e.status === "enviada").length;
            return (
              <Linha key={t.id} href={href("professor", "tarefas", t.id)}>
                <span class="linha__principal">
                  <span class="linha__titulo">{t.titulo}</span>
                  <span class="linha__meta">
                    {nomesTurmas(banco, t.turmaIds)} · {prazo(t.prazo, agora)}
                  </span>
                </span>
                <span class="linha__lateral">
                  <span class="progresso" aria-label={`${entregues} de ${alunos.length} entregaram`}>
                    <span style={{ width: `${(entregues / Math.max(1, alunos.length)) * 100}%` }} />
                  </span>
                  <span class="suave">
                    {entregues}/{alunos.length}
                  </span>
                  {novas > 0 && <Selo tom="acao">{novas} p/ conferir</Selo>}
                </span>
              </Linha>
            );
          })}
        </div>
      ) : (
        <Estado icone="tarefa" titulo="Nenhuma tarefa passada ainda." />
      )}
    </div>
  );
}

function FormTarefa() {
  const { banco, eu, agora } = useLoja();
  const aulas = minhasAulas(banco, eu!.id, diaDe(agora));
  const discs = [...aulas.keys()];
  const [disc, setDisc] = useState(discs[0]);
  const [turmas, setTurmas] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const amanha = new Date(agora.getTime() + 2 * 864e5);
  const [diaPrazo, setDiaPrazo] = useState(diaDe(amanha));
  const [horaPrazo, setHoraPrazo] = useState("23:59");
  const [reenvio, setReenvio] = useState(true);
  const ehRedacao = disciplina(banco, disc)?.nome === "Redação";
  const [competencias, setCompetencias] = useState(true);

  return (
    <div class="pagina pagina--estreita">
      <Cabecalho titulo="Nova tarefa" voltar={{ href: href("professor", "tarefas"), rotulo: "Tarefas" }} />
      <form
        class="form"
        onSubmit={(e) => {
          e.preventDefault();
          const r = loja.executar((b, a, ag) =>
            acao.criarTarefa(
              b,
              a,
              { titulo, instrucoes, disciplinaId: disc, turmaIds: turmas, prazo: new Date(`${diaPrazo}T${horaPrazo}:00`).toISOString(), permiteReenvio: reenvio, tipo: ehRedacao && competencias ? "redacao" : undefined },
              ag,
            ),
          );
          if (resultado(r, "Tarefa criada. Os alunos já veem no celular.")) ir("professor", "tarefas");
        }}
      >
        <div class="form__bloco">
          {discs.length > 1 && <Escolhas rotulo="Disciplina" opcoes={discs.map((d) => ({ id: d, rotulo: disciplina(banco, d)!.nome }))} valor={[disc]} aoMudar={([d]) => { setDisc(d); setTurmas([]); }} />}
          <Escolhas multipla rotulo="Turmas" opcoes={(aulas.get(disc) ?? []).map((t) => ({ id: t, rotulo: turma(banco, t)!.nome }))} valor={turmas} aoMudar={setTurmas} />
          <Campo rotulo="O que fazer" id="t-titulo">
            <input id="t-titulo" value={titulo} onInput={(e) => setTitulo(e.currentTarget.value)} placeholder="Ex.: Exercícios 1 a 3 da página 112" />
          </Campo>
          <Campo rotulo="Instruções (opcional)" id="t-inst">
            <textarea id="t-inst" rows={3} value={instrucoes} onInput={(e) => setInstrucoes(e.currentTarget.value)} />
          </Campo>
          <div class="grade-campos">
            <Campo rotulo="Prazo" id="t-dia">
              <input id="t-dia" type="date" value={diaPrazo} onInput={(e) => setDiaPrazo(e.currentTarget.value)} />
            </Campo>
            <Campo rotulo="Até as" id="t-hora">
              <input id="t-hora" type="time" value={horaPrazo} onInput={(e) => setHoraPrazo(e.currentTarget.value)} />
            </Campo>
          </div>
          <label class="pessoa__chave">
            <input type="checkbox" checked={reenvio} onChange={(e) => setReenvio(e.currentTarget.checked)} /> O aluno pode trocar a entrega até o prazo
          </label>
          {ehRedacao && (
            <label class="pessoa__chave">
              <input type="checkbox" checked={competencias} onChange={(e) => setCompetencias(e.currentTarget.checked)} /> Corrigir pelas cinco competências do Enem
            </label>
          )}
        </div>
        <div class="acoes-form">
          <Botao type="submit">Passar tarefa</Botao>
        </div>
      </form>
    </div>
  );
}

function Entregas({ id }: { id: string }) {
  const { banco, eu, agora } = useLoja();
  const t = banco.tarefas.find((x) => x.id === id && x.professorId === eu!.id);
  const [aberta, setAberta] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [arquivo, setArquivo] = useState<Anexo | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "conferir" | "faltam">("todos");
  const [notas, setNotas] = useState<(number | null)[]>([null, null, null, null, null]);
  const voltar = { href: href("professor", "tarefas"), rotulo: "Tarefas" };
  if (!t) {
    return (
      <div class="pagina">
        <Cabecalho titulo="Tarefa" voltar={voltar} />
        <Estado icone="busca" titulo="Tarefa não encontrada." />
      </div>
    );
  }
  const alunos = [...new Set(t.turmaIds.flatMap((x) => alunosDaTurma(banco, x, diaDe(agora))))]
    .map((a) => ({ a, e: entregaDe(banco, t.id, a) }))
    .sort((x, y) => nomeDe(banco, x.a).localeCompare(nomeDe(banco, y.a)));
  const lista = alunos.filter(({ e }) => (filtro === "conferir" ? e?.status === "enviada" : filtro === "faltam" ? !e : true));

  const redacao = t.tipo === "redacao";
  const avaliar = (entregaId: string, status: "conferida" | "devolvida") => {
    const comp = redacao && status === "conferida" ? (notas.some((n) => n === null) ? [] : (notas as number[])) : undefined;
    const msg = status === "devolvida" ? "Devolvida ao aluno." : redacao ? "Redação corrigida. O aluno já vê a nota." : "Entrega conferida.";
    if (resultado(loja.executar((b, a, ag) => acao.avaliarEntrega(b, a, entregaId, status, comentario, ag, comp)), msg)) {
      setAberta(null);
      setComentario("");
      setNotas([null, null, null, null, null]);
    }
  };

  return (
    <div class="pagina">
      <Cabecalho titulo={t.titulo} voltar={voltar} sub={`${nomesTurmas(banco, t.turmaIds)} · prazo ${dataHora(t.prazo)}`} />
      <div class="numeros">
        <Numero valor={alunos.filter((x) => x.e).length} rotulo={`de ${alunos.length} entregaram`} />
        <Numero valor={alunos.filter((x) => x.e?.status === "enviada").length} rotulo="para conferir" tom="acao" />
        <Numero valor={alunos.filter((x) => !x.e).length} rotulo="sem entrega" />
      </div>
      <Abas rotulo="Filtro" ativa={filtro} aoMudar={setFiltro} abas={[{ id: "todos", rotulo: "Todos" }, { id: "conferir", rotulo: "Para conferir" }, { id: "faltam", rotulo: "Sem entrega" }]} />
      <div class="linhas">
        {lista.map(({ a, e }) => {
          const s = situacaoTarefa(t, e, agora);
          return (
            <div key={a} class="entrega">
              <div class="entrega__linha">
                <Avatar id={a} nome={nomeDe(banco, a)} tamanho={32} />
                <span class="linha__principal">
                  <span class="linha__titulo">{nomeDe(banco, a)}</span>
                  <span class="linha__meta">{e ? `${dataHora(e.enviadaEm)} · ${plural(e.anexos.length, "arquivo", "arquivos")}${e.tentativa > 1 ? ` · ${e.tentativa}ª tentativa` : ""}` : "Ainda não entregou"}</span>
                </span>
                <Selo tom={SITUACAO[s].tom}>{SITUACAO[s].rotulo}</Selo>
                {e && (
                  <Botao variante="secundario" pequeno onClick={() => { setAberta(aberta === e.id ? null : e.id); setNotas([null, null, null, null, null]); setComentario(""); }}>
                    {aberta === e.id ? "Fechar" : "Ver"}
                  </Botao>
                )}
              </div>
              {e && aberta === e.id && (
                <div class="entrega__corpo">
                  <ul class="miniaturas" role="list">
                    {e.anexos.map((x) => (
                      <li key={x.id}>
                        <button type="button" class="miniaturas__item" onClick={() => setArquivo(x)}>
                          <Miniatura anexo={x} />
                          <span>{x.nome}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {e.retorno ? (
                    <>
                      <p class="suave">
                        {e.status === "devolvida" ? "Devolvida" : e.retorno.competencias ? "Corrigida" : "Conferida"} {quando(e.retorno.em, agora)}
                        {e.retorno.texto && `: ${e.retorno.texto}`}
                      </p>
                      {e.retorno.competencias && <NotaRedacao competencias={e.retorno.competencias} />}
                    </>
                  ) : (
                    <>
                      {redacao && (
                        <fieldset class="competencias">
                          <legend class="form__titulo">Nota por competência</legend>
                          {COMPETENCIAS.map((c, i) => (
                            <label class="competencias__linha" key={c.id}>
                              <span>
                                <strong>{c.id}</strong> {c.rotulo}
                              </span>
                              <select value={notas[i] ?? ""} onChange={(ev) => setNotas(notas.map((n, j) => (j === i ? (ev.currentTarget.value === "" ? null : Number(ev.currentTarget.value)) : n)))}>
                                <option value="">Escolha</option>
                                {NIVEIS_COMPETENCIA.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                          <p class="competencias__total" aria-live="polite">
                            {notas.every((n) => n !== null) ? `Nota: ${notaRedacao(notas as number[])} de 1000` : `Faltam ${notas.filter((n) => n === null).length} competências`}
                          </p>
                        </fieldset>
                      )}
                      <Campo rotulo="Comentário para o aluno" id={`c-${e.id}`} dica="Obrigatório ao devolver.">
                        <textarea id={`c-${e.id}`} rows={2} value={comentario} onInput={(ev) => setComentario(ev.currentTarget.value)} />
                      </Campo>
                      <div class="acoes-form">
                        <Botao icone="ok" onClick={() => avaliar(e.id, "conferida")}>
                          {redacao ? "Lançar nota" : "Conferida"}
                        </Botao>
                        <Botao variante="secundario" onClick={() => avaliar(e.id, "devolvida")}>
                          Devolver para refazer
                        </Botao>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Leitor anexo={arquivo} aoFechar={() => setArquivo(null)} />
    </div>
  );
}

/* ---------- plantão ---------- */

function Plantao() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const hoje = plantoesDoDia(banco, dia).filter((p) => p.professorId === eu!.id);
  const todos = banco.plantoes.filter((p) => p.professorId === eu!.id);
  const NOMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return (
    <div class="pagina">
      <Cabecalho titulo="Plantão" sub="A fila atualiza sozinha. Chame o próximo quando terminar um atendimento; grupos ocupam uma posição só." />
      {hoje.length === 0 && <Estado icone="plantao" titulo="Você não tem plantão hoje." />}
      {hoje.map((p) => {
        const fila = filaAtiva(banco, p.id, dia);
        const chamado = fila.find((f) => f.status === "chamado");
        const aguardando = fila.filter((f) => f.status === "aguardando");
        const atendidos = banco.fila.filter((f) => f.plantaoId === p.id && f.data === dia && f.status === "atendido").length;
        return (
          <section key={p.id} class="painel-fila">
            <div class="painel-fila__topo">
              <div>
                <h2 class="secao__titulo">
                  {disciplina(banco, p.disciplinaId)?.nome}, {p.inicio}–{p.fim}
                </h2>
                <p class="suave">
                  {p.local} · {plural(atendidos, "atendimento feito", "atendimentos feitos")}
                </p>
              </div>
              <Botao icone="seta" onClick={() => resultado(loja.executar((b, a, ag) => acao.chamarProximo(b, a, p.id, ag)), aguardando.length ? `Chamando ${nomeDe(banco, aguardando[0].alunoIds[0]).split(" ")[0]}.` : "Atendimento encerrado.")} disabled={!aguardando.length && !chamado}>
                {aguardando.length ? "Chamar próximo" : "Encerrar atendimento"}
              </Botao>
            </div>
            {chamado && (
              <div class="chamado">
                <span class="pilha-avatares">
                  {chamado.alunoIds.map((x) => (
                    <Avatar key={x} id={x} nome={nomeDe(banco, x)} tamanho={44} />
                  ))}
                </span>
                <p class="chamado__rotulo">Em atendimento</p>
                <p class="chamado__nomes">{chamado.alunoIds.map((x) => nomeDe(banco, x)).join(", ")}</p>
                {chamado.duvida && <p>“{chamado.duvida}”</p>}
              </div>
            )}
            {aguardando.length ? (
              <ol class="fila">
                {aguardando.map((f, i) => (
                  <li key={f.id} class="fila__item">
                    <span class="fila__pos">{i + 1}</span>
                    <span class="pilha-avatares">
                      {f.alunoIds.map((x) => (
                        <Avatar key={x} id={x} nome={nomeDe(banco, x)} tamanho={36} />
                      ))}
                    </span>
                    <span class="linha__principal">
                      <span class="linha__titulo">
                        {f.alunoIds.map((x) => nomeDe(banco, x)).join(", ")}
                        {f.alunoIds.length > 1 && <Selo>Grupo de {f.alunoIds.length}</Selo>}
                      </span>
                      <span class="linha__meta">
                        {f.duvida ? `“${f.duvida}”` : "Sem dúvida descrita"} · entrou {quando(f.entrouEm, agora)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              !chamado && <Estado icone="fila" titulo="Ninguém na fila agora." />
            )}
          </section>
        );
      })}
      <Secao titulo="Sua escala">
        <div class="linhas">
          {todos.map((p) => (
            <div class="linha" key={p.id}>
              <span class="linha__principal">
                <span class="linha__titulo">
                  {disciplina(banco, p.disciplinaId)?.nome} · {p.diasSemana.map((d) => NOMES[d]).join(", ")}
                </span>
                <span class="linha__meta">
                  {p.inicio}–{p.fim} · {p.local} · {p.series}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p class="fonte">A escala é mantida pela coordenação.</p>
      </Secao>
    </div>
  );
}

/* ---------- avisos ---------- */

function Avisos() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const turmas = [...new Set(aulasDoProfessor(banco, eu!.id, dia).map((a) => a.turmaId))];
  const [sel, setSel] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [para, setPara] = useState<("alunos" | "familias")[]>(["alunos"]);
  const [ciencia, setCiencia] = useState(false);
  const meus = banco.avisos.filter((a) => a.autorId === eu!.id);

  return (
    <div class="pagina">
      <Cabecalho titulo="Avisos" sub="Para as suas turmas. Avisos para a escola toda saem pela coordenação." />
      <div class="grade-2 grade-2--larga">
        <Secao titulo="Novo aviso">
          <form
            class="form"
            onSubmit={(e) => {
              e.preventDefault();
              const r = loja.executar((b, a, ag) =>
                acao.publicarAviso(b, a, { titulo, corpo, categoria: "Pedagógico", publico: { tipo: "turmas", turmaIds: sel }, paraAlunos: para.includes("alunos"), paraResponsaveis: para.includes("familias"), exigeCiencia: ciencia }, ag),
              );
              if (resultado(r, "Aviso enviado.")) {
                setTitulo("");
                setCorpo("");
                setSel([]);
              }
            }}
          >
            <Escolhas multipla rotulo="Turmas" opcoes={turmas.map((t) => ({ id: t, rotulo: turma(banco, t)!.nome }))} valor={sel} aoMudar={setSel} />
            <Escolhas multipla rotulo="Quem recebe" opcoes={[{ id: "alunos", rotulo: "Alunos" }, { id: "familias", rotulo: "Responsáveis" }]} valor={para} aoMudar={setPara} />
            <Campo rotulo="Assunto" id="av-t">
              <input id="av-t" value={titulo} onInput={(e) => setTitulo(e.currentTarget.value)} />
            </Campo>
            <Campo rotulo="Mensagem" id="av-c">
              <textarea id="av-c" rows={4} value={corpo} onInput={(e) => setCorpo(e.currentTarget.value)} />
            </Campo>
            <label class="pessoa__chave">
              <input type="checkbox" checked={ciencia} onChange={(e) => setCiencia(e.currentTarget.checked)} /> Pedir confirmação de ciência
            </label>
            <div class="acoes-form">
              <Botao type="submit" icone="enviar">
                Enviar aviso
              </Botao>
            </div>
          </form>
        </Secao>
        <Secao titulo="Enviados">
          {meus.length ? (
            <div class="pilha">
              {meus.map((a) => {
                const ad = adesaoAviso(banco, a, dia);
                return <ItemAviso key={a.id} banco={banco} aviso={a} agora={agora} extra={a.exigeCiencia ? ` · ${ad.confirmados} de ${ad.alvo} confirmaram` : undefined} />;
              })}
            </div>
          ) : (
            <p class="suave">Nenhum aviso enviado.</p>
          )}
        </Secao>
      </div>
    </div>
  );
}

/* ---------- turmas ---------- */

function Turmas({ id }: { id?: string }) {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const turmas = [...new Set(aulasDoProfessor(banco, eu!.id, dia).map((a) => a.turmaId))];
  const ativa = id && turmas.includes(id) ? id : turmas[0];
  const alunos = ativa ? alunosDaTurma(banco, ativa, dia) : [];
  const minhas = banco.tarefas.filter((t) => t.professorId === eu!.id && t.turmaIds.includes(ativa ?? ""));
  return (
    <div class="pagina">
      <Cabecalho titulo="Turmas" sub="Alunos e entregas de cada turma. A tela mostra só o nome e a situação de cada tarefa." />
      <Abas rotulo="Turma" ativa={ativa ?? ""} aoMudar={(t) => ir("professor", "turmas", t)} abas={turmas.map((t) => ({ id: t, rotulo: turma(banco, t)!.nome, contagem: alunosDaTurma(banco, t, dia).length }))} />
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead>
            <tr>
              <th scope="col">Aluno</th>
              {minhas.map((t) => (
                <th scope="col" key={t.id} title={t.titulo}>
                  {t.titulo.length > 22 ? `${t.titulo.slice(0, 22)}…` : t.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunos
              .sort((a, b) => nomeDe(banco, a).localeCompare(nomeDe(banco, b)))
              .map((a) => (
                <tr key={a}>
                  <th scope="row">
                    <span class="celula-pessoa">
                      <Avatar id={a} nome={nomeDe(banco, a)} tamanho={28} />
                      {nomeDe(banco, a)}
                    </span>
                  </th>
                  {minhas.map((t) => {
                    const s = situacaoTarefa(t, entregaDe(banco, t.id, a), agora);
                    return (
                      <td key={t.id}>
                        <Selo tom={SITUACAO[s].tom}>{SITUACAO[s].rotulo}</Selo>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!minhas.length && <p class="fonte">Nenhuma tarefa sua nesta turma ainda.</p>}
      <p class="fonte">Atualizado {data(agora.toISOString())}.</p>
    </div>
  );
}
