import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // mapbox-gl alone is ~1.8 MB minified; it is already split out and only loads with the map page.
    chunkSizeWarningLimit: 2000,
  },
})
