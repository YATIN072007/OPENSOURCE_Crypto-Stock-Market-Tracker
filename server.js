require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 30 }); // 30 seconds cache

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const ALPHA_KEY = process.env.ALPHAVANTAGE_KEY;

// Connected SSE clients
const clients = [];

// Helper to send data to all clients
function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (e) {
      console.error('Broadcast error:', e.message);
    }
  });
}

// GET /api/crypto-price
app.get('/api/crypto-price', async (req, res) => {
  const ids = req.query.ids || 'bitcoin,ethereum,dogecoin';
  const vs = req.query.vs || 'usd';
  const cacheKey = `cg_${ids}_${vs}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price`;
    const response = await axios.get(url, {
      params: {
        ids,
        vs_currencies: vs,
        include_24hr_change: true
      }
    });
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'CoinGecko fetch failed', details: err.message });
  }
});

// GET /api/stock-quote
app.get('/api/stock-quote', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const cacheKey = `av_quote_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  if (!ALPHA_KEY) {
    return res.json({
      'Global Quote': {
        '01. symbol': symbol,
        '05. price': (Math.random() * 200 + 100).toFixed(2),
        '08. previous close': (Math.random() * 200 + 100).toFixed(2)
      }
    });
  }

  try {
    const url = `https://www.alphavantage.co/query`;
    const response = await axios.get(url, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: ALPHA_KEY
      }
    });
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AlphaVantage fetch failed', details: err.message });
  }
});

// SSE Stream endpoint
app.get('/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  const clientId = Date.now() + Math.random();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) clients.splice(idx, 1);
    console.log(`Client ${clientId} disconnected`);
  });

  console.log(`Client ${clientId} connected`);
});

// Polling function - fetches data and broadcasts
async function fetchAndBroadcast() {
  try {
    const ts = Date.now();

    // Fetch crypto
    const cryptoIds = 'bitcoin,ethereum,dogecoin';
    const cgKey = `cg_${cryptoIds}_usd`;
    let cryptoData = cache.get(cgKey);
    if (!cryptoData) {
      const cgRes = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: cryptoIds,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });
      cryptoData = cgRes.data;
      cache.set(cgKey, cryptoData);
    }

    // Fetch stocks
    const stockSymbols = ['MSFT', 'AAPL'];
    const stocksOut = {};
    for (const sym of stockSymbols) {
      const sKey = `av_quote_${sym}`;
      let stockData = cache.get(sKey);
      if (!stockData) {
        if (!ALPHA_KEY) {
          stockData = {
            'Global Quote': {
              '01. symbol': sym,
              '05. price': (Math.random() * 200 + 100).toFixed(2),
              '08. previous close': (Math.random() * 200 + 100).toFixed(2)
            }
          };
        } else {
          const avRes = await axios.get('https://www.alphavantage.co/query', {
            params: {
              function: 'GLOBAL_QUOTE',
              symbol: sym,
              apikey: ALPHA_KEY
            }
          });
          stockData = avRes.data;
        }
        cache.set(sKey, stockData);
      }
      stocksOut[sym] = stockData;
    }

    const payload = { ts, crypto: cryptoData, stocks: stocksOut };
    broadcast(payload);
  } catch (err) {
    console.error('Broadcast error:', err.message);
  }
}

// Poll every 20 seconds
fetchAndBroadcast();
setInterval(fetchAndBroadcast, 20000);

app.get('/', (req, res) => {
  res.json({ status: 'Backend running' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
