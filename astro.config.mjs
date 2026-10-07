import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://colegiocortex.com.br",
  build: { inlineStylesheets: "auto" },
  integrations: [preact()],
});
