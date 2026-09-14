import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(root, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        // O cliente do Supabase é a maior parte do peso e quase nunca muda.
        // Em arquivo próprio, ele fica no cache do navegador entre deploys.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react')) return 'react'
        },
      },
    },
  },
})
