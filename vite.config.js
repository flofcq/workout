import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { precacheSw } from './vite-plugin-sw.js'

export default defineConfig({
  plugins: [react(), precacheSw()],
})
