import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 客户端入口固定在仓库根的 index.html（/src/client/main.tsx）。
// 开发时 Express 以 middlewareMode 挂载本配置；生产时由 dist 静态目录提供。
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
});
