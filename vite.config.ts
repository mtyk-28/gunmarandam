import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: envPort ?? 5173,
    // Only pin the port when it was explicitly assigned (e.g. by tooling);
    // otherwise let Vite fall back to the next free port as usual.
    strictPort: envPort !== undefined,
  },
})
