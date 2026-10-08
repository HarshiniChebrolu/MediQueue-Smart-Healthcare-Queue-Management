import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

const logger = createLogger();
const originalError = logger.error;
logger.error = (msg, options) => {
  // Suppress noisy transient proxy connection errors while the backend server initializes
  if (
    typeof msg === 'string' &&
    (msg.includes('ECONNREFUSED') || msg.includes('http proxy error'))
  ) {
    return;
  }
  originalError(msg, options);
};

export default defineConfig({
  define: {
    'process.env': {},
  },
  customLogger: logger,
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && res.writeHead && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Server starting...' }));
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && res.writeHead && !res.headersSent) {
              res.writeHead(502);
              res.end();
            }
          });
        },
      },
    },
  },
});

