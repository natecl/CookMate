const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');

// Load environment variables before importing route/agent modules.
const envPaths = [path.resolve(__dirname, '.env'), path.resolve(__dirname, '../.env')];
for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false, quiet: true });
}

const healthRoutes = require('./routes/healthRoutes');
const cookingRoutes = require('./routes/cookingRoutes');
const { setupScanWebSocketServer } = require('./ws/scanServer');
const { setupCookingLiveServer } = require('./ws/cookingLiveServer');

const app = express();
const PORT = 5000;
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api', cookingRoutes);

// Use noServer mode for WebSocket servers to avoid upgrade conflicts
const scanWss = setupScanWebSocketServer();
const cookingWss = setupCookingLiveServer();

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === '/ws/scan') {
    scanWss.handleUpgrade(req, socket, head, (ws) => {
      scanWss.emit('connection', ws, req);
    });
  } else if (pathname === '/ws/cooking-live') {
    cookingWss.handleUpgrade(req, socket, head, (ws) => {
      cookingWss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
