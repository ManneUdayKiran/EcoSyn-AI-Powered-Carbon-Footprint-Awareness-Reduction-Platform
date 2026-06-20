import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["localhost", "127.0.0.1", "https://ecosyn-ai-powered-carbon-footprint.onrender.com/","https://frontend-six-nu-62.vercel.app"]
  }
})
