/*
  Estado da demonstração no navegador. O banco fica no localStorage e é compartilhado entre abas:
  abra o aluno numa aba e o professor em outra, e a fila do plantão anda nas duas.
  Em produção, `executar` vira uma chamada ao servidor, que roda a mesma ação e devolve o resultado.
*/
import { useEffect, useState } from "preact/hooks";
import type { Resultado } from "../dominio/acoes";
import { portaisDe, usuario } from "../dominio/regras";
import { semente, VERSAO_BANCO } from "../dominio/semente";
import type { Banco, Portal } from "../dominio/tipos";
import { limparArquivos } from "./arquivos";

const CHAVE_BANCO = "cortex-plataforma:banco";
const CHAVE_SESSAO = "cortex-plataforma:sessao";

export interface Sessao {
  usuarioId: string | null;
  /** Ferramentas de demonstração para mostrar os estados de falha. */
  semConexao: boolean;
  sessaoExpirada: boolean;
}

interface Estado {
  banco: Banco;
  sessao: Sessao;
}

function lerJson<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* modo privado ou cota cheia: segue só em memória */
  }
}

function carregar(): Estado {
  const salvo = lerJson<Banco>(CHAVE_BANCO);
  const banco = salvo && salvo.versao === VERSAO_BANCO ? salvo : semente();
  // cada aba guarda a própria sessão; uma aba nova começa com a última pessoa usada
  let daAba: Partial<Sessao> | null = null;
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO);
    daAba = bruto ? JSON.parse(bruto) : null;
  } catch {
    daAba = null;
  }
  const sessao: Sessao = { usuarioId: null, semConexao: false, sessaoExpirada: false, ...(daAba ?? lerJson<Partial<Sessao>>(CHAVE_SESSAO)) };
  return { banco, sessao };
}

let estado: Estado | null = null;
const ouvintes = new Set<() => void>();

function atual(): Estado {
  if (!estado) {
    estado = carregar();
    // links da página inicial e do site: /plataforma/?como=u-isabela#/aluno abre direto como aquela pessoa
    if (typeof location !== "undefined" && location.pathname.startsWith("/plataforma")) {
      const como = new URLSearchParams(location.search).get("como");
      if (como && usuario(estado.banco, como)) {
        estado = { ...estado, sessao: { ...estado.sessao, usuarioId: como, sessaoExpirada: false } };
        try {
          sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(estado.sessao));
        } catch {
          /* ignora */
        }
        history.replaceState(null, "", location.pathname + location.hash);
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === CHAVE_BANCO || e.key === null) {
          const novo = carregar();
          // a sessão é de cada aba; só o banco vem da outra aba
          estado = { banco: novo.banco, sessao: estado!.sessao };
          avisar();
        }
      });
    }
  }
  return estado;
}

function avisar() {
  ouvintes.forEach((f) => f());
}

function definir(parcial: Partial<Estado>, persistirBanco = true) {
  estado = { ...atual(), ...parcial };
  if (parcial.banco && persistirBanco) gravar(CHAVE_BANCO, estado.banco);
  if (parcial.sessao) {
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(estado.sessao));
    } catch {
      /* ignora */
    }
    gravar(CHAVE_SESSAO, estado.sessao);
  }
  avisar();
}

export const loja = {
  get banco() {
    return atual().banco;
  },
  get sessao() {
    return atual().sessao;
  },
  get usuario() {
    return usuario(atual().banco, atual().sessao.usuarioId ?? undefined);
  },

  entrar(usuarioId: string) {
    definir({ sessao: { ...atual().sessao, usuarioId, sessaoExpirada: false } });
  },
  sair() {
    definir({ sessao: { ...atual().sessao, usuarioId: null, sessaoExpirada: false } });
  },
  ajustarDemo(parcial: Partial<Pick<Sessao, "semConexao" | "sessaoExpirada">>) {
    definir({ sessao: { ...atual().sessao, ...parcial } });
  },
  async restaurar() {
    await limparArquivos();
    definir({ banco: semente() });
  },

  /**
   * Executa uma ação do domínio como a pessoa da sessão.
   * Falhas de rede e de sessão chegam antes da regra, como chegariam do servidor.
   */
  executar(acao: (b: Banco, atorId: string, agora: Date) => Resultado): Resultado {
    const { sessao, banco } = atual();
    if (sessao.semConexao) return { ok: false, erro: "Sem conexão. Nada foi salvo; tente de novo quando a internet voltar." };
    if (sessao.sessaoExpirada || !sessao.usuarioId) return { ok: false, erro: "Sua sessão expirou. Entre de novo para continuar; o que você escreveu continua na tela." };
    const r = acao(banco, sessao.usuarioId, new Date());
    if (r.ok && r.banco !== banco) definir({ banco: r.banco });
    return r;
  },

  /** Canais públicos (o site do colégio): gravam sem sessão, com a mesma regra de domínio. */
  registrarPublico(acao: (b: Banco, agora: Date) => Resultado): Resultado {
    const r = acao(atual().banco, new Date());
    if (r.ok && r.banco !== atual().banco) definir({ banco: r.banco });
    return r;
  },

  inscrever(f: () => void) {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  },
};

/** Banco, sessão e pessoa atuais, com nova renderização a cada mudança e a cada 30 s (para "há 2 min"). */
export function useLoja() {
  const [, setVersao] = useState(0);
  useEffect(() => {
    const tocar = () => setVersao((v) => v + 1);
    const desinscrever = loja.inscrever(tocar);
    const relogio = setInterval(tocar, 30_000);
    return () => {
      desinscrever();
      clearInterval(relogio);
    };
  }, []);
  return { banco: loja.banco, sessao: loja.sessao, eu: loja.usuario, agora: new Date() };
}

/* ---------- rotas por hash: #/portal/secao/id ---------- */

export interface Rota {
  portal: Portal | null;
  secao: string;
  id?: string;
  extra?: string;
}

function lerRota(): Rota {
  const partes = (typeof location === "undefined" ? "" : location.hash).replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const portais: Portal[] = ["aluno", "professor", "pais", "gestao", "crm"];
  const portal = portais.includes(partes[0] as Portal) ? (partes[0] as Portal) : null;
  return { portal, secao: partes[1] ?? "inicio", id: partes[2], extra: partes[3] };
}

export function useRota(): Rota {
  const [rota, setRota] = useState(lerRota);
  useEffect(() => {
    const mudar = () => {
      setRota(lerRota());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", mudar);
    return () => window.removeEventListener("hashchange", mudar);
  }, []);
  return rota;
}

export function ir(...partes: (string | undefined)[]) {
  location.hash = "/" + partes.filter(Boolean).map((p) => encodeURIComponent(p!)).join("/");
}

export function href(...partes: (string | undefined)[]) {
  return "#/" + partes.filter(Boolean).map((p) => encodeURIComponent(p!)).join("/");
}

/** Portal inicial de quem acabou de entrar. */
export function portalPadrao(usuarioId: string): Portal | null {
  return portaisDe(usuario(loja.banco, usuarioId))[0] ?? null;
}
