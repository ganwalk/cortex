import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { fotoDe } from "./fotos";
import { iniciais } from "./formato";

/* ---------- ícones (traço de 1,75 px, 24 × 24) ---------- */

const CAMINHOS: Record<string, string> = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  material: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  tarefa: "M9 11l2 2 4-4M5 4h14v16H5z",
  plantao: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  nota: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  aviso: "M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16zM10 21h4",
  pessoas: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M15.5 4.2a3 3 0 0 1 0 5.6",
  conversa: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  painel: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  funil: "M3 4h18l-7 9v6l-4 2v-8z",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  externo: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  enviar: "M12 16V4M7 9l5-5 5 5M4 20h16",
  camera: "M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  fechar: "M6 6l12 12M18 6 6 18",
  seta: "M9 6l6 6-6 6",
  voltar: "M15 6l-6 6 6 6",
  mais: "M12 5v14M5 12h14",
  sair: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  ok: "M5 12l5 5L20 7",
  alerta: "M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  calendario: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  escudo: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  arquivo: "M6 3h8l4 4v14H6zM14 3v4h4",
  fila: "M4 6h16M4 12h10M4 18h6",
  grade: "M4 4h16v16H4zM4 10h16M10 4v16",
  relogio: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  usuario: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  trocar: "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  lixo: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  editar: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  sol: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  lua: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  wifi: "M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.1-1.6M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01",
};

export function Icone({ nome, tamanho = 20, rotulo }: { nome: keyof typeof CAMINHOS | string; tamanho?: number; rotulo?: string }) {
  return (
    <svg
      class="icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : "true"}
    >
      <path d={CAMINHOS[nome] ?? CAMINHOS.arquivo} />
    </svg>
  );
}

/* ---------- botões ---------- */

type BotaoProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "fantasma" | "perigo";
  pequeno?: boolean;
  icone?: string;
  carregando?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Botao({ variante = "primario", pequeno, icone, carregando, children, class: cls, ...resto }: BotaoProps) {
  return (
    <button
      type="button"
      {...resto}
      class={`btn btn--${variante}${pequeno ? " btn--pequeno" : ""}${cls ? ` ${cls}` : ""}`}
      aria-busy={carregando || undefined}
      disabled={resto.disabled || carregando}
    >
      {icone && <Icone nome={icone} tamanho={pequeno ? 16 : 18} />}
      {children}
    </button>
  );
}

export function LinkBotao({ variante = "secundario", icone, children, ...resto }: JSX.HTMLAttributes<HTMLAnchorElement> & { variante?: string; icone?: string; href: string; target?: string; rel?: string }) {
  return (
    <a {...resto} class={`btn btn--${variante}`}>
      {icone && <Icone nome={icone} tamanho={18} />}
      {children}
    </a>
  );
}

/* ---------- selos e pessoas ---------- */

export type Tom = "neutro" | "acao" | "ok" | "alerta" | "perigo" | "escuro";

export function Selo({ tom = "neutro", children }: { tom?: Tom; children: ComponentChildren }) {
  return <span class={`selo selo--${tom}`}>{children}</span>;
}

export function Avatar({ id, nome, tamanho = 36 }: { id?: string; nome: string; tamanho?: number }) {
  const foto = id ? fotoDe(id, nome) : null;
  const [falhou, setFalhou] = useState(false);
  if (foto && !falhou) {
    return <img class="avatar avatar--foto" src={foto} alt="" width={tamanho} height={tamanho} loading="lazy" onError={() => setFalhou(true)} />;
  }
  return (
    <span class="avatar" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}

/* ---------- estrutura de página ---------- */

export function Cabecalho({ titulo, sub, acoes, voltar }: { titulo: string; sub?: ComponentChildren; acoes?: ComponentChildren; voltar?: { href: string; rotulo: string } }) {
  return (
    <header class="pagina__cabecalho">
      {voltar && (
        <a class="voltar" href={voltar.href}>
          <Icone nome="voltar" tamanho={16} /> {voltar.rotulo}
        </a>
      )}
      <div class="pagina__linha">
        <div>
          <h1 class="pagina__titulo">{titulo}</h1>
          {sub && <p class="pagina__sub">{sub}</p>}
        </div>
        {acoes && <div class="pagina__acoes">{acoes}</div>}
      </div>
    </header>
  );
}

export function Secao({ titulo, acao, children, id }: { titulo: string; acao?: ComponentChildren; children: ComponentChildren; id?: string }) {
  return (
    <section class="secao" aria-labelledby={id}>
      <div class="secao__topo">
        <h2 class="secao__titulo" id={id}>
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Estado vazio ou de falha: sempre diz o que aconteceu e o que fazer em seguida. */
export function Estado({ icone = "arquivo", titulo, children, acao, tom = "neutro" }: { icone?: string; titulo: string; children?: ComponentChildren; acao?: ComponentChildren; tom?: "neutro" | "alerta" | "perigo" }) {
  return (
    <div class={`estado estado--${tom}`} role={tom === "neutro" ? undefined : "alert"}>
      <span class="estado__icone">
        <Icone nome={icone} tamanho={22} />
      </span>
      <div>
        <p class="estado__titulo">{titulo}</p>
        {children && <div class="estado__texto">{children}</div>}
        {acao && <div class="estado__acao">{acao}</div>}
      </div>
    </div>
  );
}

export function Numero({ valor, rotulo, detalhe, tom }: { valor: ComponentChildren; rotulo: string; detalhe?: ComponentChildren; tom?: Tom }) {
  return (
    <div class={`numero${tom ? ` numero--${tom}` : ""}`}>
      <p class="numero__valor">{valor}</p>
      <p class="numero__rotulo">{rotulo}</p>
      {detalhe && <p class="numero__detalhe">{detalhe}</p>}
    </div>
  );
}

/* ---------- formulários ---------- */

export function Campo({ rotulo, dica, erro, children, id }: { rotulo: string; dica?: ComponentChildren; erro?: string; children: ComponentChildren; id?: string }) {
  return (
    <div class={`campo${erro ? " campo--erro" : ""}`}>
      <label class="campo__rotulo" for={id}>
        {rotulo}
      </label>
      {children}
      {dica && !erro && <p class="campo__dica">{dica}</p>}
      {erro && <p class="campo__erro">{erro}</p>}
    </div>
  );
}

export function Escolhas<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  multipla,
}: {
  opcoes: { id: T; rotulo: string; desabilitado?: boolean }[];
  valor: T[];
  aoMudar: (v: T[]) => void;
  rotulo: string;
  multipla?: boolean;
}) {
  return (
    <fieldset class="escolhas">
      <legend class="campo__rotulo">{rotulo}</legend>
      <div class="escolhas__lista">
        {opcoes.map((o) => {
          const marcado = valor.includes(o.id);
          return (
            <label class={`escolha${marcado ? " escolha--marcada" : ""}${o.desabilitado ? " escolha--off" : ""}`} key={o.id}>
              <input
                type={multipla ? "checkbox" : "radio"}
                checked={marcado}
                disabled={o.desabilitado}
                onChange={() => aoMudar(multipla ? (marcado ? valor.filter((v) => v !== o.id) : [...valor, o.id]) : [o.id])}
              />
              <span>{o.rotulo}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Abas<T extends string>({ abas, ativa, aoMudar, rotulo }: { abas: { id: T; rotulo: string; contagem?: number }[]; ativa: T; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div class="abas" role="tablist" aria-label={rotulo}>
      {abas.map((a) => (
        <button key={a.id} type="button" role="tab" aria-selected={a.id === ativa} class="abas__item" onClick={() => aoMudar(a.id)}>
          {a.rotulo}
          {a.contagem !== undefined && <span class="abas__n">{a.contagem}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- janela ---------- */

export function Janela({ aberta, aoFechar, titulo, children, largura = 560 }: { aberta: boolean; aoFechar: () => void; titulo: string; children: ComponentChildren; largura?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <dialog ref={ref} class="janela" style={{ maxWidth: largura }} onClose={aoFechar} onClick={(e) => e.target === ref.current && aoFechar()} aria-labelledby="janela-titulo">
      {aberta && (
        <div class="janela__corpo">
          <div class="janela__topo">
            <h2 id="janela-titulo">{titulo}</h2>
            <button type="button" class="icone-btn" onClick={aoFechar} aria-label="Fechar">
              <Icone nome="fechar" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/* ---------- avisos de ação (toast) ---------- */

type Recado = { id: number; texto: string; tom: "ok" | "erro" };
let recados: Recado[] = [];
const ouvintesRecado = new Set<() => void>();
let seq = 0;

export function avisar(texto: string, tom: "ok" | "erro" = "ok") {
  const r = { id: ++seq, texto, tom };
  recados = [...recados, r];
  ouvintesRecado.forEach((f) => f());
  setTimeout(() => {
    recados = recados.filter((x) => x.id !== r.id);
    ouvintesRecado.forEach((f) => f());
  }, tom === "erro" ? 7000 : 4000);
}

export function Recados() {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((n) => n + 1);
    ouvintesRecado.add(f);
    return () => ouvintesRecado.delete(f);
  }, []);
  return (
    <div class="recados" aria-live="polite" role="status">
      {recados.map((r) => (
        <p key={r.id} class={`recado recado--${r.tom}`}>
          <Icone nome={r.tom === "ok" ? "ok" : "alerta"} tamanho={18} />
          {r.texto}
        </p>
      ))}
    </div>
  );
}

/** Roda uma ação da loja e mostra o resultado. Devolve se deu certo. */
export function resultado(r: { ok: boolean; erro?: string }, sucesso?: string): boolean {
  if (!r.ok) {
    avisar(r.erro ?? "Não deu certo.", "erro");
    return false;
  }
  if (sucesso) avisar(sucesso);
  return true;
}
