import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  publicDir: false,
  build: {
    outDir: '../public/assets',
    emptyOutDir: true,
    assetsDir: '',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/models': 'http://localhost:3003',
      '/chat': 'http://localhost:3003'
    }
  }
})