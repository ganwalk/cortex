#!/usr/bin/env node
/*
  Verificador de texto do repositório. Aplica, em português, as regras de CLAUDE.md
  (adaptadas de github.com/petergyang/no-ai-slop, licença MIT) a todo texto que alguém lê:
  páginas, componentes, dados, interface da plataforma e documentação.

  Uso: npm run textos           lista os achados e sai com código 1 se houver algum
       npm run textos -- --todos inclui os avisos (padrões que pedem leitura humana)

  Para manter uma ocorrência legítima, ponha `textos-ok` num comentário na mesma linha.
  Citações do site atual e transcrições ficam de fora (ver IGNORAR).
*/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const PASTAS = ["src", "docs", "video", "scripts"];
const ARQUIVOS = ["README.md"];
const EXTENSOES = [".astro", ".ts", ".tsx", ".md", ".mjs", ".html", ".py"];
const IGNORAR = [
  "scripts/textos.mjs",
  "CLAUDE.md",
];

/** Erros: palavras e fórmulas que não entram no texto. */
const ERROS = [
  // palavras infladas (equivalentes de delve, leverage, robust, game changer…)
  [/\balavanc\w*/i, "palavra inflada: diga o que a coisa faz"],
  [/\bpotencializ\w*/i, "palavra inflada"],
  [/\bempoder\w*/i, "palavra inflada"],
  [/\bmergulh(ar|e|amos|ando) (em|no|na|nos|nas|fundo)\b/i, "“mergulhar em”: vá direto ao assunto"],
  [/\brobust[oa]s?\b/i, "“robusto”: diga o que aguenta, com número"],
  [/\bde ponta\b/i, "“de ponta”: diga qual tecnologia"],
  [/\bdivisor de águas\b/i, "puffery"],
  [/\bmudan[çc]a de paradigma\b/i, "puffery"],
  [/\brevolucion\w*/i, "puffery: diga o que muda, com fato"],
  [/\btransformador[ae]?s?\b/i, "puffery"],
  [/\bjornada\b/i, "metáfora gasta: diga o percurso concreto"],
  [/\bsinergi\w*/i, "jargão"],
  [/\bmultifacetad\w*/i, "palavra inflada"],
  [/\bmeticulos\w*/i, "palavra inflada"],
  [/\bintrincad\w*/i, "palavra inflada"],
  [/\bprimordial\b/i, "palavra inflada"],
  [/\bem constante evolu[çc][ãa]o\b/i, "clichê"],
  [/\bturbin\w*/i, "palavra inflada"],
  [/\belev(ar|e|a|ando) (o|a|os|as|sua|seu) (n[íi]vel|patamar|experi[êe]ncia)\b/i, "clichê"],
  [/\bembarc(ar|ue|amos) (n[ae]|em)\b/i, "metáfora gasta"],
  [/\bfarol\b/i, "metáfora gasta"],
  [/\btape[çc]aria\b/i, "metáfora gasta"],
  [/\bfomentar\b/i, "palavra inflada"],
  [/\butiliz(ar|a|am|ando|e|ado|ada)\b/i, "use “usar”"],
  // frases vazias
  [/\bvale (a pena )?(ressaltar|destacar|notar|lembrar|mencionar)\b/i, "frase vazia: diga o fato"],
  [/(^|[^\p{L}])[ée] (importante|fundamental|essencial) (notar|ressaltar|destacar|lembrar)\b/iu, "frase vazia"],
  [/\bno fim das contas\b/i, "frase vazia"],
  [/\bquando se trata de\b/i, "frase vazia"],
  [/\bem sua ess[êe]ncia\b/i, "frase vazia"],
  [/\b(no mundo de hoje|nos dias de hoje|nos dias atuais|na era d[aoe])\b/i, "abertura genérica"],
  [/\ba (verdade|realidade) [ée] que\b/i, "abertura vazia"],
  [/\bno que (diz respeito|tange)\b/i, "use “sobre”"],
  [/\ba fim de\b/i, "use “para”"],
  [/\bdaqui (para|pra) frente\b/i, "frase vazia"],
  [/\b(neste artigo|vamos mergulhar|sem mais delongas)\b/i, "frase vazia"],
  // aberturas e falsas revelações
  [/\b(o fato [ée] que|vou ser (sincero|honesto)|deixa eu ser claro|aqui est[áa] o ponto)\b/i, "abertura de rodeio"],
  [/\b(o que ningu[ée]m (te )?(conta|diz)|o que a maioria (erra|ignora|esquece)|a parte que (todos|todo mundo|ningu[ée]m))\b/i, "falsa revelação"],
  [/\b(e se eu te dissesse|pense nisso:|reviravolta:)/i, "pergunta retórica de efeito"],
  // análise de enfeite e importância inflada
  [/,\s*(destacando|ressaltando|evidenciando|refor[çc]ando|sublinhando|demonstrando|refletindo|mostrando) (o|a|os|as|seu|sua)\b/i, "gerúndio que finge explicar: diga a consequência"],
  [/\b(marca um momento|momento hist[óo]rico|desempenha um papel|papel (fundamental|crucial|vital)|testemunho d[eo]|consolida (sua|seu) posi[çc][ãa]o)\b/i, "importância inflada: diga o fato"],
  [/\b(especialistas (afirmam|concordam|dizem)|estudos (mostram|indicam|comprovam)|pesquisas (mostram|indicam)|amplamente reconhecid\w*)\b/i, "atribuição vaga: cite a fonte ou corte"],
  [/\b(em conclus[ãa]o|em resumo|resumindo)\b/i, "fecho que repete: termine no último fato"],
  // forma
  [/—/, "travessão (em dash): use vírgula, ponto ou dois-pontos"],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, "emoji no texto"],
];

/** Avisos: padrões que às vezes são legítimos e pedem leitura humana. */
const AVISOS = [
  [/(^|[^\p{L}])n[ãa]o [ée] (s[óo] |apenas )?[^.;:!?]{1,40}[,.;] *(é|e sim)(?=[\s,]|$)/iu, "contraste binário (“não é X, é Y”): diga Y"],
  [/\bn[ãa]o (apenas|s[óo]) [^.;!?]{1,60}(mas( tamb[ée]m)?|como tamb[ée]m)\b/i, "“não só X, mas Y”: diga os dois"],
  [/\b(simplesmente|literalmente|realmente|verdadeiramente|fundamentalmente|essencialmente|basicamente|crucialmente|inevitavelmente|honestamente)\b/i, "advérbio que costuma ser vazio"],
  [/\b(facilit\w+|otimiz\w+|aprimor\w+)\b/i, "verbo genérico: diga o que muda"],
  [/\b(ecossistema|solu[çc][ãa]o completa|experi[êe]ncia (única|incr[íi]vel))\b/i, "termo genérico"],
  [/\b(sai|saem) [^.;]{1,50}; entra/i, "contraste em par (“sai X, entra Y”): diga o novo"],
];

function arquivos() {
  const lista = [];
  const andar = (dir) => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      const rel = relative(RAIZ, caminho);
      if (IGNORAR.some((i) => rel.endsWith(i))) continue;
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (EXTENSOES.some((e) => nome.endsWith(e))) lista.push(caminho);
    }
  };
  PASTAS.forEach((p) => andar(join(RAIZ, p)));
  ARQUIVOS.forEach((a) => lista.push(join(RAIZ, a)));
  return lista;
}

export function verificar({ todos = false } = {}) {
  const achados = [];
  for (const arquivo of arquivos()) {
    const linhas = readFileSync(arquivo, "utf8").split("\n");
    linhas.forEach((linha, i) => {
      if (linha.includes("textos-ok")) return;
      for (const [re, motivo] of ERROS) if (re.test(linha)) achados.push({ arquivo: relative(RAIZ, arquivo), linha: i + 1, nivel: "erro", motivo, trecho: linha.trim().slice(0, 140) });
      if (todos) for (const [re, motivo] of AVISOS) if (re.test(linha)) achados.push({ arquivo: relative(RAIZ, arquivo), linha: i + 1, nivel: "aviso", motivo, trecho: linha.trim().slice(0, 140) });
    });
  }
  return achados;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const achados = verificar({ todos: process.argv.includes("--todos") });
  for (const a of achados) console.log(`${a.nivel === "erro" ? "ERRO " : "aviso"} ${a.arquivo}:${a.linha}  ${a.motivo}\n      ${a.trecho}`);
  const erros = achados.filter((a) => a.nivel === "erro").length;
  console.log(`\n${erros} erro(s), ${achados.length - erros} aviso(s).`);
  process.exit(erros ? 1 : 0);
}
