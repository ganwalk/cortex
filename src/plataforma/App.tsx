/*
  Casca da Plataforma Córtex: um só endereço, cinco portais.
  Quem tem mais de um papel (professor que também é pai, direção que acompanha a captação)
  troca de portal pela barra de cima ou com Alt+1…5, sem sair da conta.
*/
import { useEffect, useRef, useState } from "preact/hooks";
import { PORTAIS, portaisDe } from "./dominio/regras";
import { PERSONAS } from "./dominio/semente";
import type { Portal } from "./dominio/tipos";
import { href, ir, loja, portalPadrao, useLoja, useRota } from "./estado/loja";
import { PortalAluno, navAluno } from "./portais/Aluno";
import { PortalCrm, navCrm } from "./portais/Crm";
import { PortalGestao, navGestao } from "./portais/Gestao";
import { PortalPais, navPais } from "./portais/Pais";
import { PortalProfessor, navProfessor } from "./portais/Professor";
import { Avatar, Botao, Icone, Recados } from "./ui/base";
import { BotaoTema, EscolhaTema } from "./ui/tema";

export interface ItemNav {
  id: string;
  rotulo: string;
  icone: string;
  contagem?: number;
}

const ICONE_PORTAL: Record<Portal, string> = { aluno: "material", professor: "editar", pais: "pessoas", gestao: "painel", crm: "funil" };

export default function App() {
  const { banco, sessao, eu, agora } = useLoja();
  const rota = useRota();
  const portais = portaisDe(eu);

  // portal da rota, se a pessoa tem acesso; senão o primeiro dela
  const portal: Portal | null = rota.portal && portais.includes(rota.portal) ? rota.portal : (portais[0] ?? null);

  useEffect(() => {
    if (eu && portal && rota.portal !== portal) ir(portal);
  }, [eu?.id, portal, rota.portal]);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= portais.length) {
        e.preventDefault();
        ir(portais[n - 1]);
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, [portais.join()]);

  if (!eu) return <Entrada />;

  const navs: Record<Portal, ItemNav[]> = {
    aluno: navAluno(banco, eu.id, agora),
    professor: navProfessor(banco, eu.id, agora),
    pais: navPais(banco, eu.id, agora),
    gestao: navGestao(banco, agora),
    crm: navCrm(banco, eu.id, agora),
  };
  const nav = portal ? navs[portal] : [];
  const secao = nav.some((n) => n.id === rota.secao) ? rota.secao : "inicio";

  return (
    <div class={`app app--${portal}`}>
      <a class="pular" href="#conteudo-app" onClick={(e) => { e.preventDefault(); document.getElementById("conteudo-app")?.focus(); }}>
        Pular para o conteúdo
      </a>
      <header class="barra">
        <a class="barra__marca" href="/" aria-label="Plataforma Córtex, página inicial">
          <img src="/brand/simbolo-branco.svg" alt="" width="28" height="27" />
          <span>
            Plataforma <strong>Córtex</strong>
          </span>
        </a>

        {portais.length > 1 && (
          <nav class="portais" aria-label="Portais">
            {portais.map((p, i) => {
              const info = PORTAIS.find((x) => x.id === p)!;
              return (
                <a key={p} class="portais__item" href={href(p)} aria-current={p === portal ? "page" : undefined} title={`${info.rotulo} (Alt+${i + 1})`}>
                  <Icone nome={ICONE_PORTAL[p]} tamanho={16} />
                  <span>{info.rotulo}</span>
                </a>
              );
            })}
          </nav>
        )}

        <div class="barra__fim">
          <BotaoTema />
          <MenuPessoa />
        </div>
      </header>

      {sessao.semConexao && (
        <div class="faixa faixa--alerta" role="status">
          <Icone nome="wifi" tamanho={18} /> Sem conexão. Você pode ler o que já abriu; nada novo é salvo até a internet voltar.
          <button type="button" class="faixa__acao" onClick={() => loja.ajustarDemo({ semConexao: false })}>
            Reconectar
          </button>
        </div>
      )}
      {sessao.sessaoExpirada && (
        <div class="faixa faixa--perigo" role="alert">
          <Icone nome="escudo" tamanho={18} /> Sua sessão expirou por segurança. O que está na tela continua aqui.
          <button type="button" class="faixa__acao" onClick={() => loja.entrar(eu.id)}>
            Entrar de novo
          </button>
        </div>
      )}

      <div class="app__corpo">
        <nav class="lateral" aria-label="Seções">
          <ul role="list">
            {nav.map((n) => (
              <li key={n.id}>
                <a class="lateral__item" href={href(portal!, n.id)} aria-current={n.id === secao ? "page" : undefined}>
                  <Icone nome={n.icone} />
                  <span class="lateral__rotulo">{n.rotulo}</span>
                  {!!n.contagem && <span class="lateral__n" aria-label={`${n.contagem} pendentes`}>{n.contagem}</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main id="conteudo-app" class="conteudo" tabIndex={-1}>
          {portal === "aluno" && <PortalAluno secao={secao} id={rota.id} />}
          {portal === "professor" && <PortalProfessor secao={secao} id={rota.id} />}
          {portal === "pais" && <PortalPais secao={secao} id={rota.id} />}
          {portal === "gestao" && <PortalGestao secao={secao} id={rota.id} />}
          {portal === "crm" && <PortalCrm secao={secao} id={rota.id} />}
          {!portal && <p>Esta conta não tem nenhum portal ativo. Fale com a secretaria.</p>}
        </main>
      </div>
      <Recados />
    </div>
  );
}

/* ---------- seletor de pessoa e ferramentas da demonstração ---------- */

function MenuPessoa() {
  const { banco, sessao, eu } = useLoja();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  if (!eu) return null;
  const trocar = (id: string) => {
    loja.entrar(id);
    setAberto(false);
    const p = portalPadrao(id);
    if (p) ir(p);
  };

  return (
    <div class="pessoa" ref={ref}>
      <button type="button" class="pessoa__botao" aria-expanded={aberto} aria-haspopup="true" onClick={() => setAberto(!aberto)}>
        <Avatar id={eu.id} nome={eu.nome} tamanho={32} />
        <span class="pessoa__texto">
          <span class="pessoa__nome">{eu.nome}</span>
          <span class="pessoa__cargo">{eu.cargo}</span>
        </span>
      </button>
      {aberto && (
        <div class="pessoa__menu">
          <p class="pessoa__grupo">Ver como (demonstração)</p>
          <ul role="list" class="pessoa__lista">
            {PERSONAS.map((id) => {
              const u = banco.usuarios.find((x) => x.id === id);
              if (!u) return null;
              return (
                <li key={id}>
                  <button type="button" class="pessoa__opcao" aria-current={id === eu.id || undefined} onClick={() => trocar(id)}>
                    <Avatar id={u.id} nome={u.nome} tamanho={28} />
                    <span>
                      <span class="pessoa__nome">{u.nome}</span>
                      <span class="pessoa__cargo">{u.cargo}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p class="pessoa__grupo">Aparência</p>
          <EscolhaTema />
          <p class="pessoa__grupo">Simular estados</p>
          <label class="pessoa__chave">
            <input type="checkbox" checked={sessao.semConexao} onChange={(e) => loja.ajustarDemo({ semConexao: e.currentTarget.checked })} />
            Sem conexão
          </label>
          <label class="pessoa__chave">
            <input type="checkbox" checked={sessao.sessaoExpirada} onChange={(e) => loja.ajustarDemo({ sessaoExpirada: e.currentTarget.checked })} />
            Sessão expirada
          </label>
          <div class="pessoa__rodape">
            <Botao
              variante="fantasma"
              pequeno
              onClick={async () => {
                if (confirm("Voltar todos os dados da demonstração ao início? O que foi criado aqui será apagado.")) {
                  await loja.restaurar();
                  setAberto(false);
                }
              }}
            >
              Restaurar dados
            </Botao>
            <Botao
              variante="fantasma"
              pequeno
              icone="sair"
              onClick={() => {
                loja.sair();
                setAberto(false);
                ir();
              }}
            >
              Sair
            </Botao>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- entrada ---------- */

const GRUPOS: { titulo: string; texto: string; ids: string[] }[] = [
  { titulo: "Alunos", texto: "Materiais da turma, redação pelo celular, simulados, fila do plantão e notas.", ids: ["u-gustavo", "u-isabela", "u-larissa"] },
  { titulo: "Professores", texto: "Publicar uma vez para várias turmas, corrigir redações pelas competências do Enem e chamar a fila.", ids: ["u-carolina", "u-otavio", "u-renata"] },
  { titulo: "Responsáveis", texto: "Avisos com ciência, notas, simulados e atendimento com prazo. A Larissa, maior de idade, responde pela própria matrícula.", ids: ["u-simone", "u-larissa"] },
  { titulo: "Escola", texto: "Turmas e vínculos, atendimento, auditoria e a captação com a Prova de Bolsas.", ids: ["u-adriana", "u-tatiane", "u-mirela", "u-thiago"] },
];

function Entrada() {
  const { banco } = useLoja();
  return (
    <div class="entrada">
      <div class="entrada__wrap">
        <div class="entrada__topo">
          <a class="entrada__marca" href="/" aria-label="Colégio Córtex">
            <img src="/brand/simbolo.svg" alt="" width="34" height="33" />
            <span class="entrada__nome">
              <span>Colégio</span> Córtex
            </span>
          </a>
          <BotaoTema class="icone-btn" />
        </div>
        <h1 class="entrada__titulo">Plataforma Córtex</h1>
        <p class="entrada__lead">
          Aluno, professor, responsável, gestão e captação usam a mesma plataforma. Nesta demonstração, as pessoas e os
          dados são fictícios e ficam só neste navegador.
        </p>

        <div class="entrada__grupos">
          {GRUPOS.map((g) => (
            <section key={g.titulo} class="entrada__grupo">
              <h2>{g.titulo}</h2>
              <p>{g.texto}</p>
              <ul role="list">
                {g.ids.map((id) => {
                  const u = banco.usuarios.find((x) => x.id === id);
                  if (!u) return null;
                  const ps = portaisDe(u).map((p) => PORTAIS.find((x) => x.id === p)!.rotulo);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        class="entrada__pessoa"
                        onClick={() => {
                          loja.entrar(id);
                          const p = portalPadrao(id);
                          if (p) ir(p);
                        }}
                      >
                        <Avatar id={u.id} nome={u.nome} tamanho={40} />
                        <span>
                          <span class="pessoa__nome">{u.nome}</span>
                          <span class="pessoa__cargo">{u.cargo}</span>
                          {ps.length > 1 && <span class="entrada__portais">{ps.join(" · ")}</span>}
                        </span>
                        <Icone nome="seta" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <p class="entrada__nota">
          Dica: abra duas abas, uma como aluno e outra como professor. A fila do plantão e as entregas aparecem nas duas.
        </p>
      </div>
    </div>
  );
}
