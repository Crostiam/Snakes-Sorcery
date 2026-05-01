import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Snakes-Sorcery/', // <-- MUST match the exact capitalization of the repo!
  plugins: [react()],
})