import { useEffect, useState } from "preact/hooks";
import { tamanhoLegivel } from "../dominio/regras";
import type { Anexo } from "../dominio/tipos";
import { lerArquivo } from "../estado/arquivos";
import { Botao, Estado, Janela } from "./base";

type Carga = { fase: "carregando" } | { fase: "pronto"; url: string } | { fase: "previa" } | { fase: "indisponivel" };

/** Abre um anexo dentro da plataforma: imagem, PDF ou, nos exemplos, o texto de prévia. */
export function Leitor({ anexo, aoFechar }: { anexo: Anexo | null; aoFechar: () => void }) {
  const [carga, setCarga] = useState<Carga>({ fase: "carregando" });

  useEffect(() => {
    if (!anexo) return;
    let url: string | null = null;
    let vivo = true;
    setCarga({ fase: "carregando" });
    if (!anexo.chave) {
      setCarga(anexo.previa !== undefined ? { fase: "previa" } : { fase: "indisponivel" });
      return;
    }
    lerArquivo(anexo.chave).then((b) => {
      if (!vivo) return;
      if (!b) return setCarga({ fase: "indisponivel" });
      url = URL.createObjectURL(b);
      setCarga({ fase: "pronto", url });
    });
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [anexo?.id]);

  if (!anexo) return null;
  const imagem = anexo.tipo.startsWith("image/");
  const pdf = anexo.tipo === "application/pdf";

  return (
    <Janela aberta={!!anexo} aoFechar={aoFechar} titulo={anexo.nome} largura={920}>
      <p class="leitor__meta">{tamanhoLegivel(anexo.tamanho)}</p>
      {carga.fase === "carregando" && <div class="leitor__carregando" aria-busy="true">Abrindo o arquivo…</div>}
      {carga.fase === "pronto" && imagem && <img class="leitor__imagem" src={carga.url} alt={`Arquivo ${anexo.nome}`} />}
      {carga.fase === "pronto" && pdf && <iframe class="leitor__pdf" src={carga.url} title={anexo.nome} />}
      {carga.fase === "pronto" && !imagem && !pdf && (
        <Estado icone="arquivo" titulo="Este formato abre no aplicativo do aparelho.">
          Baixe o arquivo para abrir.
        </Estado>
      )}
      {carga.fase === "previa" && (
        <div class="leitor__previa">
          <p class="leitor__aviso">Arquivo de exemplo da demonstração. No uso real, o PDF abre aqui.</p>
          <pre>{anexo.previa || "Sem prévia."}</pre>
        </div>
      )}
      {carga.fase === "indisponivel" && (
        <Estado icone="alerta" tom="alerta" titulo="O arquivo não está disponível agora.">
          Na demonstração, cada arquivo fica guardado no navegador de quem enviou. Se o problema continuar no uso real, avise
          o professor pelo plantão ou a secretaria, com o nome do material.
        </Estado>
      )}
      <div class="janela__rodape">
        {carga.fase === "pronto" && (
          <a class="btn btn--secundario" href={carga.url} download={anexo.nome}>
            Baixar
          </a>
        )}
        <Botao variante="primario" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>
    </Janela>
  );
}
