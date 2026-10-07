/*
  Portal do responsável. O acesso vem do vínculo cadastrado pela secretaria, aluno a aluno. Quem usa pode ser
  a mãe, o pai, a avó ou o próprio aluno maior de idade que responde pela matrícula: o portal fala com
  qualquer um deles. Avisos com ciência, notas e simulados, tarefas, agenda e atendimento com protocolo e prazo.
*/
import { useState } from "preact/hooks";
import * as acao from "../dominio/acoes";
import {
  PRAZO_SETOR,
  avisosDoResponsavel,
  deuCiencia,
  diaDe,
  disciplina,
  entregaDe,
  eventosDoAluno,
  filhosDe,
  nomeDe,
  notasDoAluno,
  MEDIA_APROVACAO,
  simuladosDoAluno,
  totalSimulado,
  situacaoTarefa,
  solicitacaoAtrasada,
  tarefasDoAluno,
  turma,
  turmasDoAluno,
} from "../dominio/regras";
import type { Banco, SetorAtendimento, Solicitacao } from "../dominio/tipos";
import type { ItemNav } from "../App";
import { href, ir, loja, useLoja } from "../estado/loja";
import { Abas, Avatar, Botao, Cabecalho, Campo, Escolhas, Estado, Icone, LinkBotao, Numero, Secao, Selo, resultado } from "../ui/base";
import { ItemAviso, Linha, SITUACAO, Servicos, TabelaNotas, TabelaSimulados } from "../ui/comum";
import { dataHora, plural, prazo, primeiroNome, quando, nota } from "../ui/formato";
import { Agenda } from "./Aluno";

export function navPais(b: Banco, id: string, agora: Date): ItemNav[] {
  const pendentes = avisosDoResponsavel(b, id, diaDe(agora)).filter((x) => x.aviso.exigeCiencia && !deuCiencia(x.aviso, id)).length;
  const respondidas = b.solicitacoes.filter((s) => s.autorId === id && s.status === "respondida").length;
  return [
    { id: "inicio", rotulo: "Resumo", icone: "inicio" },
    { id: "avisos", rotulo: "Avisos", icone: "aviso", contagem: pendentes },
    { id: "notas", rotulo: "Notas e simulados", icone: "nota" },
    { id: "tarefas", rotulo: "Tarefas", icone: "tarefa" },
    { id: "agenda", rotulo: "Agenda", icone: "calendario" },
    { id: "atendimento", rotulo: "Fale com a escola", icone: "conversa", contagem: respondidas },
  ];
}

export function PortalPais({ secao, id }: { secao: string; id?: string }) {
  if (secao === "avisos") return <Avisos />;
  if (secao === "notas") return <Notas />;
  if (secao === "tarefas") return <Tarefas />;
  if (secao === "agenda") return <AgendaFamilia />;
  if (secao === "atendimento") return id === "nova" ? <NovaSolicitacao /> : id ? <Conversa id={id} /> : <Atendimento />;
  return <Resumo />;
}

/* aluno escolhido, guardado por aba */
let filhoEscolhido: string | null = null;
function useFilho(b: Banco, respId: string) {
  const filhos = filhosDe(b, respId);
  const [, set] = useState(0);
  const atual = filhoEscolhido && filhos.includes(filhoEscolhido) ? filhoEscolhido : filhos[0];
  return {
    filhos,
    filho: atual,
    escolher: (f: string) => {
      filhoEscolhido = f;
      set((n) => n + 1);
    },
  };
}

function SeletorFilho({ banco, filhos, filho, escolher, agora }: { banco: Banco; filhos: string[]; filho: string; escolher: (f: string) => void; agora: Date }) {
  if (filhos.length < 2) return null;
  return (
    <div class="filhos" role="tablist" aria-label="Aluno">
      {filhos.map((f) => (
        <button key={f} type="button" role="tab" aria-selected={f === filho} class="filhos__item" onClick={() => escolher(f)}>
          <Avatar id={f} nome={nomeDe(banco, f)} tamanho={28} />
          <span>
            <span class="pessoa__nome">{primeiroNome(nomeDe(banco, f))}</span>
            <span class="pessoa__cargo">{turmasDoAluno(banco, f, diaDe(agora)).map((t) => turma(banco, t)?.nome).join(", ")}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------- resumo ---------- */

function Resumo() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const filhos = filhosDe(banco, eu!.id);
  const pendentesCiencia = avisosDoResponsavel(banco, eu!.id, dia).filter((x) => x.aviso.exigeCiencia && !deuCiencia(x.aviso, eu!.id));
  const abertas = banco.solicitacoes.filter((s) => s.autorId === eu!.id && s.status !== "encerrada");
  const soEu = filhos.length === 1 && filhos[0] === eu!.id;

  if (!filhos.length) {
    return (
      <div class="pagina">
        <Cabecalho titulo={`Olá, ${primeiroNome(eu!.nome)}`} />
        <Estado icone="pessoas" titulo="Nenhum aluno vinculado à sua conta.">
          O vínculo é feito pela secretaria a partir da matrícula. Se faltar algum aluno, fale com a secretaria.
        </Estado>
      </div>
    );
  }

  return (
    <div class="pagina">
      <Cabecalho
        titulo={`Olá, ${primeiroNome(eu!.nome)}`}
        sub={soEu ? "Você responde pela sua própria matrícula. Aqui ficam os avisos da secretaria, o contrato e o atendimento." : filhos.length > 1 ? "O que pede sua atenção agora, por aluno." : "O que pede sua atenção agora."}
      />

      {pendentesCiencia.length > 0 && (
        <Secao titulo={`Precisa da sua ciência (${pendentesCiencia.length})`}>
          <div class="pilha">
            {pendentesCiencia.map(({ aviso, alunoIds }) => (
              <ItemAviso
                key={aviso.id}
                banco={banco}
                aviso={aviso}
                agora={agora}
                extra={soEu ? undefined : ` · sobre ${alunoIds.map((a) => primeiroNome(nomeDe(banco, a))).join(" e ")}`}
                ciencia={{ dada: false, aoDar: () => resultado(loja.executar((b, a, ag) => acao.darCiencia(b, a, aviso.id, ag)), "Ciência registrada.") }}
              />
            ))}
          </div>
        </Secao>
      )}

      <div class="filhos-resumo">
        {filhos.map((f) => {
          const tarefas = tarefasDoAluno(banco, f, dia).map((t) => situacaoTarefa(t, entregaDe(banco, t.id, f), agora));
          const notas = notasDoAluno(banco, f);
          const abaixo = notas.filter((n) => n.media < MEDIA_APROVACAO);
          const eventos = eventosDoAluno(banco, f, dia).slice(0, 2);
          const sim = simuladosDoAluno(banco, f).at(-1);
          const totalSim = sim && totalSimulado(sim.simulado, sim.resultado.acertos);
          return (
            <section key={f} class="filho-cartao" aria-label={nomeDe(banco, f)}>
              <div class="filho-cartao__topo">
                <Avatar id={f} nome={nomeDe(banco, f)} tamanho={44} />
                <div>
                  <h2 class="secao__titulo">{nomeDe(banco, f)}</h2>
                  <p class="suave">{turmasDoAluno(banco, f, dia).map((t) => turma(banco, t)?.nome).join(", ")}</p>
                </div>
              </div>
              <div class="numeros numeros--compactos">
                <Numero valor={tarefas.filter((s) => s === "pendente").length} rotulo="tarefas para entregar" />
                <Numero valor={tarefas.filter((s) => s === "atrasada" || s === "devolvida").length} rotulo="atrasadas ou para refazer" tom={tarefas.some((s) => s === "atrasada" || s === "devolvida") ? "alerta" : undefined} />
                {notas.length > 0 && (
                  <Numero valor={abaixo.length} rotulo={abaixo.length === 1 ? "disciplina abaixo da média" : "disciplinas abaixo da média"} tom={abaixo.length ? "alerta" : undefined} detalhe={abaixo.map((n) => `${disciplina(banco, n.disciplinaId)?.nome} (${nota(n.media)})`).join(", ") || undefined} />
                )}
                {sim && totalSim && (
                  <Numero valor={`${totalSim.acertos}/${totalSim.questoes}`} rotulo={`acertos no ${sim.simulado.nome}`} detalhe={sim.resultado.redacao !== undefined ? `Redação: ${sim.resultado.redacao}` : undefined} />
                )}
              </div>
              {eventos.length > 0 && <Agenda eventos={eventos} />}
            </section>
          );
        })}
      </div>

      <div class="grade-2">
        <Secao titulo="Suas solicitações" acao={<a class="link-secao" href={href("pais", "atendimento", "nova")}>Nova solicitação</a>}>
          {abertas.length ? (
            <div class="linhas">
              {abertas.map((s) => (
                <LinhaSolicitacao key={s.id} banco={banco} s={s} agora={agora} />
              ))}
            </div>
          ) : (
            <p class="suave">Nenhuma solicitação em aberto.</p>
          )}
        </Secao>
        <Secao titulo="Outros serviços">
          <Servicos banco={banco} papel="responsavel" />
        </Secao>
      </div>
    </div>
  );
}

/* ---------- avisos ---------- */

function Avisos() {
  const { banco, eu, agora } = useLoja();
  const lista = avisosDoResponsavel(banco, eu!.id, diaDe(agora));
  const [aba, setAba] = useState<"todos" | "ciencia">("todos");
  const filtrada = aba === "ciencia" ? lista.filter((x) => x.aviso.exigeCiencia) : lista;
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho titulo="Avisos" sub="Da escola e dos professores das turmas vinculadas à sua conta. Os que pedem ciência ficam marcados até você confirmar." />
      <Abas rotulo="Filtro" ativa={aba} aoMudar={setAba} abas={[{ id: "todos", rotulo: "Todos", contagem: lista.length }, { id: "ciencia", rotulo: "Pedem ciência", contagem: lista.filter((x) => x.aviso.exigeCiencia && !deuCiencia(x.aviso, eu!.id)).length }]} />
      {filtrada.length ? (
        <div class="pilha">
          {filtrada.map(({ aviso, alunoIds }) => (
            <ItemAviso
              key={aviso.id}
              banco={banco}
              aviso={aviso}
              agora={agora}
              extra={alunoIds.length === 1 && alunoIds[0] === eu!.id ? undefined : ` · ${alunoIds.map((a) => primeiroNome(nomeDe(banco, a))).join(" e ")}`}
              ciencia={aviso.exigeCiencia ? { dada: deuCiencia(aviso, eu!.id), aoDar: () => resultado(loja.executar((b, a, ag) => acao.darCiencia(b, a, aviso.id, ag)), "Ciência registrada.") } : undefined}
            />
          ))}
        </div>
      ) : (
        <Estado icone="aviso" titulo="Nenhum aviso aqui." />
      )}
    </div>
  );
}

/* ---------- notas e tarefas ---------- */

function Notas() {
  const { banco, eu, agora } = useLoja();
  const s = useFilho(banco, eu!.id);
  if (!s.filho) return <Estado icone="pessoas" titulo="Nenhum aluno vinculado." />;
  return (
    <div class="pagina">
      <Cabecalho
        titulo={s.filho === eu!.id ? "Suas notas e simulados" : `Notas e simulados de ${primeiroNome(nomeDe(banco, s.filho))}`}
        sub="O boletim é lançado pela secretaria ao fim de cada bimestre; os simulados, pela coordenação depois da correção."
      />
      <SeletorFilho banco={banco} {...s} filho={s.filho} agora={agora} />
      {notasDoAluno(banco, s.filho).length > 0 && (
        <Secao titulo="Boletim">
          <TabelaNotas banco={banco} alunoId={s.filho} />
        </Secao>
      )}
      <Secao titulo="Simulados">
        <TabelaSimulados banco={banco} alunoId={s.filho} />
      </Secao>
      <p class="fonte">
        Quer conversar sobre alguma nota? <a href={href("pais", "atendimento", "nova")}>Abra uma solicitação para a coordenação</a>.
      </p>
    </div>
  );
}

function Tarefas() {
  const { banco, eu, agora } = useLoja();
  const s = useFilho(banco, eu!.id);
  if (!s.filho) return <Estado icone="pessoas" titulo="Nenhum aluno vinculado." />;
  const lista = tarefasDoAluno(banco, s.filho, diaDe(agora)).map((t) => ({ t, e: entregaDe(banco, t.id, s.filho), s: situacaoTarefa(t, entregaDe(banco, t.id, s.filho), agora) }));
  return (
    <div class="pagina">
      <Cabecalho
        titulo={s.filho === eu!.id ? "Suas tarefas" : `Tarefas de ${primeiroNome(nomeDe(banco, s.filho))}`}
        sub={s.filho === eu!.id ? "A entrega é feita no portal Aluno." : "Você acompanha a situação; a entrega é feita pelo aluno, no portal Aluno."}
      />
      <SeletorFilho banco={banco} {...s} filho={s.filho} agora={agora} />
      {lista.length ? (
        <div class="linhas">
          {lista.map(({ t, e, s: sit }) => (
            <div class="linha" key={t.id}>
              <span class="linha__principal">
                <span class="linha__titulo">{t.titulo}</span>
                <span class="linha__meta">
                  {disciplina(banco, t.disciplinaId)?.nome} · {nomeDe(banco, t.professorId)} · {e ? `entregue ${quando(e.enviadaEm, agora)} (protocolo ${e.protocolo})` : prazo(t.prazo, agora)}
                </span>
                {e?.retorno?.texto && <span class="linha__meta">Professor: “{e.retorno.texto}”</span>}
              </span>
              <Selo tom={SITUACAO[sit].tom}>{SITUACAO[sit].rotulo}</Selo>
            </div>
          ))}
        </div>
      ) : (
        <Estado icone="tarefa" titulo="Nenhuma tarefa no momento." />
      )}
    </div>
  );
}

function AgendaFamilia() {
  const { banco, eu, agora } = useLoja();
  const dia = diaDe(agora);
  const filhos = filhosDe(banco, eu!.id);
  const eventos = [...new Map(filhos.flatMap((f) => eventosDoAluno(banco, f, dia)).map((e) => [e.id, e])).values()].sort((a, b) => a.data.localeCompare(b.data));
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho titulo="Agenda" sub="Reuniões, simulados, eventos e provas das turmas vinculadas à sua conta." />
      <Agenda eventos={eventos} />
    </div>
  );
}

/* ---------- atendimento ---------- */

const STATUS_SOL: Record<Solicitacao["status"], { r: string; t: "acao" | "ok" | "neutro" | "alerta" }> = {
  aberta: { r: "Aguardando a escola", t: "neutro" },
  "em-andamento": { r: "Em andamento", t: "acao" },
  respondida: { r: "Respondida", t: "ok" },
  encerrada: { r: "Encerrada", t: "neutro" },
};

export function LinhaSolicitacao({ banco, s, agora, portal = "pais" }: { banco: Banco; s: Solicitacao; agora: Date; portal?: "pais" | "gestao" }) {
  const atrasada = solicitacaoAtrasada(s, agora);
  return (
    <Linha href={href(portal, "atendimento", s.id)}>
      <span class="linha__principal">
        <span class="linha__titulo">{s.assunto}</span>
        <span class="linha__meta">
          {s.setor} · {primeiroNome(nomeDe(banco, s.alunoId))} · {s.protocolo}
          {portal === "gestao" && ` · ${nomeDe(banco, s.autorId)}`}
        </span>
        {s.status === "aberta" && !atrasada && <span class="linha__meta">Resposta até {dataHora(s.prazoResposta)}</span>}
      </span>
      <span class="linha__lateral">
        {atrasada && <Selo tom="perigo">Prazo vencido</Selo>}
        <Selo tom={STATUS_SOL[s.status].t}>{STATUS_SOL[s.status].r}</Selo>
      </span>
    </Linha>
  );
}

function Atendimento() {
  const { banco, eu, agora } = useLoja();
  const minhas = banco.solicitacoes.filter((s) => s.autorId === eu!.id);
  return (
    <div class="pagina">
      <Cabecalho
        titulo="Fale com a escola"
        sub="Cada pedido ganha protocolo, um setor responsável e um prazo de resposta. Você acompanha tudo aqui."
        acoes={
          <LinkBotao variante="primario" icone="mais" href={href("pais", "atendimento", "nova")}>
            Nova solicitação
          </LinkBotao>
        }
      />
      {minhas.length ? (
        <div class="linhas">
          {minhas.map((s) => (
            <LinhaSolicitacao key={s.id} banco={banco} s={s} agora={agora} />
          ))}
        </div>
      ) : (
        <Estado icone="conversa" titulo="Você ainda não abriu nenhuma solicitação." />
      )}
      <Secao titulo="Prazos de resposta">
        <ul class="prazos" role="list">
          {(Object.keys(PRAZO_SETOR) as SetorAtendimento[]).map((s) => (
            <li key={s}>
              <strong>{s}</strong> {plural(PRAZO_SETOR[s], "dia útil", "dias úteis")}
            </li>
          ))}
        </ul>
        <p class="fonte">Para relatos com sigilo, use o Canal de Ética e Ouvidoria.</p>
      </Secao>
    </div>
  );
}

function NovaSolicitacao() {
  const { banco, eu } = useLoja();
  const filhos = filhosDe(banco, eu!.id);
  const [aluno, setAluno] = useState(filhos[0]);
  const [setor, setSetor] = useState<SetorAtendimento>("Secretaria");
  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const dicas: Record<SetorAtendimento, string> = {
    Secretaria: "Declarações, documentos, uniforme, transporte.",
    Coordenação: "Rotina pedagógica, notas, comportamento, troca de turma.",
    Financeiro: "Mensalidade, boletos, bolsa e descontos.",
    Professor: "Dúvidas sobre a disciplina. A coordenação encaminha ao professor.",
  };
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho titulo="Nova solicitação" voltar={{ href: href("pais", "atendimento"), rotulo: "Fale com a escola" }} />
      <form
        class="form"
        onSubmit={(e) => {
          e.preventDefault();
          const r = loja.executar((b, a, ag) => acao.abrirSolicitacao(b, a, { alunoId: aluno, setor, assunto, texto }, ag));
          if (resultado(r, "Solicitação enviada. Você recebe a resposta aqui.") && r.ok) ir("pais", "atendimento", r.id);
        }}
      >
        <div class="form__bloco">
          {filhos.length > 1 && <Escolhas rotulo="Sobre" opcoes={filhos.map((f) => ({ id: f, rotulo: f === eu!.id ? "Eu" : nomeDe(banco, f) }))} valor={[aluno]} aoMudar={([f]) => setAluno(f)} />}
          <Escolhas rotulo="Para" opcoes={(Object.keys(PRAZO_SETOR) as SetorAtendimento[]).map((s) => ({ id: s, rotulo: s }))} valor={[setor]} aoMudar={([s]) => setSetor(s)} />
          <p class="campo__dica">
            {dicas[setor]} Resposta em até {plural(PRAZO_SETOR[setor], "dia útil", "dias úteis")}.
          </p>
          <Campo rotulo="Assunto" id="s-assunto">
            <input id="s-assunto" value={assunto} onInput={(e) => setAssunto(e.currentTarget.value)} />
          </Campo>
          <Campo rotulo="Mensagem" id="s-texto">
            <textarea id="s-texto" rows={5} value={texto} onInput={(e) => setTexto(e.currentTarget.value)} />
          </Campo>
        </div>
        <div class="acoes-form">
          <Botao type="submit" icone="enviar">
            Enviar
          </Botao>
        </div>
      </form>
    </div>
  );
}

export function Conversa({ id, portal = "pais" }: { id: string; portal?: "pais" | "gestao" }) {
  const { banco, eu, agora } = useLoja();
  const s = banco.solicitacoes.find((x) => x.id === id);
  const [texto, setTexto] = useState("");
  const voltar = { href: href(portal, "atendimento"), rotulo: portal === "pais" ? "Fale com a escola" : "Atendimento" };
  const permitido = s && (s.autorId === eu!.id || portal === "gestao");
  if (!s || !permitido) {
    return (
      <div class="pagina">
        <Cabecalho titulo="Solicitação" voltar={voltar} />
        <Estado icone="busca" titulo="Solicitação não encontrada." />
      </div>
    );
  }
  const enviar = (encerrar: boolean) => {
    if (resultado(loja.executar((b, a, ag) => acao.responderSolicitacao(b, a, s.id, texto, encerrar, ag)), encerrar ? "Solicitação encerrada." : "Mensagem enviada.")) setTexto("");
  };
  return (
    <div class="pagina pagina--estreita">
      <Cabecalho
        titulo={s.assunto}
        voltar={voltar}
        sub={`${s.protocolo} · ${s.setor} · sobre ${nomeDe(banco, s.alunoId)}`}
        acoes={<Selo tom={solicitacaoAtrasada(s, agora) ? "perigo" : STATUS_SOL[s.status].t}>{solicitacaoAtrasada(s, agora) ? "Prazo vencido" : STATUS_SOL[s.status].r}</Selo>}
      />
      {s.status === "aberta" && (
        <p class="nota-versao">
          <Icone nome="relogio" tamanho={16} /> A escola responde até {dataHora(s.prazoResposta)}.
        </p>
      )}
      <ol class="mensagens">
        {s.mensagens.map((m, i) => {
          const minha = m.autorId === eu!.id;
          return (
            <li key={i} class={`mensagem${minha ? " mensagem--minha" : ""}`}>
              <p class="mensagem__autor">
                <Avatar id={m.autorId} nome={nomeDe(banco, m.autorId)} tamanho={22} />
                {nomeDe(banco, m.autorId)} · {quando(m.em, agora)}
              </p>
              <p>{m.texto}</p>
            </li>
          );
        })}
      </ol>
      {s.status !== "encerrada" ? (
        <div class="form">
          <Campo rotulo={portal === "gestao" ? "Resposta" : "Responder"} id="resp">
            <textarea id="resp" rows={3} value={texto} onInput={(e) => setTexto(e.currentTarget.value)} />
          </Campo>
          <div class="acoes-form">
            <Botao icone="enviar" onClick={() => enviar(false)}>
              Enviar
            </Botao>
            <Botao variante="secundario" onClick={() => enviar(true)}>
              {portal === "gestao" ? "Responder e encerrar" : "Encerrar, está resolvido"}
            </Botao>
          </div>
        </div>
      ) : (
        <p class="fonte">Solicitação encerrada.</p>
      )}
    </div>
  );
}
