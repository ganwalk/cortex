/*
  Envio de arquivos em estados: enviando → validando → pronto | falhou.
  Selecionar uma foto não é enviar: a lista mostra o progresso real e só libera a publicação
  (ou a entrega) quando tudo está pronto.
*/
import { useEffect, useState } from "preact/hooks";
import { novoId } from "../dominio/acoes";
import { tamanhoLegivel, validarArquivo } from "../dominio/regras";
import type { Anexo } from "../dominio/tipos";
import { guardarArquivo, lerArquivo } from "../estado/arquivos";
import { loja } from "../estado/loja";
import { Botao, Icone, Selo } from "./base";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useEnvio(iniciais: Anexo[], aceitos: string[]) {
  const [anexos, setAnexos] = useState<Anexo[]>(iniciais);
  const arquivos = useState(() => new Map<string, File>())[0];

  const mudar = (id: string, parcial: Partial<Anexo>) => setAnexos((lista) => lista.map((a) => (a.id === id ? { ...a, ...parcial } : a)));

  async function processar(id: string, arquivo: File) {
    mudar(id, { estado: "enviando", erro: undefined });
    await espera(500 + Math.min(1800, arquivo.size / 4000));
    if (loja.sessao.semConexao) {
      mudar(id, { estado: "falhou", erro: "A conexão caiu durante o envio." });
      return;
    }
    try {
      await guardarArquivo(id, arquivo);
    } catch {
      mudar(id, { estado: "falhou", erro: "Não foi possível guardar o arquivo neste aparelho." });
      return;
    }
    mudar(id, { estado: "validando" });
    await espera(350);
    const v = validarArquivo(arquivo.name, arquivo.type, arquivo.size, aceitos);
    if (!v.ok) {
      mudar(id, { estado: "falhou", erro: v.erro });
      return;
    }
    mudar(id, { estado: "pronto", tipo: v.tipo, chave: id });
  }

  function adicionar(lista: FileList | File[]) {
    const novos = [...lista].map((f) => {
      const id = novoId("arq");
      arquivos.set(id, f);
      return { id, nome: f.name, tipo: f.type, tamanho: f.size, estado: "enviando" as const };
    });
    setAnexos((l) => [...l, ...novos]);
    novos.forEach((a) => processar(a.id, arquivos.get(a.id)!));
  }

  return {
    anexos,
    adicionar,
    remover: (id: string) => setAnexos((l) => l.filter((a) => a.id !== id)),
    tentarDeNovo: (id: string) => {
      const f = arquivos.get(id);
      if (f) processar(id, f);
    },
    limpar: () => setAnexos([]),
    pendente: anexos.some((a) => a.estado === "enviando" || a.estado === "validando"),
    comFalha: anexos.some((a) => a.estado === "falhou"),
    prontos: anexos.filter((a) => a.estado === "pronto"),
  };
}

const ROTULO_ESTADO = { enviando: "Enviando…", validando: "Conferindo…", pronto: "Pronto", falhou: "Falhou" } as const;

export function ListaAnexos({ envio, somenteLeitura }: { envio: ReturnType<typeof useEnvio>; somenteLeitura?: boolean }) {
  if (!envio.anexos.length) return null;
  return (
    <ul class="anexos" role="list">
      {envio.anexos.map((a) => (
        <li key={a.id} class={`anexo anexo--${a.estado}`}>
          <Miniatura anexo={a} />
          <div class="anexo__info">
            <p class="anexo__nome">{a.nome}</p>
            <p class="anexo__meta">
              {tamanhoLegivel(a.tamanho)} ·{" "}
              <span aria-live="polite">{a.estado === "falhou" ? a.erro ?? ROTULO_ESTADO.falhou : ROTULO_ESTADO[a.estado]}</span>
            </p>
            {(a.estado === "enviando" || a.estado === "validando") && <span class="carregando" aria-hidden="true" />}
          </div>
          {!somenteLeitura && (
            <div class="anexo__acoes">
              {a.estado === "falhou" && (
                <Botao variante="fantasma" pequeno onClick={() => envio.tentarDeNovo(a.id)}>
                  Tentar de novo
                </Botao>
              )}
              <button type="button" class="icone-btn" aria-label={`Remover ${a.nome}`} onClick={() => envio.remover(a.id)}>
                <Icone nome="fechar" tamanho={18} />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Miniatura de imagem quando o arquivo está guardado; ícone nos demais casos. */
export function Miniatura({ anexo }: { anexo: Anexo }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    let criado: string | null = null;
    if (anexo.chave && anexo.tipo.startsWith("image/") && anexo.estado === "pronto") {
      lerArquivo(anexo.chave).then((b) => {
        if (b && vivo) {
          criado = URL.createObjectURL(b);
          setUrl(criado);
        }
      });
    }
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [anexo.chave, anexo.estado]);
  if (url) return <img class="anexo__mini" src={url} alt="" />;
  return (
    <span class="anexo__mini anexo__mini--icone">
      <Icone nome={anexo.tipo.startsWith("image/") ? "camera" : "arquivo"} />
    </span>
  );
}

export function SeletorArquivos({
  envio,
  aceitar,
  camera,
  rotulo,
  dica,
}: {
  envio: ReturnType<typeof useEnvio>;
  aceitar: string;
  camera?: boolean;
  rotulo: string;
  dica: string;
}) {
  const [sobre, setSobre] = useState(false);
  return (
    <div
      class={`seletor${sobre ? " seletor--sobre" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        if (e.dataTransfer?.files.length) envio.adicionar(e.dataTransfer.files);
      }}
    >
      <div class="seletor__botoes">
        {camera && (
          <label class="btn btn--primario">
            <Icone nome="camera" tamanho={18} /> Tirar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              class="visualmente-oculto"
              onChange={(e) => {
                const i = e.currentTarget;
                if (i.files?.length) envio.adicionar(i.files);
                i.value = "";
              }}
            />
          </label>
        )}
        <label class={`btn ${camera ? "btn--secundario" : "btn--primario"}`}>
          <Icone nome="enviar" tamanho={18} /> {rotulo}
          <input
            type="file"
            multiple
            accept={aceitar}
            class="visualmente-oculto"
            onChange={(e) => {
              const i = e.currentTarget;
              if (i.files?.length) envio.adicionar(i.files);
              i.value = "";
            }}
          />
        </label>
      </div>
      <p class="seletor__dica">{dica}</p>
      {envio.pendente && <Selo tom="acao">Aguarde o envio terminar</Selo>}
    </div>
  );
}
