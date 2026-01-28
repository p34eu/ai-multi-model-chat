import { defineConfig } from "vite";
import { viteStaticCopy } from 'vite-plugin-static-copy'
export default defineConfig({
  root: ".", // default, but explicit is fine
  publicDir: "public", // static assets
  build: {
    outDir: "public", // output into your webroot
    emptyOutDir: false, // prevent deleting your webroot
  },
  plugins: [
    viteStaticCopy({ targets: [{ src: "src/images/*.png", dest: "assets" }] }),
  ],
});
