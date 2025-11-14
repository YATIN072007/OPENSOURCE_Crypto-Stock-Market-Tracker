const express = require('express');
const axios = require('axios');
const cache = require('../utils/cache');

const router = express.Router();
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;

// GET /api/crypto-price?ids=bitcoin,ethereum&vs=usd
router.get('/crypto-price', async (req, res) => {
  const ids = req.query.ids || 'bitcoin,ethereum';
  const vs = req.query.vs || 'usd';
  const key = `cg:${ids}:${vs}`;
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  try {
    const r = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids,
        vs_currencies: vs,
        include_24hr_change: true
      },
      timeout: 10000
    });
    cache.set(key, r.data);
    return res.json(r.data);
  } catch (err) {
    return res.status(502).json({ error: 'CoinGecko fetch failed', details: err.message });
  }
});

// GET /api/stock-quote?symbol=MSFT
router.get('/stock-quote', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const key = `av:quote:${symbol}`;
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  if (!ALPHA_KEY) {
    return res.status(400).json({ error: 'Alpha Vantage API key not configured (ALPHA_VANTAGE_KEY)' });
  }

  try {
    const r = await axios.get('https://www.alphavantage.co/query', {
      params: { function: 'GLOBAL_QUOTE', symbol, apikey: ALPHA_KEY },
      timeout: 15000
    });
    cache.set(key, r.data);
    return res.json(r.data);
  } catch (err) {
    return res.status(502).json({ error: 'AlphaVantage fetch failed', details: err.message });
  }
});

// GET /api/crypto-history?coin=bitcoin&days=1 (CoinGecko market_chart)
router.get('/crypto-history', async (req, res) => {
  const coin = req.query.coin || 'bitcoin';
  const days = req.query.days || '1';
  const key = `cg:h:${coin}:${days}`;
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  try {
    const r = await axios.get(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin)}/market_chart`, {
      params: { vs_currency: 'usd', days },
      timeout: 15000
    });
    cache.set(key, r.data);
    return res.json(r.data);
  } catch (err) {
    return res.status(502).json({ error: 'CoinGecko history fetch failed', details: err.message });
  }
});

module.exports = router;
