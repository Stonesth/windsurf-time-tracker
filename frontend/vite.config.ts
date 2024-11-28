import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: true,
    open: true,
    hmr: {
      overlay: true
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', 'firebase/app', 'firebase/auth']
  }
})
