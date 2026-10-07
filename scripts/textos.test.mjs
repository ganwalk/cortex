// Roda o verificador de texto junto com os testes: um erro de escrita quebra o `npm test`.
import { expect, it } from "vitest";
import { verificar } from "./textos.mjs";

it("textos seguem as regras de CLAUDE.md", () => {
  const erros = verificar().map((a) => `${a.arquivo}:${a.linha} ${a.motivo}: ${a.trecho}`);
  expect(erros).toEqual([]);
});
