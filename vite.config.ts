import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import bodyParser from 'body-parser';
import path from 'path';
import { IncomingMessage } from 'http';
import { saveBackground } from './src/server/imageHandler';

interface ExtendedIncomingMessage extends IncomingMessage {
  body?: any;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-server',
      configureServer(server) {
        // Parse JSON bodies
        server.middlewares.use(bodyParser.json({ limit: '50mb' }));
        
        // Handle background image uploads
        server.middlewares.use((req: ExtendedIncomingMessage, res, next) => {
          if (req.url === '/api/save-background' && req.method === 'POST') {
            return saveBackground(req as any, res, next);
          }
          next();
        });
      },
    },
  ],
  base: './',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
});
