import express from 'express';
import cors from 'cors';

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AssetFlow server is running' });
});

const startServer = (port) => {
  app.listen(port, () => {
    console.log(`AssetFlow server listening on http://localhost:${port}`);
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      throw error;
    }
  });
};

startServer(DEFAULT_PORT);
