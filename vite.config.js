import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    build: {
      assetsDir: "build", 
    },
    server: {
      proxy: {
        "/api": {
          target: env.APP_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
