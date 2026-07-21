import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Serve assets from the repository path by default so GitHub Pages loads the
    // JavaScript bundle reliably even when visitors open /StudyGen without a trailing slash.
    // Set VITE_BASE_PATH=./ for relative assets on other static hosts.
    base: process.env.VITE_BASE_PATH || '/StudyGen/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled in constrained edit/deploy environments via DISABLE_HMR.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
