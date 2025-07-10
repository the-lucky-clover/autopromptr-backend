import express from 'express';
import cors from 'cors';
import { router } from './routes';

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Enable CORS for all routes
app.use(cors());

app.use(express.json());
app.use('/api', router);

// Add a basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
