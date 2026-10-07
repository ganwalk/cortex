/*
  Gestão escolar: coordenação e secretaria. Indicadores de uso, turmas e vínculos, atendimento com prazo,
  avisos para a escola, moderação de materiais, catálogo de serviços externos e auditoria.
*/
import { useState } from "preact/hooks";
import * as acao from "../dominio/acoes";
import {
  AREAS,
  adesaoAviso,
  mediaTurmaSimulado,
  alunosDaTurma,
  diaDe,
  disciplina,
  entregaDe,
  ETAPAS,
  filaAtiva,
  nomeDe,
  notasDoAluno,
  MEDIA_APROVACAO,
  plantoesDoDia,
  responsaveisDe,
  situacaoTarefa,
  solicitacaoAtrasada,
  temPapel,
  turma,
  turmasDoAluno,
  aulasDoProfessor,
} from "../dominio/regras";
import type { Aviso, Banco, Papel } from "../dominio/tipos";
import type { ItemNav } from "../App";
import { href, ir, loja, useLoja } from "../estado/loja";
import { Abas, Avatar, Botao, Cabecalho, Campo, Escolhas, Estado, Janela, Numero, Secao, Selo, resultado } from "../ui/base";
import { ItemAviso, Linha } from "../ui/comum";
import { data, dataHora, nomeDia, plural, quando, nota } from "../ui/formato";
import { Conversa, LinhaSolicitacao } from "./Pais";

export function navGestao(b: Banco, agora: Date): ItemNav[] {
  const atrasadas = b.solicitacoes.filter((s) => solicitacaoAtrasada(s, agora)).length;
  const abertas = b.solicitacoes.filter((s) => s.status === "aberta").length;
  return [
    { id: "inicio", rotulo: "Painel", icone: "painel" },
    { id: "turmas", rotulo: "Turmas e pessoas", icone: "pessoas" },
    { id: "atendimento", rotulo: "Atendimento", icone: "conversa", contagem: atrasadas || abertas },
    { id: "avisos", rotulo: "Avisos", icone: "aviso" },
    { id: "materiais", rotulo: "Materiais", icone: "material" },
    { id: "plantoes", rotulo: "Plantões", icone: "plantao" },
    { id: "servicos", rotulo: "Serviços externos", icone: "externo" },
    { id: "auditoria", rotulo: "Auditoria", icone: "escudo" },
  ];
}

export function PortalGestao({ secao, id }: { secao: string; id?: string }) {
  if (secao === "turmas") return id ? <DetalheTurma id={id} /> : <Turmas />;
  if (secao === "atendimento") return id ? <Conversa id={id} portal="gestao" /> : <Atendimento />;
  if (secao === "avisos") return <Avisos />;
  if (secao === "materiais") return <Materiais />;
  if (secao === "plantoes") return <Plantoes />;
  if (secao === "servicos") return <Servicos />;
  if (secao === "auditoria") return <Auditoria />;
  return <Painel />;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

/* ---------- painel ---------- */

function Painel() {
  const { banco, agora } = useLoja();
  const dia = diaDe(agora);
  const semana = agora.getTime() - 7 * 864e5;
  const alunos = banco.usuarios.filter((u) => u.ativo && temPapel(u, "aluno"));
  const publicados = banco.materiais.filter((m) => m.status === "publicado");
  const recentes = publicados.filter((m) => new Date(m.publicadoEm!).getTime() > semana);
  const tarefasVencidas = banco.tarefas.filter((t) => t.prazo < agora.toISOString());
  const esperado = tarefasVencidas.reduce((s, t) => s + t.turmaIds.flatMap((x) => alunosDaTurma(banco, x, dia)).length, 0);
  const noPrazo = tarefasVencidas.reduce((s, t) => s + t.turmaIds.flatMap((x) => alunosDaTurma(banco, x, dia)).filter((a) => { const e = entregaDe(banco, t.id, a); return e && e.enviadaEm <= t.prazo; }).length, 0);
  const filaHoje = plantoesDoDia(banco, dia).reduce((s, p) => s + filaAtiva(banco, p.id, dia).length, 0);
  const atendHoje = banco.fila.filter((f) => f.data === dia && f.status === "atendido").length;
  const atrasadas = banco.solicitacoes.filter((s) => solicitacaoAtrasada(s, agora));
  const comCiencia = banco.avisos.filter((a) => a.exigeCiencia);

  // cobertura: turmas × disciplinas com material na semana
  const pares = banco.vinculosProfessor.filter((v) => !v.ate);
  const cobertos = pares.filter((v) => recentes.some((m) => m.disciplinaId === v.disciplinaId && m.turmaIds.includes(v.turmaId))).length;

  // último simulado: média de acertos por área, turma a turma
  const ultimoSim = [...banco.simulados].sort((a, b) => b.data.localeCompare(a.data))[0];
  const porTurma = ultimoSim ? ultimoSim.turmaIds.map((t) => ({ t, m: mediaTurmaSimulado(banco, ultimoSim.id, t, dia) })).filter((x) => x.m) : [];

  // alunos com duas ou mais disciplinas abaixo da média no último bimestre
  const atencao = alunos
    .map((a) => ({ a, baixas: notasDoAluno(banco, a.id).filter((n) => n.media < MEDIA_APROVACAO) }))
    .filter((x) => x.baixas.length >= 2)
    .slice(0, 6);

  return (
    <div class="pagina">
      <Cabecalho titulo="Painel da escola" sub={`${alunos.length} alunos · ${banco.turmas.length} turmas · dados de demonstração`} />
      <div class="numeros">
        <Numero valor={recentes.length} rotulo="materiais publicados na semana" detalhe={`${pct(cobertos, pares.length)} das turmas × disciplinas com material novo`} />
        <Numero valor={pct(noPrazo, esperado)} rotulo="tarefas entregues no prazo" detalhe={`${noPrazo} de ${esperado} entregas esperadas`} />
        <Numero valor={filaHoje + atendHoje} rotulo="alunos no plantão hoje" detalhe={`${atendHoje} atendidos, ${filaHoje} na fila`} />
        <Numero valor={atrasadas.length} rotulo="solicitações com prazo vencido" tom={atrasadas.length ? "perigo" : "ok"} detalhe={`${banco.solicitacoes.filter((s) => s.status === "aberta").length} aguardando resposta`} />
      </div>
      <div class="grade-2">
        <Secao titulo="Atendimento atrasado" acao={<a class="link-secao" href={href("gestao", "atendimento")}>Ver fila</a>}>
          {atrasadas.length ? (
            <div class="linhas">
              {atrasadas.map((s) => (
                <LinhaSolicitacao key={s.id} banco={banco} s={s} agora={agora} portal="gestao" />
              ))}
            </div>
          ) : (
            <Estado icone="ok" titulo="Nenhuma solicitação fora do prazo." />
          )}
        </Secao>
        <Secao titulo="Ciência dos avisos">
          <div class="linhas">
            {comCiencia.map((a) => {
              const ad = adesaoAviso(banco, a, dia);
              return (
                <div class="linha" key={a.id}>
                  <span class="linha__principal">
                    <span class="linha__titulo">{a.titulo}</span>
                    <span class="linha__meta">
                      {ad.confirmados} de {ad.alvo} responsáveis · {quando(a.publicadoEm, agora)}
                    </span>
                  </span>
                  <span class="progresso" aria-hidden="true">
                    <span style={{ width: pct(ad.confirmados, ad.alvo) }} />
                  </span>
                </div>
              );
            })}
          </div>
        </Secao>
        {ultimoSim && (
          <Secao titulo={`${ultimoSim.nome}: acertos por área`}>
            <div class="tabela-rolagem">
              <table class="tabela tabela--notas">
                <caption class="visualmente-oculto">Média de acertos de cada turma, por área</caption>
                <thead>
                  <tr>
                    <th scope="col">Turma</th>
                    {AREAS.map((a) => (
                      <th scope="col" key={a.id}>
                        {a.rotulo.replace("Ciências ", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porTurma.map(({ t, m }) => (
                    <tr key={t}>
                      <th scope="row">
                        {turma(banco, t)?.nome}
                        <span class="tabela__sub">{plural(m!.participantes, "aluno", "alunos")}</span>
                      </th>
                      {AREAS.map((a) => (
                        <td key={a.id}>{Math.round(m!.porArea[a.id] * 100)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p class="fonte">Média de acertos dos alunos que fizeram o simulado em {data(ultimoSim.data)}.</p>
          </Secao>
        )}
        <Secao titulo="Alunos para acompanhar">
          <p class="campo__dica">Duas ou mais disciplinas abaixo da média no ano.</p>
          {atencao.length ? (
            <div class="linhas">
              {atencao.map(({ a, baixas }) => (
                <div class="linha" key={a.id}>
                  <Avatar id={a.id} nome={a.nome} tamanho={30} />
                  <span class="linha__principal">
                    <span class="linha__titulo">{a.nome}</span>
                    <span class="linha__meta">
                      {a.cargo} · {baixas.map((b) => `${disciplina(banco, b.disciplinaId)?.nome} ${nota(b.media)}`).join(", ")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Estado icone="ok" titulo="Ninguém nessa situação." />
          )}
        </Secao>
        <Secao titulo="Últimas ações" acao={<a class="link-secao" href={href("gestao", "auditoria")}>Auditoria</a>}>
          <ListaAuditoria banco={banco} agora={agora} limite={6} />
        </Secao>
      </div>
    </div>
  );
}

/* ---------- turmas ---------- */

function Turmas() {
  const { banco, agora } = useLoja();
  const dia = diaDe(agora);
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const pessoas = termo ? banco.usuarios.filter((u) => u.nome.toLowerCase().includes(termo)).slice(0, 12) : [];
  return (
    <div class="pagina">
      <Cabecalho titulo="Turmas e pessoas" sub="Os vínculos decidem o que cada pessoa vê. Quando um aluno muda de turma ou sai da escola, ajuste aqui e o acesso muda na hora." />
      <label class="busca busca--larga">
        <span class="visualmente-oculto">Buscar pessoa</span>
        <input type="search" placeholder="Buscar aluno, responsável ou professor" value={busca} onInput={(e) => setBusca(e.currentTarget.value)} />
      </label>
      {termo && (
        <Secao titulo="Pessoas">
          {pessoas.length ? (
            <div class="linhas">
              {pessoas.map((u) => {
                const t = turmasDoAluno(banco, u.id, dia)[0];
                return (
                  <Linha key={u.id} href={t ? href("gestao", "turmas", t) : undefined}>
                    <Avatar id={u.id} nome={u.nome} tamanho={30} />
                    <span class="linha__principal">
                      <span class="linha__titulo">{u.nome}</span>
                      <span class="linha__meta">
                        {u.papeis.join(", ")} · {u.cargo}
                      </span>
                    </span>
                  </Linha>
                );
              })}
            </div>
          ) : (
            <Estado icone="busca" titulo="Ninguém com esse nome." />
          )}
        </Secao>
      )}
      {ETAPAS.map((e) => {
        const ts = banco.turmas.filter((t) => t.etapa === e.id);
        if (!ts.length) return null;
        return (
          <Secao key={e.id} titulo={e.rotulo}>
            <div class="linhas">
              {ts.map((t) => {
                const profs = new Set(banco.vinculosProfessor.filter((v) => v.turmaId === t.id && !v.ate).map((v) => v.professorId));
                return (
                  <Linha key={t.id} href={href("gestao", "turmas", t.id)}>
                    <span class="linha__principal">
                      <span class="linha__titulo">{t.nome}</span>
                      <span class="linha__meta">
                        {t.unidade} · {plural(alunosDaTurma(banco, t.id, dia).length, "aluno", "alunos")} · {plural(profs.size, "professor", "professores")}
                      </span>
                    </span>
                  </Linha>
                );
              })}
            </div>
          </Secao>
        );
      })}
    </div>
  );
}

function DetalheTurma({ id }: { id: string }) {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const t = turma(banco, id);
  const [mover, setMover] = useState<string | null>(null);
  const [destino, setDestino] = useState<string>("");
  if (!t) return <Estado icone="busca" titulo="Turma não encontrada." />;
  const alunos = alunosDaTurma(banco, id, dia).sort((a, b) => nomeDe(banco, a).localeCompare(nomeDe(banco, b)));
  const profs = banco.vinculosProfessor.filter((v) => v.turmaId === id && !v.ate);
  const tarefas = banco.tarefas.filter((x) => x.turmaIds.includes(id));
  return (
    <div class="pagina">
      <Cabecalho titulo={t.nome} voltar={{ href: href("gestao", "turmas"), rotulo: "Turmas" }} sub={`${t.unidade} · ano letivo ${t.anoLetivo}`} />
      <div class="grade-2 grade-2--larga">
        <Secao titulo={`Alunos (${alunos.length})`}>
          <div class="tabela-rolagem">
            <table class="tabela">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Responsáveis</th>
                  <th scope="col">Tarefas no prazo</th>
                  <th scope="col">
                    <span class="visualmente-oculto">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((a) => {
                  const vencidas = tarefas.filter((x) => x.prazo < agora.toISOString());
                  const ok = vencidas.filter((x) => { const s = situacaoTarefa(x, entregaDe(banco, x.id, a), agora); return s === "enviada" || s === "conferida"; }).length;
                  return (
                    <tr key={a}>
                      <th scope="row">
                        <span class="celula-pessoa">
                          <Avatar id={a} nome={nomeDe(banco, a)} tamanho={28} />
                          {nomeDe(banco, a)}
                        </span>
                      </th>
                      <td>{responsaveisDe(banco, a).map((r) => `${nomeDe(banco, r.responsavelId)} (${r.parentesco.toLowerCase()})`).join(", ") || <Selo tom="alerta">Sem responsável</Selo>}</td>
                      <td>{vencidas.length ? `${ok}/${vencidas.length}` : "–"}</td>
                      <td>
                        <Botao variante="fantasma" pequeno onClick={() => { setMover(a); setDestino(""); }}>
                          Mudar turma
                        </Botao>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Secao>
        <Secao titulo="Professores">
          <div class="linhas">
            {profs.map((v) => (
              <div class="linha" key={`${v.professorId}${v.disciplinaId}`}>
                <Avatar id={v.professorId} nome={nomeDe(banco, v.professorId)} tamanho={30} />
                <span class="linha__principal">
                  <span class="linha__titulo">{nomeDe(banco, v.professorId)}</span>
                  <span class="linha__meta">{disciplina(banco, v.disciplinaId)?.nome}</span>
                </span>
              </div>
            ))}
          </div>
        </Secao>
      </div>
      <Janela aberta={!!mover} aoFechar={() => setMover(null)} titulo={`Mudar ${mover ? nomeDe(banco, mover) : ""} de turma`}>
        <p class="texto">O vínculo atual termina hoje. Materiais e tarefas da turma antiga deixam de aparecer para o aluno; o histórico de entregas fica guardado.</p>
        <Escolhas rotulo="Nova turma" opcoes={[...banco.turmas.filter((x) => x.id !== id).map((x) => ({ id: x.id, rotulo: x.nome })), { id: "saida", rotulo: "Saiu da escola" }]} valor={destino ? [destino] : []} aoMudar={([d]) => setDestino(d)} />
        <div class="janela__rodape">
          <Botao variante="fantasma" onClick={() => setMover(null)}>
            Cancelar
          </Botao>
          <Botao
            disabled={!destino || !temPapel(eu, "coordenacao", "secretaria")}
            onClick={() => {
              if (resultado(loja.executar((b, a, ag) => acao.moverAluno(b, a, mover!, destino === "saida" ? null : destino, ag)), "Vínculo atualizado.")) setMover(null);
            }}
          >
            Confirmar
          </Botao>
        </div>
      </Janela>
    </div>
  );
}

/* ---------- atendimento ---------- */

function Atendimento() {
  const { banco, agora } = useLoja();
  const [aba, setAba] = useState<"abertas" | "respondidas" | "encerradas">("abertas");
  const grupos = {
    abertas: banco.solicitacoes.filter((s) => s.status === "aberta" || s.status === "em-andamento").sort((a, b) => a.prazoResposta.localeCompare(b.prazoResposta)),
    respondidas: banco.solicitacoes.filter((s) => s.status === "respondida"),
    encerradas: banco.solicitacoes.filter((s) => s.status === "encerrada"),
  };
  return (
    <div class="pagina">
      <Cabecalho titulo="Atendimento" sub="Pedidos de responsáveis e de alunos maiores de idade, pelo prazo de resposta. Quem responde primeiro fica como responsável pela solicitação." />
      <Abas rotulo="Situação" ativa={aba} aoMudar={setAba} abas={[{ id: "abertas", rotulo: "Aguardando", contagem: grupos.abertas.length }, { id: "respondidas", rotulo: "Respondidas", contagem: grupos.respondidas.length }, { id: "encerradas", rotulo: "Encerradas", contagem: grupos.encerradas.length }]} />
      {grupos[aba].length ? (
        <div class="linhas">
          {grupos[aba].map((s) => (
            <LinhaSolicitacao key={s.id} banco={banco} s={s} agora={agora} portal="gestao" />
          ))}
        </div>
      ) : (
        <Estado icone="ok" titulo="Nada aqui." />
      )}
    </div>
  );
}

/* ---------- avisos ---------- */

function Avisos() {
  const { banco, agora } = useLoja();
  const dia = diaDe(agora);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [categoria, setCategoria] = useState<Aviso["categoria"]>("Pedagógico");
  const [alcance, setAlcance] = useState<"escola" | "turmas">("escola");
  const [turmas, setTurmas] = useState<string[]>([]);
  const [para, setPara] = useState<("alunos" | "familias")[]>(["alunos", "familias"]);
  const [ciencia, setCiencia] = useState(false);
  return (
    <div class="pagina">
      <Cabecalho titulo="Avisos" sub="Avisos para responsáveis chegam também aos alunos maiores de idade que respondem pela própria matrícula." />
      <div class="grade-2 grade-2--larga">
        <Secao titulo="Novo aviso">
          <form
            class="form"
            onSubmit={(e) => {
              e.preventDefault();
              const r = loja.executar((b, a, ag) =>
                acao.publicarAviso(b, a, { titulo, corpo, categoria, publico: alcance === "escola" ? { tipo: "escola" } : { tipo: "turmas", turmaIds: turmas }, paraAlunos: para.includes("alunos"), paraResponsaveis: para.includes("familias"), exigeCiencia: ciencia }, ag),
              );
              if (resultado(r, "Aviso publicado.")) {
                setTitulo("");
                setCorpo("");
              }
            }}
          >
            <Escolhas rotulo="Para" opcoes={[{ id: "escola", rotulo: "Escola toda" }, { id: "turmas", rotulo: "Turmas específicas" }]} valor={[alcance]} aoMudar={([v]) => setAlcance(v)} />
            {alcance === "turmas" && <Escolhas multipla rotulo="Turmas" opcoes={banco.turmas.map((t) => ({ id: t.id, rotulo: t.nome }))} valor={turmas} aoMudar={setTurmas} />}
            <Escolhas multipla rotulo="Quem recebe" opcoes={[{ id: "alunos", rotulo: "Alunos" }, { id: "familias", rotulo: "Responsáveis" }]} valor={para} aoMudar={setPara} />
            <Escolhas rotulo="Categoria" opcoes={(["Pedagógico", "Evento", "Secretaria", "Saúde", "Financeiro"] as const).map((c) => ({ id: c, rotulo: c }))} valor={[categoria]} aoMudar={([c]) => setCategoria(c)} />
            <Campo rotulo="Assunto" id="g-t">
              <input id="g-t" value={titulo} onInput={(e) => setTitulo(e.currentTarget.value)} />
            </Campo>
            <Campo rotulo="Mensagem" id="g-c">
              <textarea id="g-c" rows={4} value={corpo} onInput={(e) => setCorpo(e.currentTarget.value)} />
            </Campo>
            <label class="pessoa__chave">
              <input type="checkbox" checked={ciencia} onChange={(e) => setCiencia(e.currentTarget.checked)} /> Pedir confirmação de ciência
            </label>
            <div class="acoes-form">
              <Botao type="submit" icone="enviar">
                Publicar
              </Botao>
            </div>
          </form>
        </Secao>
        <Secao titulo="Publicados">
          <div class="pilha">
            {banco.avisos.map((a) => {
              const ad = adesaoAviso(banco, a, dia);
              const alvo = a.publico.tipo === "escola" ? "Escola toda" : a.publico.turmaIds.map((t) => turma(banco, t)?.nome).join(", ");
              return <ItemAviso key={a.id} banco={banco} aviso={a} agora={agora} extra={` · ${alvo}${a.exigeCiencia ? ` · ciência ${ad.confirmados}/${ad.alvo}` : ""}`} />;
            })}
          </div>
        </Secao>
      </div>
    </div>
  );
}

/* ---------- materiais ---------- */

function Materiais() {
  const { banco, agora } = useLoja();
  const [retirar, setRetirar] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [aba, setAba] = useState<"publicado" | "retirado">("publicado");
  const lista = banco.materiais.filter((m) => m.status === aba);
  return (
    <div class="pagina">
      <Cabecalho titulo="Materiais publicados" sub="A coordenação pode retirar um material com justificativa. O professor continua responsável pelo conteúdo." />
      <Abas rotulo="Situação" ativa={aba} aoMudar={setAba} abas={[{ id: "publicado", rotulo: "Publicados", contagem: banco.materiais.filter((m) => m.status === "publicado").length }, { id: "retirado", rotulo: "Retirados", contagem: banco.materiais.filter((m) => m.status === "retirado").length }]} />
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead>
            <tr>
              <th scope="col">Material</th>
              <th scope="col">Professor</th>
              <th scope="col">Turmas</th>
              <th scope="col">{aba === "publicado" ? "Publicado" : "Motivo"}</th>
              <th scope="col">
                <span class="visualmente-oculto">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  {m.atual.titulo}
                  <span class="tabela__sub">
                    {disciplina(banco, m.disciplinaId)?.nome} · v{m.atual.versao}
                  </span>
                </th>
                <td>{nomeDe(banco, m.autorId)}</td>
                <td>{m.turmaIds.map((t) => turma(banco, t)?.nome).join(", ")}</td>
                <td>{aba === "publicado" ? quando(m.publicadoEm!, agora) : m.retirada?.motivo}</td>
                <td>
                  {aba === "publicado" && (
                    <Botao variante="fantasma" pequeno onClick={() => { setRetirar(m.id); setMotivo(""); }}>
                      Retirar
                    </Botao>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Janela aberta={!!retirar} aoFechar={() => setRetirar(null)} titulo="Retirar material">
        <p class="texto">O professor e os alunos veem o motivo. A ação fica registrada na auditoria com o seu nome.</p>
        <Campo rotulo="Justificativa" id="g-motivo">
          <textarea id="g-motivo" rows={3} value={motivo} onInput={(e) => setMotivo(e.currentTarget.value)} />
        </Campo>
        <div class="janela__rodape">
          <Botao variante="fantasma" onClick={() => setRetirar(null)}>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={() => resultado(loja.executar((b, a, ag) => acao.retirarMaterial(b, a, retirar!, motivo, ag)), "Material retirado.") && setRetirar(null)}>
            Retirar
          </Botao>
        </div>
      </Janela>
    </div>
  );
}

/* ---------- plantões ---------- */

function Plantoes() {
  const { banco, agora } = useLoja();
  const dia = diaDe(agora);
  return (
    <div class="pagina">
      <Cabecalho titulo="Plantões" sub="Escala semanal e o movimento de hoje. O atendimento continua presencial, com fila e grupos, como hoje." />
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead>
            <tr>
              <th scope="col">Disciplina</th>
              <th scope="col">Professor</th>
              <th scope="col">Dias</th>
              <th scope="col">Horário e local</th>
              <th scope="col">Hoje</th>
            </tr>
          </thead>
          <tbody>
            {banco.plantoes.map((p) => {
              const hoje = p.diasSemana.includes(agora.getDay());
              const atendidos = banco.fila.filter((f) => f.plantaoId === p.id && f.data === dia && f.status === "atendido").length;
              return (
                <tr key={p.id}>
                  <th scope="row">{disciplina(banco, p.disciplinaId)?.nome}</th>
                  <td>{nomeDe(banco, p.professorId)}</td>
                  <td>{p.diasSemana.map((d) => nomeDia(d).slice(0, 3)).join(", ")}</td>
                  <td>
                    {p.inicio}–{p.fim}
                    <span class="tabela__sub">{p.local}</span>
                  </td>
                  <td>{hoje ? `${filaAtiva(banco, p.id, dia).length} na fila · ${atendidos} atendidos` : <span class="suave">sem plantão</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- serviços ---------- */

const PAPEIS: { id: Papel; rotulo: string }[] = [
  { id: "aluno", rotulo: "Alunos" },
  { id: "professor", rotulo: "Professores" },
  { id: "responsavel", rotulo: "Responsáveis" },
  { id: "coordenacao", rotulo: "Coordenação" },
];

function Servicos() {
  const { banco } = useLoja();
  const [edit, setEdit] = useState<{ id?: string; nome: string; descricao: string; url: string; publico: Papel[] } | null>(null);
  return (
    <div class="pagina">
      <Cabecalho
        titulo="Serviços externos"
        sub="Atalhos para os sistemas que continuam fora da plataforma (livro digital, financeiro). Cada atalho abre o sistema com o login dele; a plataforma não troca dados com esses sistemas."
        acoes={
          <Botao icone="mais" onClick={() => setEdit({ nome: "", descricao: "", url: "", publico: ["aluno"] })}>
            Novo atalho
          </Botao>
        }
      />
      <div class="linhas">
        {banco.servicos.map((s) => (
          <div class="linha" key={s.id}>
            <span class="linha__principal">
              <span class="linha__titulo">{s.nome}</span>
              <span class="linha__meta">
                {s.url} · {s.publico.map((p) => PAPEIS.find((x) => x.id === p)?.rotulo ?? p).join(", ")}
              </span>
            </span>
            <span class="linha__lateral">
              <Selo tom={s.ativo ? "ok" : "neutro"}>{s.ativo ? "Visível" : "Oculto"}</Selo>
              <Botao variante="fantasma" pequeno onClick={() => setEdit({ ...s })}>
                Editar
              </Botao>
              <Botao variante="fantasma" pequeno onClick={() => resultado(loja.executar((b, a, ag) => acao.alternarServico(b, a, s.id, ag)))}>
                {s.ativo ? "Ocultar" : "Mostrar"}
              </Botao>
            </span>
          </div>
        ))}
      </div>
      <Janela aberta={!!edit} aoFechar={() => setEdit(null)} titulo={edit?.id ? "Editar atalho" : "Novo atalho"}>
        {edit && (
          <form
            class="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (resultado(loja.executar((b, a, ag) => acao.salvarServico(b, a, edit, ag)), "Atalho salvo.")) setEdit(null);
            }}
          >
            <Campo rotulo="Nome" id="s-nome">
              <input id="s-nome" value={edit.nome} onInput={(e) => setEdit({ ...edit, nome: e.currentTarget.value })} />
            </Campo>
            <Campo rotulo="Para que serve" id="s-desc">
              <input id="s-desc" value={edit.descricao} onInput={(e) => setEdit({ ...edit, descricao: e.currentTarget.value })} />
            </Campo>
            <Campo rotulo="Endereço" id="s-url">
              <input id="s-url" inputMode="url" value={edit.url} onInput={(e) => setEdit({ ...edit, url: e.currentTarget.value })} />
            </Campo>
            <Escolhas multipla rotulo="Quem vê" opcoes={PAPEIS} valor={edit.publico} aoMudar={(p) => setEdit({ ...edit, publico: p })} />
            <div class="janela__rodape">
              <Botao variante="fantasma" onClick={() => setEdit(null)}>
                Cancelar
              </Botao>
              <Botao type="submit">Salvar</Botao>
            </div>
          </form>
        )}
      </Janela>
    </div>
  );
}

/* ---------- auditoria ---------- */

function ListaAuditoria({ banco, agora, limite }: { banco: Banco; agora: Date; limite?: number }) {
  const lista = banco.auditoria.slice(0, limite ?? 200);
  if (!lista.length) return <p class="suave">Nenhuma ação registrada ainda. Publique um material ou entre numa fila para ver o registro aparecer.</p>;
  return (
    <ol class="auditoria">
      {lista.map((e) => (
        <li key={e.id}>
          <span class="auditoria__quando">{quando(e.em, agora)}</span>
          <span>
            <strong>{nomeDe(banco, e.atorId)}</strong> {e.acao}
            {e.detalhe && <span class="suave"> · {e.detalhe}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Auditoria() {
  const { banco, agora } = useLoja();
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho titulo="Auditoria" sub="Quem fez o quê e quando. O registro guarda o resumo da ação, nunca o conteúdo completo nem senhas." />
      <ListaAuditoria banco={banco} agora={agora} />
      <p class="fonte">Registro desta demonstração desde {dataHora(banco.auditoria.at(-1)?.em ?? agora.toISOString())}.</p>
    </div>
  );
}

export { ir, aulasDoProfessor };
