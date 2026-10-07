/*
  Retratos de exemplo (Pexels, licença livre) para as pessoas fictícias da demonstração.
  Ficam fora do domínio: em produção, a foto vem do cadastro e pode não existir.
*/
const BASE = "/plataforma/pessoas/";

const FIXAS: Record<string, string> = {
  "u-gustavo": "gustavo",
  "u-isabela": "isabela",
  "u-larissa": "larissa",
  "u-simone": "simone",
  "u-otavio": "otavio",
  "u-renata": "renata",
  "u-wagner": "wagner",
  "u-carolina": "carolina",
  "u-diego": "diego",
  "u-adriana": "adriana",
  "u-tatiane": "tatiane",
  "u-mirela": "mirela",
  "u-thiago": "thiago",
  "u-roberto": "roberto",
  "u-gabriel": "gabriel",
};

const COLEGAS = [
  "sofia-ribeiro", "davi-mendes", "helena-duarte", "enzo-barbosa", "lara-monteiro",
  "miguel-cardoso", "valentina-gomes", "heitor-almeida", "ana-clara-souza", "caio-fernandes",
  "joao-pedro-silva", "mateus-oliveira", "rafaela-castro", "manuela-prado", "lorenzo-batista", "pietro-azevedo",
];

const MULHERES = 12;
const HOMENS = 12;
const NOMES_FEMININOS = /^(patr[ií]cia|carla|ana|renata|camila|aline|s[ií]lvia|let[ií]cia|daniela|bruna|maria|m[aã]e)/i;

function indice(texto: string, n: number) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % n) + 1;
}

/** Endereço do retrato da pessoa, ou null para mostrar as iniciais. */
export function fotoDe(id: string, nome: string): string | null {
  if (FIXAS[id]) return `${BASE}${FIXAS[id]}.jpg`;
  const slug = id.replace(/^u-/, "");
  if (COLEGAS.includes(slug)) return `${BASE}${slug}.jpg`;
  if (id.startsWith("u-resp-")) {
    return NOMES_FEMININOS.test(nome) ? `${BASE}mulher-${indice(id, MULHERES)}.jpg` : `${BASE}homem-${indice(id, HOMENS)}.jpg`;
  }
  return null;
}
