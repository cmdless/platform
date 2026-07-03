import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'react/jsx-dev-runtime', replacement: require.resolve('react/jsx-dev-runtime') },
      { find: 'react/jsx-runtime', replacement: require.resolve('react/jsx-runtime') },
      { find: 'react-dom/client', replacement: require.resolve('react-dom/client') },
      { find: 'react-dom', replacement: require.resolve('react-dom') },
      { find: 'react', replacement: require.resolve('react') },
    ],
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: './dist/renderer'
  },
})
