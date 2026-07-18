import 'dotenv/config';
import { startServer } from './server.js';

const PORT = Number(process.env.PORT || 7456);
const HOST = process.env.BIND_HOST || '127.0.0.1';

startServer({ port: PORT, host: HOST })
  .then((url) => {
    console.error(`[daemon] AI Video Daemon running at ${url}`);
    console.error(`[daemon] Health check: ${url}/api/health`);
  })
  .catch((err: unknown) => {
    console.error('[daemon] Failed to start:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
