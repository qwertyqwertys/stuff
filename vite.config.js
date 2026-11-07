import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const copyGamesFolderPlugin = () => ({
  name: 'copy-games-folder',
  closeBundle() {
    const srcDir = path.resolve(__dirname, 'games');
    const destDir = path.resolve(__dirname, 'dist/games');
    
    if (fs.existsSync(srcDir)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.cpSync(srcDir, destDir, { recursive: true });
      console.log('Successfully copied standalone games directory to dist/games!');
    }
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', 
    plugins: [react(), tailwindcss(), copyGamesFolderPlugin()],
    build: {
      chunkSizeWarningLimit: 1000, 
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
