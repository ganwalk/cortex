/*
  Portal do aluno. Hipóteses a validar com o Córtex (vindas do Arena): material espalhado em vários canais,
  redação que precisa passar pelo computador para ser enviada, fila do plantão fora do app e simulados noutro lugar.
  Aqui o aluno encontra o material pelo contexto da aula, envia a redação pela câmera com comprovante, vê a nota
  por competência, acompanha os simulados por área e entra na fila do plantão.
*/
import { useState } from "preact/hooks";
import * as acao from "../dominio/acoes";
import {
  AREAS,
  acessoMaterial,
  avisosDoAluno,
  respondePorSi,
  simuladosDoAluno,
  totalSimulado,
  disciplina,
  entradaDoAluno,
  entregaDe,
  eventosDoAluno,
  filaAtiva,
  materiaisDoAluno,
  nomeDe,
  plantoesDoDia,
  podeReenviar,
  posicaoNaFila,
  situacaoTarefa,
  TIPOS_ENTREGA,
  tarefasDoAluno,
  turma,
  turmasDoAluno,
  alunosDaTurma,
  diaDe,
  somarDias,
} from "../dominio/regras";
import type { Banco, Material, Tarefa } from "../dominio/tipos";
import type { ItemNav } from "../App";
import { href, ir, loja, useLoja } from "../estado/loja";
import { Abas, Avatar, Botao, Cabecalho, Campo, Estado, Icone, Secao, Selo, resultado } from "../ui/base";
import { ItemAviso, Linha, NotaRedacao, SITUACAO, Servicos, TabelaNotas, TabelaSimulados } from "../ui/comum";
import { ListaAnexos, Miniatura, SeletorArquivos, useEnvio } from "../ui/envio";
import { data, dataHora, nomeDia, plural, prazo, primeiroNome, quando } from "../ui/formato";
import { Leitor } from "../ui/leitor";
import type { Anexo } from "../dominio/tipos";

export function navAluno(b: Banco, id: string, agora: Date): ItemNav[] {
  const dia = diaDe(agora);
  const pendentes = tarefasDoAluno(b, id, dia).filter((t) => ["pendente", "atrasada", "devolvida"].includes(situacaoTarefa(t, entregaDe(b, t.id, id), agora))).length;
  return [
    { id: "inicio", rotulo: "Início", icone: "inicio" },
    { id: "materiais", rotulo: "Materiais", icone: "material" },
    { id: "tarefas", rotulo: "Tarefas", icone: "tarefa", contagem: pendentes },
    { id: "plantoes", rotulo: "Plantões", icone: "plantao" },
    { id: "notas", rotulo: "Notas e simulados", icone: "nota" },
    { id: "avisos", rotulo: "Avisos", icone: "aviso" },
  ];
}

export function PortalAluno({ secao, id }: { secao: string; id?: string }) {
  if (secao === "materiais") return id ? <DetalheMaterial id={id} /> : <Materiais />;
  if (secao === "tarefas") return id ? <DetalheTarefa id={id} /> : <Tarefas />;
  if (secao === "plantoes") return <Plantoes />;
  if (secao === "notas") return <Notas />;
  if (secao === "avisos") return <Avisos />;
  return <Inicio />;
}

function saudacao(agora: Date) {
  const h = agora.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/* ---------- início ---------- */

function Inicio() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const turmas = turmasDoAluno(banco, eu!.id, dia).map((t) => turma(banco, t)?.nome);
  const tarefas = tarefasDoAluno(banco, eu!.id, dia)
    .map((t) => ({ t, s: situacaoTarefa(t, entregaDe(banco, t.id, eu!.id), agora) }))
    .filter((x) => x.s === "pendente" || x.s === "atrasada" || x.s === "devolvida");
  const materiais = materiaisDoAluno(banco, eu!.id, dia).slice(0, 3);
  const plantoes = plantoesDoDia(banco, dia);
  const minhaFila = plantoes.map((p) => ({ p, pos: posicaoNaFila(banco, p.id, dia, eu!.id) })).find((x) => x.pos !== null);
  const avisos = avisosDoAluno(banco, eu!.id, dia).slice(0, 2);
  const simulados = simuladosDoAluno(banco, eu!.id);
  const ultimo = simulados.at(-1);

  return (
    <div class="pagina">
      <Cabecalho titulo={`${saudacao(agora)}, ${primeiroNome(eu!.nome)}`} sub={`${turmas.join(", ")} · ${diaDaSemanaLonga(agora)}`} />

      {minhaFila && (
        <a class="destaque-fila" href={href("aluno", "plantoes")}>
          <span class="destaque-fila__pos">{minhaFila.pos === 0 ? "Agora" : `${minhaFila.pos}º`}</span>
          <span>
            <strong>{minhaFila.pos === 0 ? "O professor está chamando você." : "Sua posição na fila"}</strong>
            <span>
              Plantão de {disciplina(banco, minhaFila.p.disciplinaId)?.nome}, {minhaFila.p.local}
            </span>
          </span>
        </a>
      )}

      <div class="grade-2">
        <Secao titulo="Para fazer" acao={<a class="link-secao" href={href("aluno", "tarefas")}>Todas as tarefas</a>}>
          {tarefas.length ? (
            <div class="linhas">
              {tarefas.slice(0, 4).map(({ t, s }) => (
                <Linha key={t.id} href={href("aluno", "tarefas", t.id)}>
                  <span class="linha__principal">
                    <span class="linha__titulo">{t.titulo}</span>
                    <span class="linha__meta">
                      {disciplina(banco, t.disciplinaId)?.nome} · {prazo(t.prazo, agora)}
                    </span>
                  </span>
                  <Selo tom={SITUACAO[s].tom}>{SITUACAO[s].rotulo}</Selo>
                </Linha>
              ))}
            </div>
          ) : (
            <Estado icone="ok" titulo="Nada pendente.">Quando um professor passar tarefa, ela aparece aqui com o prazo.</Estado>
          )}
        </Secao>

        <Secao titulo="Materiais novos" acao={<a class="link-secao" href={href("aluno", "materiais")}>Ver todos</a>}>
          {materiais.length ? (
            <div class="linhas">
              {materiais.map((m) => (
                <LinhaMaterial key={m.id} banco={banco} m={m} agora={agora} />
              ))}
            </div>
          ) : (
            <Estado titulo="Nenhum material publicado para a sua turma ainda." />
          )}
        </Secao>

        <Secao titulo={`Plantões de hoje (${plantoes.length})`} acao={<a class="link-secao" href={href("aluno", "plantoes")}>Entrar na fila</a>}>
          {plantoes.length ? (
            <div class="linhas">
              {plantoes.map((p) => (
                <Linha key={p.id} href={href("aluno", "plantoes")}>
                  <Avatar id={p.professorId} nome={nomeDe(banco, p.professorId)} tamanho={36} />
                  <span class="linha__principal">
                    <span class="linha__titulo">
                      {disciplina(banco, p.disciplinaId)?.nome} · {nomeDe(banco, p.professorId)}
                    </span>
                    <span class="linha__meta">
                      {p.inicio}–{p.fim} · {p.local}
                    </span>
                  </span>
                  <span class="linha__lateral">{plural(filaAtiva(banco, p.id, dia).length, "na fila", "na fila")}</span>
                </Linha>
              ))}
            </div>
          ) : (
            <Estado icone="plantao" titulo="Hoje não tem plantão." />
          )}
        </Secao>

        {ultimo && (
          <Secao titulo="Último simulado" acao={<a class="link-secao" href={href("aluno", "notas")}>Todos</a>}>
            <UltimoSimulado banco={banco} alunoId={eu!.id} />
          </Secao>
        )}

        <Secao titulo="Avisos" acao={<a class="link-secao" href={href("aluno", "avisos")}>Todos</a>}>
          <div class="pilha">
            {avisos.map((a) => (
              <ItemAviso key={a.id} banco={banco} aviso={a} agora={agora} />
            ))}
          </div>
        </Secao>
      </div>

      {respondePorSi(banco, eu!.id) && (
        <p class="fonte">
          Você responde pela sua própria matrícula. Avisos da secretaria, contrato e o atendimento ficam no portal{" "}
          <a href={href("pais")}>Responsável</a>.
        </p>
      )}

      <Secao titulo="Outros serviços da escola">
        <Servicos banco={banco} papel="aluno" />
      </Secao>
    </div>
  );
}

/** Acertos por área no último simulado, com a diferença para o anterior. */
function UltimoSimulado({ banco, alunoId }: { banco: Banco; alunoId: string }) {
  const lista = simuladosDoAluno(banco, alunoId);
  const { simulado, resultado } = lista.at(-1)!;
  const anterior = lista.at(-2)?.resultado;
  const total = totalSimulado(simulado, resultado.acertos);
  return (
    <div class="areas">
      {AREAS.map((a) => {
        const dif = anterior ? resultado.acertos[a.id] - anterior.acertos[a.id] : null;
        return (
          <div class="areas__linha" key={a.id}>
            <span>
              {a.rotulo}
              {dif !== null && dif !== 0 && <span class="suave"> ({dif > 0 ? "+" : ""}{dif})</span>}
            </span>
            <span class="medidor" aria-hidden="true">
              <span style={{ width: `${(resultado.acertos[a.id] / simulado.questoes[a.id]) * 100}%` }} />
            </span>
            <span class="areas__valor">
              {resultado.acertos[a.id]}/{simulado.questoes[a.id]}
            </span>
          </div>
        );
      })}
      <p class="fonte">
        {simulado.nome}, {data(simulado.data)}. Total: {total.acertos} de {total.questoes} questões{resultado.redacao !== undefined && `, redação ${resultado.redacao}`}. Entre parênteses, a diferença para o simulado anterior.
      </p>
    </div>
  );
}

function diaDaSemanaLonga(agora: Date) {
  const n = nomeDia(agora.getDay());
  return `${n[0].toUpperCase()}${n.slice(1)}, ${data(agora.toISOString())}`;
}

/* ---------- materiais ---------- */

function LinhaMaterial({ banco, m, agora }: { banco: Banco; m: Material; agora: Date }) {
  const n = m.atual.anexos.length;
  return (
    <Linha href={href("aluno", "materiais", m.id)}>
      <span class="linha__principal">
        <span class="linha__titulo">{m.atual.titulo}</span>
        <span class="linha__meta">
          {disciplina(banco, m.disciplinaId)?.nome} · {nomeDe(banco, m.autorId)} · {quando(m.publicadoEm!, agora)}
        </span>
      </span>
      <span class="linha__lateral">
        {m.atual.versao > 1 && <Selo tom="acao">Atualizado</Selo>}
        {m.atual.link && <Icone nome="link" tamanho={18} rotulo="Tem link" />}
        {n > 0 && <span class="suave">{plural(n, "arquivo", "arquivos")}</span>}
      </span>
    </Linha>
  );
}

function Materiais() {
  const { banco, eu, agora } = useLoja();
  const todos = materiaisDoAluno(banco, eu!.id, diaDe(agora));
  const disciplinas = [...new Set(todos.map((m) => m.disciplinaId))];
  const [filtro, setFiltro] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const lista = todos.filter(
    (m) =>
      (filtro === "todas" || m.disciplinaId === filtro) &&
      (!termo || `${m.atual.titulo} ${m.atual.contexto}`.toLowerCase().includes(termo)),
  );

  return (
    <div class="pagina">
      <Cabecalho titulo="Materiais da turma" sub="Tudo o que os professores publicaram para as suas turmas, do mais novo para o mais antigo." />
      <div class="filtros">
        <Abas
          rotulo="Disciplina"
          ativa={filtro}
          aoMudar={setFiltro}
          abas={[{ id: "todas", rotulo: "Todas", contagem: todos.length }, ...disciplinas.map((d) => ({ id: d, rotulo: disciplina(banco, d)!.nome, contagem: todos.filter((m) => m.disciplinaId === d).length }))]}
        />
        <label class="busca">
          <Icone nome="busca" tamanho={18} />
          <span class="visualmente-oculto">Buscar material</span>
          <input type="search" placeholder="Buscar por tema" value={busca} onInput={(e) => setBusca(e.currentTarget.value)} />
        </label>
      </div>
      {lista.length ? (
        <div class="linhas">
          {lista.map((m) => (
            <LinhaMaterial key={m.id} banco={banco} m={m} agora={agora} />
          ))}
        </div>
      ) : todos.length ? (
        <Estado icone="busca" titulo="Nenhum material com esse filtro." acao={<Botao variante="secundario" pequeno onClick={() => { setFiltro("todas"); setBusca(""); }}>Limpar filtros</Botao>} />
      ) : (
        <Estado titulo="Ainda não há materiais para a sua turma.">Quando um professor publicar, o material aparece aqui e na tela de início.</Estado>
      )}
    </div>
  );
}

function DetalheMaterial({ id }: { id: string }) {
  const { banco, eu, agora } = useLoja();
  const [aberto, setAberto] = useState<Anexo | null>(null);
  const acesso = acessoMaterial(banco, eu, id, diaDe(agora));
  const voltar = { href: href("aluno", "materiais"), rotulo: "Materiais" };

  if (!acesso.ok) {
    const m = banco.materiais.find((x) => x.id === id);
    return (
      <div class="pagina">
        <Cabecalho titulo="Material" voltar={voltar} />
        {acesso.motivo === "retirado" && m?.retirada ? (
          <Estado icone="alerta" tom="alerta" titulo={`“${m.atual.titulo}” foi retirado pelo professor.`}>
            <p>Motivo: {m.retirada.motivo}</p>
            <p class="suave">Retirado {quando(m.retirada.em, agora)}.</p>
          </Estado>
        ) : acesso.motivo === "sem-permissao" ? (
          <Estado icone="escudo" tom="alerta" titulo="Este material é de outra turma.">
            Se você acha que deveria ver, fale com o professor ou com a coordenação. Pode ser um vínculo de turma desatualizado.
          </Estado>
        ) : (
          <Estado icone="busca" titulo="Não encontramos este material.">O link pode estar incompleto. Procure pelo nome na lista de materiais.</Estado>
        )}
      </div>
    );
  }

  const m = acesso.material;
  const r = m.atual;
  let dominio = "";
  try {
    dominio = r.link ? new URL(r.link.url).hostname.replace(/^www\./, "") : "";
  } catch {
    dominio = "";
  }

  return (
    <div class="pagina pagina--estreita">
      <Cabecalho
        titulo={r.titulo}
        voltar={voltar}
        sub={
          <>
            <Avatar id={m.autorId} nome={nomeDe(banco, m.autorId)} tamanho={22} /> {disciplina(banco, m.disciplinaId)?.nome} · {nomeDe(banco, m.autorId)} · publicado {quando(m.publicadoEm!, agora)}
          </>
        }
      />
      {r.nota && (
        <p class="nota-versao">
          <Icone nome="editar" tamanho={16} /> Atualizado {quando(r.em, agora)}: {r.nota}
        </p>
      )}
      {r.contexto && <p class="texto">{r.contexto}</p>}

      {r.anexos.length > 0 && (
        <Secao titulo="Arquivos">
          <ul class="anexos" role="list">
            {r.anexos.map((a) => (
              <li key={a.id} class="anexo anexo--pronto">
                <Miniatura anexo={a} />
                <div class="anexo__info">
                  <p class="anexo__nome">{a.nome}</p>
                  <p class="anexo__meta">{a.tipo === "application/pdf" ? "PDF" : a.tipo.split("/")[1]?.toUpperCase()}</p>
                </div>
                <Botao pequeno onClick={() => setAberto(a)}>
                  Abrir
                </Botao>
              </li>
            ))}
          </ul>
        </Secao>
      )}
      {r.link && (
        <Secao titulo="Link">
          <a class="servico" href={r.link.url} target="_blank" rel="noopener noreferrer">
            <span>
              <span class="servico__nome">{r.link.rotulo}</span>
              <span class="servico__desc">{dominio}</span>
            </span>
            <span class="servico__externo">
              Abre fora <Icone nome="externo" tamanho={14} />
            </span>
          </a>
        </Secao>
      )}
      <p class="fonte">Dúvida sobre este material? Leve ao plantão de {disciplina(banco, m.disciplinaId)?.nome} ou pergunte na próxima aula.</p>
      <Leitor anexo={aberto} aoFechar={() => setAberto(null)} />
    </div>
  );
}

/* ---------- tarefas ---------- */

function Tarefas() {
  const { banco, eu, agora } = useLoja();
  const lista = tarefasDoAluno(banco, eu!.id, diaDe(agora)).map((t) => ({ t, e: entregaDe(banco, t.id, eu!.id), s: situacaoTarefa(t, entregaDe(banco, t.id, eu!.id), agora) }));
  const abertas = lista.filter((x) => ["pendente", "atrasada", "devolvida"].includes(x.s));
  const feitas = lista.filter((x) => !["pendente", "atrasada", "devolvida"].includes(x.s)).reverse();

  const bloco = (itens: typeof lista) => (
    <div class="linhas">
      {itens.map(({ t, e, s }) => (
        <Linha key={t.id} href={href("aluno", "tarefas", t.id)}>
          <span class="linha__principal">
            <span class="linha__titulo">{t.titulo}</span>
            <span class="linha__meta">
              {disciplina(banco, t.disciplinaId)?.nome} · {e ? `entregue ${quando(e.enviadaEm, agora)}` : prazo(t.prazo, agora)}
            </span>
          </span>
          <Selo tom={SITUACAO[s].tom}>{SITUACAO[s].rotulo}</Selo>
        </Linha>
      ))}
    </div>
  );

  return (
    <div class="pagina">
      <Cabecalho titulo="Tarefas" sub="Resolva no caderno ou no livro e envie as fotos pelo celular. Você recebe um comprovante na hora." />
      <Secao titulo={`Para entregar (${abertas.length})`}>
        {abertas.length ? bloco(abertas) : <Estado icone="ok" titulo="Tudo entregue." />}
      </Secao>
      <Secao titulo="Entregues">{feitas.length ? bloco(feitas) : <p class="suave">Nenhuma entrega ainda.</p>}</Secao>
    </div>
  );
}

function DetalheTarefa({ id }: { id: string }) {
  const { banco, eu, agora } = useLoja();
  const t = banco.tarefas.find((x) => x.id === id);
  const voltar = { href: href("aluno", "tarefas"), rotulo: "Tarefas" };
  if (!t || !turmasDoAluno(banco, eu!.id, diaDe(agora)).some((x) => t.turmaIds.includes(x))) {
    return (
      <div class="pagina">
        <Cabecalho titulo="Tarefa" voltar={voltar} />
        <Estado icone="busca" titulo="Tarefa não encontrada para a sua turma." />
      </div>
    );
  }
  const e = entregaDe(banco, t.id, eu!.id);
  const s = situacaoTarefa(t, e, agora);
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho
        titulo={t.titulo}
        voltar={voltar}
        sub={
          <>
            {disciplina(banco, t.disciplinaId)?.nome} · {nomeDe(banco, t.professorId)} · {prazo(t.prazo, agora)}
          </>
        }
        acoes={<Selo tom={SITUACAO[s].tom}>{SITUACAO[s].rotulo}</Selo>}
      />
      {t.instrucoes && <p class="texto">{t.instrucoes}</p>}
      <p class="fonte">
        Prazo: {dataHora(t.prazo)}. {t.permiteReenvio ? "Você pode trocar a entrega até o prazo." : "Esta tarefa aceita um envio só; confira as fotos antes."}
        {t.tipo === "redacao" && " A correção segue as cinco competências do Enem, e a nota aparece aqui."}
      </p>

      {e && <Comprovante tarefa={t} entrega={e} />}
      {podeReenviar(t, e, agora) && <FormEntrega key={e?.id ?? "nova"} tarefa={t} reenvio={!!e} />}
    </div>
  );
}

function Comprovante({ tarefa, entrega }: { tarefa: Tarefa; entrega: NonNullable<ReturnType<typeof entregaDe>> }) {
  const { banco } = useLoja();
  const [aberto, setAberto] = useState<Anexo | null>(null);
  return (
    <section class="comprovante" aria-label="Comprovante de entrega">
      <div class="comprovante__topo">
        <Icone nome="ok" />
        <div>
          <p class="comprovante__titulo">{entrega.tentativa > 1 ? `Entrega ${entrega.tentativa} recebida` : "Entrega recebida"}</p>
          <p class="comprovante__meta">
            {dataHora(entrega.enviadaEm)} · protocolo <strong>{entrega.protocolo}</strong>
            {entrega.enviadaEm > tarefa.prazo && " · depois do prazo"}
          </p>
        </div>
      </div>
      <ul class="miniaturas" role="list">
        {entrega.anexos.map((a) => (
          <li key={a.id}>
            <button type="button" class="miniaturas__item" onClick={() => setAberto(a)} aria-label={`Abrir ${a.nome}`}>
              <Miniatura anexo={a} />
              <span>{a.nome}</span>
            </button>
          </li>
        ))}
      </ul>
      {entrega.retorno && (
        <div class={`retorno retorno--${entrega.status}`}>
          <p class="retorno__titulo">
            {entrega.status === "devolvida" ? "O professor pediu para refazer" : entrega.retorno.competencias ? "Redação corrigida" : "Conferida pelo professor"} · {nomeDe(banco, entrega.retorno.por)}
          </p>
          {entrega.retorno.texto && <p>{entrega.retorno.texto}</p>}
          {entrega.retorno.competencias && <NotaRedacao competencias={entrega.retorno.competencias} />}
        </div>
      )}
      <Leitor anexo={aberto} aoFechar={() => setAberto(null)} />
    </section>
  );
}

function FormEntrega({ tarefa, reenvio }: { tarefa: Tarefa; reenvio: boolean }) {
  const envio = useEnvio([], TIPOS_ENTREGA);
  const [chave, setChave] = useState(() => acao.novoId("ent"));
  const [enviando, setEnviando] = useState(false);
  const pode = envio.prontos.length > 0 && !envio.pendente && !envio.comFalha;

  async function enviar() {
    setEnviando(true);
    await new Promise((r) => setTimeout(r, 450));
    const r = loja.executar((b, ator, agora) => acao.enviarEntrega(b, ator, tarefa.id, envio.prontos, agora, chave));
    setEnviando(false);
    if (resultado(r, "Entrega recebida. O comprovante está acima.")) {
      envio.limpar();
      setChave(acao.novoId("ent"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Secao titulo={reenvio ? "Enviar de novo" : "Sua entrega"}>
      <SeletorArquivos envio={envio} aceitar="image/*,application/pdf" camera rotulo="Escolher da galeria" dica="Fotos (JPG, PNG, HEIC) ou PDF, até 25 MB cada. Uma foto por página, com boa luz." />
      <ListaAnexos envio={envio} />
      <div class="acoes-form">
        <Botao icone="enviar" disabled={!pode} carregando={enviando} onClick={enviar}>
          {enviando ? "Enviando…" : `Enviar ${envio.prontos.length ? plural(envio.prontos.length, "arquivo", "arquivos") : "entrega"}`}
        </Botao>
        {!pode && envio.anexos.length > 0 && <span class="suave">{envio.pendente ? "Esperando os arquivos terminarem." : envio.comFalha ? "Remova ou reenvie o arquivo que falhou." : ""}</span>}
      </div>
    </Secao>
  );
}

/* ---------- plantões ---------- */

function Plantoes() {
  const { banco, agora } = useLoja();
  const dia = diaDe(agora);
  const hoje = plantoesDoDia(banco, dia);
  const proximos = [1, 2, 3, 4, 5, 6]
    .map((n) => diaDe(somarDias(agora, n)))
    .map((d) => ({ d, lista: plantoesDoDia(banco, d) }))
    .filter((x) => x.lista.length)
    .slice(0, 3);

  return (
    <div class="pagina">
      <Cabecalho titulo={`Plantões de hoje (${hoje.length})`} sub="Os professores tiram dúvidas à tarde, na escola. Entre na fila sozinho ou com colegas e acompanhe sua vez daqui." />
      {hoje.length ? (
        <div class="plantoes">
          {hoje.map((p) => (
            <CartaoPlantao key={p.id} plantaoId={p.id} />
          ))}
        </div>
      ) : (
        <Estado icone="plantao" titulo="Hoje não tem plantão." />
      )}
      {proximos.length > 0 && (
        <Secao titulo="Próximos dias">
          <div class="linhas">
            {proximos.map(({ d, lista }) => (
              <div class="linha" key={d}>
                <span class="linha__principal">
                  <span class="linha__titulo">
                    {nomeDia(new Date(`${d}T12:00:00`).getDay())}, {data(d)}
                  </span>
                  <span class="linha__meta">{lista.map((p) => `${disciplina(banco, p.disciplinaId)?.nome} (${p.inicio}–${p.fim})`).join(" · ")}</span>
                </span>
              </div>
            ))}
          </div>
        </Secao>
      )}
    </div>
  );
}

function CartaoPlantao({ plantaoId }: { plantaoId: string }) {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const p = banco.plantoes.find((x) => x.id === plantaoId)!;
  const fila = filaAtiva(banco, p.id, dia);
  const minha = entradaDoAluno(banco, p.id, dia, eu!.id);
  const pos = posicaoNaFila(banco, p.id, dia, eu!.id);
  const [aberto, setAberto] = useState(false);
  const [duvida, setDuvida] = useState("");
  const [grupo, setGrupo] = useState(false);
  const [colegas, setColegas] = useState<string[]>([]);
  const encerrado = agora.toTimeString().slice(0, 5) >= p.fim;

  const turmasMinhas = turmasDoAluno(banco, eu!.id, dia);
  const opcoesColegas = [...new Set(turmasMinhas.flatMap((t) => alunosDaTurma(banco, t, dia)))].filter((x) => x !== eu!.id);

  const entrar = () => {
    const r = loja.executar((b, ator, ag) => acao.entrarNaFila(b, ator, p.id, grupo ? colegas : [], duvida, ag));
    if (resultado(r, grupo && colegas.length ? "Vocês entraram na fila juntos." : "Você entrou na fila.")) {
      setAberto(false);
      setDuvida("");
      setColegas([]);
      setGrupo(false);
    }
  };

  return (
    <article class={`plantao${minha ? " plantao--meu" : ""}`}>
      <div class="plantao__topo">
        <Avatar id={p.professorId} nome={nomeDe(banco, p.professorId)} tamanho={48} />
        <div class="plantao__quem">
          <h2 class="plantao__disciplina">{disciplina(banco, p.disciplinaId)?.nome}</h2>
          <p class="plantao__prof">{nomeDe(banco, p.professorId)}</p>
        </div>
        <span class="plantao__fila">
          <strong>{fila.filter((f) => f.status === "aguardando").length}</strong> na fila
        </span>
      </div>
      <dl class="plantao__dados">
        <div>
          <dt>Horário</dt>
          <dd>
            {p.inicio}–{p.fim}
            {encerrado && " (encerrado)"}
          </dd>
        </div>
        <div>
          <dt>Local</dt>
          <dd>{p.local}</dd>
        </div>
        <div>
          <dt>Para</dt>
          <dd>{p.series}</dd>
        </div>
      </dl>

      {minha ? (
        <div class="plantao__minha">
          <p class="plantao__pos" aria-live="polite">
            {pos === 0 ? "É a sua vez. Vá até o professor." : `Você é o ${pos}º da fila${minha.alunoIds.length > 1 ? `, com ${minha.alunoIds.filter((x) => x !== eu!.id).map((x) => primeiroNome(nomeDe(banco, x))).join(" e ")}` : ""}.`}
          </p>
          {minha.duvida && <p class="suave">Sua dúvida: {minha.duvida}</p>}
          <Botao variante="secundario" pequeno onClick={() => resultado(loja.executar((b, ator, ag) => acao.sairDaFila(b, ator, minha.id, ag)), "Você saiu da fila.")}>
            Sair da fila
          </Botao>
        </div>
      ) : aberto ? (
        <div class="plantao__form">
          <Campo rotulo="Descreva sua dúvida (opcional)" id={`duvida-${p.id}`} dica="Ajuda o professor a se preparar. Não é um chat.">
            <textarea id={`duvida-${p.id}`} rows={2} value={duvida} onInput={(e) => setDuvida(e.currentTarget.value)} />
          </Campo>
          <label class="pessoa__chave">
            <input type="checkbox" checked={grupo} onChange={(e) => setGrupo(e.currentTarget.checked)} /> Entrar em grupo com colegas
          </label>
          {grupo && (
            <div class="colegas">
              {opcoesColegas.map((c) => (
                <label key={c} class={`escolha${colegas.includes(c) ? " escolha--marcada" : ""}`}>
                  <input type="checkbox" checked={colegas.includes(c)} onChange={() => setColegas(colegas.includes(c) ? colegas.filter((x) => x !== c) : [...colegas, c])} />
                  <span>{nomeDe(banco, c)}</span>
                </label>
              ))}
            </div>
          )}
          <div class="acoes-form">
            <Botao onClick={entrar} disabled={grupo && !colegas.length}>
              {grupo && colegas.length ? `Entrar com ${plural(colegas.length, "colega", "colegas")}` : "Entrar na fila"}
            </Botao>
            <Botao variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <Botao variante={encerrado ? "secundario" : "primario"} disabled={encerrado} onClick={() => setAberto(true)}>
          {encerrado ? "Plantão encerrado" : "Entrar na fila"}
        </Botao>
      )}
    </article>
  );
}

/* ---------- notas e avisos ---------- */

function Notas() {
  const { banco, eu, agora } = useLoja();
  const medio = turmasDoAluno(banco, eu!.id, diaDe(agora)).some((t) => turma(banco, t)?.etapa === "medio");
  return (
    <div class="pagina">
      <Cabecalho titulo="Notas e simulados" sub={medio ? "Boletim do ano, por bimestre, e os simulados por área do Enem." : "No Extensivo, o acompanhamento é pelos simulados, área por área."} />
      {medio && (
        <Secao titulo="Boletim">
          <TabelaNotas banco={banco} alunoId={eu!.id} />
        </Secao>
      )}
      <Secao titulo="Simulados">
        <TabelaSimulados banco={banco} alunoId={eu!.id} />
      </Secao>
    </div>
  );
}

function Avisos() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const avisos = avisosDoAluno(banco, eu!.id, dia);
  const eventos = eventosDoAluno(banco, eu!.id, dia);
  return (
    <div class="pagina">
      <Cabecalho titulo="Avisos e agenda" />
      <div class="grade-2 grade-2--larga">
        <Secao titulo="Avisos">
          {avisos.length ? (
            <div class="pilha">
              {avisos.map((a) => (
                <ItemAviso key={a.id} banco={banco} aviso={a} agora={agora} />
              ))}
            </div>
          ) : (
            <Estado icone="aviso" titulo="Nenhum aviso para você." />
          )}
        </Secao>
        <Secao titulo="Próximos eventos">
          <Agenda eventos={eventos} />
        </Secao>
      </div>
    </div>
  );
}

export function Agenda({ eventos }: { eventos: Banco["agenda"] }) {
  if (!eventos.length) return <p class="suave">Nada marcado.</p>;
  return (
    <ul class="agenda-lista" role="list">
      {eventos.map((e) => (
        <li key={e.id} class="evento">
          <span class="evento__data">
            <strong>{new Date(`${e.data}T12:00:00`).getDate()}</strong>
            {data(e.data).split(" ")[1]}
          </span>
          <span>
            <span class="evento__titulo">{e.titulo}</span>
            <span class="evento__meta">
              {nomeDia(new Date(`${e.data}T12:00:00`).getDay())}
              {e.hora && `, ${e.hora}`} · {e.local}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export { ir };
