import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/t2r4';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB Schemas
const marketDataSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  volume: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const MarketData = mongoose.model('MarketData', marketDataSchema);

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'T2R4 Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/', (req, res) => {
  res.json({
    message: 'Welcome to T2R4 API',
    tech: ['Node.js', 'Express', 'MongoDB', 'TypeScript'],
    version: '1.0.0'
  });
});

// Market Data endpoints
app.get('/api/market', async (req, res) => {
  try {
    const marketData = await MarketData.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, data: marketData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch market data' });
  }
});

app.post('/api/market', async (req, res) => {
  try {
    const { symbol, price, volume } = req.body;

    if (!symbol || !price || !volume) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, price, volume'
      });
    }

    const marketData = new MarketData({ symbol, price, volume });
    const saved = await marketData.save();

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save market data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 T2R4 Server running on port ${PORT}`);
  console.log(`📊 Tech Stack: Node.js + Express + MongoDB`);
});

export default app;
