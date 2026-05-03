import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import { resolve }      from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'meetmesh-core': resolve(__dirname, '../meetmesh-core/src/index.ts'),
    },
  },
  base: process.env.BASE_PATH || '/meetmesh',
  server: {
    port:         parseInt(process.env.PORT || '5173'),
    host:         '0.0.0.0',
    allowedHosts: true,
  },
});
