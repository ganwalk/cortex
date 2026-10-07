#!/usr/bin/env node
/*
  Grava o vídeo da Plataforma Córtex a partir de video/cenas.html.
  Abre a página no Chromium, desenha cada quadro com VIDEO.render(t) e manda as imagens para o ffmpeg,
  que junta a trilha gerada por scripts/trilha.py.

  Uso: npm run video                 grava 16:9 e 9:16 em public/video/
       npm run video -- 169          só um formato
       npm run video -- quadros 12.5 salva só o quadro do segundo 12,5 (para conferir), nos dois formatos

  Precisa de ffmpeg no PATH e de python3 com numpy. O Chromium vem de PLAYWRIGHT_BROWSERS_PATH ou de CHROMIUM.
*/
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { chromium } from "playwright-core";

const RAIZ = new URL("..", import.meta.url).pathname;
const SAIDA = `${RAIZ}public/video/`;
const args = process.argv.slice(2);
const formatos = args.filter((a) => a === "169" || a === "916");
const alvo = formatos.length ? formatos : ["169", "916"];
const soQuadros = args[0] === "quadros" ? args.slice(1).map(Number) : null;

const candidatos = [process.env.CHROMIUM, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].filter(Boolean);
const executablePath = candidatos.find((c) => existsSync(c));

mkdirSync(SAIDA, { recursive: true });
const TRILHA = `${RAIZ}video/trilha.wav`;
if (!soQuadros) execFileSync("python3", [`${RAIZ}scripts/trilha.py`, TRILHA], { stdio: "inherit" });
const navegador = await chromium.launch({ executablePath, args: ["--allow-file-access-from-files", "--disable-web-security"] });

for (const f of alvo) {
  const [l, a] = f === "169" ? [1920, 1080] : [1080, 1920];
  const pagina = await navegador.newPage({ viewport: { width: l, height: a }, deviceScaleFactor: 1 });
  pagina.on("pageerror", (e) => console.error(`[${f}] erro na página:`, e.message));
  await pagina.goto(`file://${RAIZ}video/cenas.html?f=${f}`);
  await pagina.evaluate(() => window.PRONTO);
  const { duracao, fps } = await pagina.evaluate(() => ({ duracao: window.VIDEO.duracao, fps: window.VIDEO.fps }));

  if (soQuadros) {
    const pasta = `${RAIZ}video/quadros/`;
    mkdirSync(pasta, { recursive: true });
    for (const t of soQuadros) {
      await pagina.evaluate((t) => window.VIDEO.render(t), t);
      await pagina.screenshot({ path: `${pasta}${f}-${t.toFixed(2)}.png` });
    }
    await pagina.close();
    continue;
  }

  const total = Math.round(duracao * fps);
  const arquivo = `${SAIDA}plataforma-cortex-${f === "169" ? "16x9" : "9x16"}.mp4`;
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", "-i", TRILHA, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "160k", "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", arquivo], { stdio: ["pipe", "inherit", "inherit"] });
  const fim = new Promise((ok, falha) => ff.on("close", (c) => (c === 0 ? ok() : falha(new Error(`ffmpeg saiu com ${c}`)))));
  for (let i = 0; i < total; i++) {
    await pagina.evaluate((t) => window.VIDEO.render(t), i / fps);
    const png = await pagina.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`[${f}] quadro ${i} de ${total}`);
  }
  ff.stdin.end();
  await fim;
  // capa: o quadro da assinatura
  await pagina.evaluate((t) => window.VIDEO.render(t), duracao - 1);
  await pagina.screenshot({ path: `${SAIDA}plataforma-cortex-${f === "169" ? "16x9" : "9x16"}.jpg`, type: "jpeg", quality: 85 });
  console.log(`[${f}] pronto: ${arquivo}`);
  await pagina.close();
}
await navegador.close();
