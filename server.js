// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static hosting with helpful cache headers (no-store for JSON; cache assets)
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (/\.(json)$/i.test(filePath)) {
      // Avoid stale data during real-data testing
      res.setHeader('Cache-Control', 'no-store');
    } else if (/\.(png|jpe?g|gif|webp|svg|css|js|mp3|wav|ogg|woff2?|ttf)$/i.test(filePath)) {
      // Let assets cache; tweak duration as needed
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    }
  }
}));

// Lightweight health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Fallback routes (serve index for any path; supports query params + deep links)
app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Deck Builder UI running at http://localhost:${PORT}`);
});
