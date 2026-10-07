/*
  Tema claro, escuro ou automático (segue o sistema). A escolha fica neste navegador
  e é aplicada no <html> antes da primeira pintura (script em index.astro).
*/
import { useEffect, useState } from "preact/hooks";
import { Icone } from "./base";

export type Tema = "auto" | "claro" | "escuro";
const CHAVE = "cortex-plataforma:tema";

function ler(): Tema {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === "claro" || t === "escuro" ? t : "auto";
  } catch {
    return "auto";
  }
}

function aplicar(t: Tema) {
  if (t === "auto") document.documentElement.removeAttribute("data-tema");
  else document.documentElement.setAttribute("data-tema", t);
  try {
    if (t === "auto") localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, t);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

const ouvintes = new Set<(t: Tema) => void>();

export function useTema(): [Tema, (t: Tema) => void, boolean] {
  const [tema, setTema] = useState<Tema>(ler);
  const [sistemaEscuro, setSistemaEscuro] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    ouvintes.add(setTema);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const mudar = () => setSistemaEscuro(mq.matches);
    mq.addEventListener("change", mudar);
    return () => {
      ouvintes.delete(setTema);
      mq.removeEventListener("change", mudar);
    };
  }, []);
  const definir = (t: Tema) => {
    aplicar(t);
    ouvintes.forEach((f) => f(t));
  };
  const escuro = tema === "escuro" || (tema === "auto" && sistemaEscuro);
  return [tema, definir, escuro];
}

/** Grupo de três opções, usado no menu da pessoa. */
export function EscolhaTema() {
  const [tema, definir] = useTema();
  const opcoes: { id: Tema; rotulo: string }[] = [
    { id: "auto", rotulo: "Automático" },
    { id: "claro", rotulo: "Claro" },
    { id: "escuro", rotulo: "Escuro" },
  ];
  return (
    <div class="tema" role="radiogroup" aria-label="Aparência">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={tema === o.id} class="tema__opcao" onClick={() => definir(o.id)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Botão rápido na barra: alterna entre claro e escuro. */
export function BotaoTema({ class: cls = "barra__icone" }: { class?: string }) {
  const [, definir, escuro] = useTema();
  return (
    <button type="button" class={cls} onClick={() => definir(escuro ? "claro" : "escuro")} aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"} title={escuro ? "Tema claro" : "Tema escuro"}>
      <Icone nome={escuro ? "sol" : "lua"} tamanho={18} />
    </button>
  );
}
