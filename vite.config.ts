import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Snakes-Sorcery/', // <-- CRITICAL: Include the slashes!
  plugins: [react()],
})