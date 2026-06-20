import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    coverage: {
      reporter: ["text", "lcov"],
      thresholds: { lines: 70, functions: 70, statements: 70 }
    }
  },
  server: {
    allowedHosts: ["localhost", "127.0.0.1", "https://ecosyn-ai-powered-carbon-footprint.onrender.com/","https://frontend-six-nu-62.vercel.app"]
  }
})
