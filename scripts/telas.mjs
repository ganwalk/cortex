#!/usr/bin/env node
/*
  Capturas da Plataforma Córtex para a página inicial (public/plataforma/telas/).
  Uso: com o servidor rodando (npm run dev ou npm run preview), rode `npm run telas`.
  Endereço diferente: `npm run telas -- http://localhost:4321`.
  Cada captura abre uma janela nova, com a semente de dados original e o tema pedido.
*/
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:4321";
const SAIDA = new URL("../public/plataforma/telas/", import.meta.url).pathname;
mkdirSync(SAIDA, { recursive: true });

const computador = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25 };
const celular = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** [arquivo, endereço, tamanho, preparo opcional depois de carregar] */
const telas = [
  ["crm", "/plataforma/?como=u-thiago#/crm", computador],
  ["familia", "/plataforma/?como=u-simone#/pais", computador],
  ["familia-celular", "/plataforma/?como=u-simone#/pais/notas", celular],
  ["aluno", "/plataforma/?como=u-gustavo#/aluno", computador],
  ["aluno-celular", "/plataforma/?como=u-gustavo#/aluno/tarefas/tar-redacao-6", celular, async (p) => p.evaluate(() => scrollTo(0, 420))],
  ["professor", "/plataforma/?como=u-carolina#/professor/tarefas/tar-redacao-7", computador, async (p) => {
    await p.getByRole("tab", { name: /Para conferir/ }).click();
    await p.getByRole("button", { name: "Ver" }).first().click();
    await p.evaluate(() => scrollTo(0, 300));
  }],
  ["gestao", "/plataforma/?como=u-adriana#/gestao", computador],
];

// o WebGL da hero do site roda no SwiftShader quando não há placa de vídeo
const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args }).catch(() => chromium.launch({ args }));

for (const tema of ["claro", "escuro"]) {
  for (const [nome, rota, tamanho, preparo] of telas) {
    const contexto = await navegador.newContext({ ...tamanho, colorScheme: tema === "escuro" ? "dark" : "light" });
    await contexto.addInitScript((t) => {
      try {
        localStorage.setItem("cortex-plataforma:tema", t);
      } catch {
        /* sem armazenamento: vale o tema do sistema */
      }
    }, tema);
    const pagina = await contexto.newPage();
    await pagina.goto(BASE + rota, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(1400); // as telas entram em cascata
    if (preparo) {
      await preparo(pagina);
      await pagina.waitForTimeout(400);
    }
    await pagina.screenshot({ path: `${SAIDA}${nome}-${tema}.jpg`, type: "jpeg", quality: 82 });
    await contexto.close();
    console.log(`${nome}-${tema}.jpg`);
  }
}

// o site só tem tema claro
const contexto = await navegador.newContext({ ...computador, colorScheme: "light" });
const pagina = await contexto.newPage();
await pagina.goto(`${BASE}/site/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(3200); // o retrato termina de se formar
await pagina.screenshot({ path: `${SAIDA}site-claro.jpg`, type: "jpeg", quality: 82 });
console.log("site-claro.jpg");
await navegador.close();
