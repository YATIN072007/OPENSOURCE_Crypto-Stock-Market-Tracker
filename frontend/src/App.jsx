import Navbar from './components/navbar';
import React, { useEffect, useRef, useState, useMemo } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function isCrypto(input) { return /^[a-z0-9\-]+$/.test(input); }
function isStock(input) { return /^[A-Z.]+$/.test(input); }

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const calculateSMA = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
};

const calculateEMA = (data, period) => {
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  result.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    result.push(ema);
  }
  return result;
};

export default function App({ user, onSignOut, onUpdateProfile }) {
  const [theme, setTheme] = useState("dark");
  const [watchlist, setWatchlist] = useState(() => (
    JSON.parse(localStorage.getItem("watchlist") || '["bitcoin","ethereum","MSFT"]')
  ));
  const [tickers, setTickers] = useState({});
  const [series, setSeries] = useState({});
  const [searchText, setSearchText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const evtRef = useRef(null);

  const [activeTab, setActiveTab] = useState('market');
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('portfolio');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [virtualCash, setVirtualCash] = useState(() => {
    const saved = localStorage.getItem('virtualCash');
    return saved ? parseFloat(saved) : 100000;
  });
  const [portfolioHistory, setPortfolioHistory] = useState(() => {
    const saved = localStorage.getItem('portfolioHistory');
    return saved ? JSON.parse(saved) : [{ timestamp: Date.now(), value: 100000 }];
  });
  const [tradeModal, setTradeModal] = useState({ isOpen: false, asset: null, type: 'buy' });

  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [smaPeriod, setSMAPeriod] = useState(20);
  const [emaPeriod, setEMAPeriod] = useState(12);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("virtualCash", virtualCash.toString());
  }, [virtualCash]);

  useEffect(() => {
    localStorage.setItem("portfolioHistory", JSON.stringify(portfolioHistory));
  }, [portfolioHistory]);

  useEffect(() => {
    const s = new EventSource(`${API_BASE}/stream`);
    evtRef.current = s;
    s.onopen = () => setIsConnected(true);
    s.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      const cg = payload.crypto;
      const stocks = payload.stocks;

      let nextTickers = {};
      watchlist.forEach((symbol) => {
        if (cg[symbol?.toLowerCase()]) {
          const c = cg[symbol.toLowerCase()];
          nextTickers[symbol] = {
            price: c.usd,
            change: c.usd_24h_change,
          };
          setSeries(prev => ({
            ...prev,
            [symbol]: [...(prev[symbol] || []).slice(-400), { x: new Date(payload.ts), y: c.usd }],
          }));
        } else if (stocks[symbol]) {
          const q = stocks[symbol]?.["Global Quote"];
          if (q) {
            let price = parseFloat(q["05. price"] || 0);
            let prevClose = parseFloat(q["08. previous close"] || 0);
            let change = prevClose ? ((price - prevClose) / prevClose) * 100 : null;
            nextTickers[symbol] = { price, change };
            setSeries(prev => ({
              ...prev,
              [symbol]: [...(prev[symbol] || []).slice(-400), { x: new Date(payload.ts), y: price }],
            }));
          }
        }
      });
      setTickers(nextTickers);
    };
    s.onerror = () => { setIsConnected(false); s.close(); };
    return () => s.close();
  }, [watchlist]);

  async function handleAdd(e) {
    e.preventDefault();
    const raw = searchText.trim();
    if (!raw) return;
    let symbol = raw;
    let isValid = false;
    if (isCrypto(symbol)) {
      try {
        const res = await axios.get(`${API_BASE}/api/crypto-price?ids=${symbol}&vs=usd`);
        if (res.data[symbol]) isValid = true;
      } catch { }
    }
    if (isStock(symbol)) {
      try {
        const res = await axios.get(`${API_BASE}/api/stock-quote?symbol=${symbol}`);
        if (res.data["Global Quote"] && res.data["Global Quote"]["05. price"]) isValid = true;
      } catch { }
    }
    if (isValid && !watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
      setSearchText("");
    } else {
      alert("Asset not found or already in watchlist");
    }
  }

  function remove(symbol) {
    setWatchlist(watchlist.filter(s => s !== symbol));
    setSeries(prev => {
      const out = { ...prev }; delete out[symbol]; return out;
    });
  }

  const executeTrade = (symbol, type, quantity, price) => {
    const totalCost = quantity * price;

    if (type === 'buy') {
      if (totalCost > virtualCash) {
        alert("Insufficient funds!");
        return false;
      }

      setVirtualCash(prev => prev - totalCost);

      const existingIndex = portfolio.findIndex(p => p.symbol === symbol);
      if (existingIndex >= 0) {
        const existing = portfolio[existingIndex];
        const newQuantity = existing.quantity + quantity;
        const newAvgPrice = ((existing.avgPrice * existing.quantity) + totalCost) / newQuantity;

        setPortfolio(prev => [
          ...prev.slice(0, existingIndex),
          { ...existing, quantity: newQuantity, avgPrice: newAvgPrice },
          ...prev.slice(existingIndex + 1)
        ]);
      } else {
        setPortfolio(prev => [...prev, { symbol, quantity, avgPrice: price, type: isCrypto(symbol) ? 'crypto' : 'stock' }]);
      }
    } else {
      const holdingIndex = portfolio.findIndex(p => p.symbol === symbol);
      if (holdingIndex < 0) {
        alert("You don't own this asset!");
        return false;
      }

      const holding = portfolio[holdingIndex];
      if (quantity > holding.quantity) {
        alert(`You only have ${holding.quantity.toFixed(4)} units!`);
        return false;
      }

      setVirtualCash(prev => prev + totalCost);

      const newQuantity = holding.quantity - quantity;
      if (newQuantity === 0) {
        setPortfolio(prev => prev.filter((_, i) => i !== holdingIndex));
      } else {
        setPortfolio(prev => [
          ...prev.slice(0, holdingIndex),
          { ...holding, quantity: newQuantity },
          ...prev.slice(holdingIndex + 1)
        ]);
      }
    }

    setTransactions(prev => [{
      id: Date.now(),
      symbol,
      type,
      quantity,
      price,
      total: totalCost,
      timestamp: new Date().toISOString()
    }, ...prev]);

    setTradeModal({ isOpen: false, asset: null, type: 'buy' });
    return true;
  };

  const portfolioMetrics = useMemo(() => {
    let totalValue = virtualCash;
    let totalPnL = 0;
    let totalInvested = 100000;

    const holdings = portfolio.map(holding => {
      const currentPrice = tickers[holding.symbol]?.price || holding.avgPrice;
      const currentValue = holding.quantity * currentPrice;
      const costBasis = holding.quantity * holding.avgPrice;
      const pnl = currentValue - costBasis;

      totalValue += currentValue;
      totalPnL += pnl;

      return {
        ...holding,
        currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPercent: (pnl / costBasis) * 100
      };
    });

    return {
      totalValue,
      totalPnL,
      totalPnLPercent: ((totalValue - totalInvested) / totalInvested) * 100,
      holdings
    };
  }, [portfolio, tickers, virtualCash]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPortfolioHistory(prev => {
        const newHistory = [...prev, {
          timestamp: Date.now(),
          value: portfolioMetrics.totalValue
        }].slice(-1440);
        return newHistory;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [portfolioMetrics.totalValue]);

  const colorMap = { bitcoin: "#f7931a", ethereum: "#627eea", MSFT: "#1b7cec", AAPL: "#15c478" };

  const TradeModal = () => {
    const [quantity, setQuantity] = useState(1);
    if (!tradeModal.isOpen) return null;

    const { asset, type } = tradeModal;
    const currentPrice = tickers[asset]?.price || 0;
    const holding = portfolio.find(p => p.symbol === asset);
    const maxSell = holding ? holding.quantity : 0;
    const totalCost = quantity * currentPrice;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-indigo-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-2xl font-bold ${type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
              {type === 'buy' ? '📈 Buy' : '📉 Sell'} {asset.toUpperCase()}
            </h3>
            <button onClick={() => setTradeModal({ isOpen: false, asset: null, type: 'buy' })}
              className="text-gray-400 hover:text-white text-2xl">×</button>
          </div>

          <div className="space-y-4 mb-6 bg-slate-700/50 p-4 rounded-xl">
            <div className="flex justify-between">
              <span className="text-gray-300">Current Price:</span>
              <span className="font-bold text-white">{formatCurrency(currentPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Your Holdings:</span>
              <span className="font-bold text-white">{maxSell.toFixed(4)} {asset.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Available Cash:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(virtualCash)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-700 text-white border-2 border-indigo-500 rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            <div className="bg-indigo-900/30 p-4 rounded-xl">
              <div className="flex justify-between text-lg">
                <span className="text-gray-300">Total:</span>
                <span className="font-black text-white text-2xl">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <button
              onClick={() => executeTrade(asset, type, quantity, currentPrice)}
              disabled={quantity <= 0 || (type === 'sell' && quantity > maxSell) || (type === 'buy' && totalCost > virtualCash)}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${type === 'buy' ? 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400'
                  : 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400'
                }`}
            >
              Confirm {type === 'buy' ? 'Purchase' : 'Sale'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PortfolioGrowthChart = () => {
    const timestamps = portfolioHistory.map(p => new Date(p.timestamp));
    const values = portfolioHistory.map(p => p.value);
    const initialValue = portfolioHistory[0]?.value || 100000;
    const currentValue = values[values.length - 1] || initialValue;
    const isProfit = currentValue >= initialValue;
    const changePercent = ((currentValue - initialValue) / initialValue * 100).toFixed(2);

    return (
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-indigo-900 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">📈 Portfolio Growth</h3>
            <p className="text-sm text-gray-400">Your portfolio performance over time</p>
          </div>
          <div className="text-right bg-slate-800/70 p-4 rounded-xl border border-indigo-800">
            <div className="text-sm text-gray-400 mb-1">Current Value</div>
            <div className="text-3xl font-black text-white mb-2">{formatCurrency(currentValue)}</div>
            <div className={`text-base font-bold flex items-center justify-end gap-2 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="text-xl">{isProfit ? '↗' : '↘'}</span>
              <span>{isProfit ? '+' : ''}{formatCurrency(currentValue - initialValue)}</span>
              <span className="text-sm">({isProfit ? '+' : ''}{changePercent}%)</span>
            </div>
          </div>
        </div>
        <Plot
          data={[{
            x: timestamps,
            y: values,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            name: 'Portfolio Value',
            line: {
              color: isProfit ? '#10B981' : '#EF4444',
              width: 4,
              shape: 'spline'
            },
            fillcolor: isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            hovertemplate:
              '<b>Portfolio Value</b><br>' +
              'Value: $%{y:,.2f}<br>' +
              'Time: %{x|%B %d, %Y %H:%M}<br>' +
              '<extra></extra>',
          },
          {
            x: [timestamps[0], timestamps[timestamps.length - 1]],
            y: [initialValue, initialValue],
            type: 'scatter',
            mode: 'lines',
            name: 'Initial Value',
            line: {
              color: '#94A3B8',
              width: 2,
              dash: 'dash'
            },
            hovertemplate:
              '<b>Initial Investment</b><br>' +
              'Value: $%{y:,.2f}<br>' +
              '<extra></extra>',
          }
          ]}
          layout={{
            margin: { t: 20, b: 60, l: 80, r: 40 },
            height: 350,
            showlegend: true,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(15, 23, 42, 0.95)',
            font: {
              color: '#E2E8F0',
              size: 13,
              family: 'Inter, system-ui, sans-serif'
            },
            legend: {
              orientation: 'h',
              x: 0,
              y: -0.15,
              bgcolor: 'rgba(30, 41, 59, 0.9)',
              bordercolor: '#475569',
              borderwidth: 1,
              font: { size: 12, color: '#F1F5F9' }
            },
            xaxis: {
              showgrid: true,
              gridcolor: 'rgba(71, 85, 105, 0.2)',
              color: '#94A3B8',
              title: {
                text: 'Time',
                font: { size: 12, color: '#CBD5E1' }
              },
              tickfont: { size: 11 }
            },
            yaxis: {
              showgrid: true,
              gridcolor: 'rgba(71, 85, 105, 0.2)',
              color: '#94A3B8',
              title: {
                text: 'Portfolio Value (USD)',
                font: { size: 13, color: '#CBD5E1' }
              },
              tickformat: '$,.2f',
              tickfont: { size: 12 }
            },
            hovermode: 'x unified',
            hoverlabel: {
              bgcolor: 'rgba(15, 23, 42, 0.95)',
              bordercolor: '#475569',
              font: { size: 12, color: '#F1F5F9' }
            }
          }}
          config={{
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            toImageButtonOptions: {
              format: 'png',
              filename: 'portfolio_growth',
              height: 600,
              width: 1000,
              scale: 2
            }
          }}
          useResizeHandler
          style={{ width: '100%' }}
        />
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white" : "bg-gray-100 text-gray-900"}`}>

      <Navbar
        user={user}
        onSignOut={onSignOut}
        onUpdateProfile={onUpdateProfile}
        watchlistCount={watchlist.length}
        watchlist={watchlist}
        tickers={tickers}
        onRemoveFromWatchlist={remove}
      />

      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-indigo-200 mb-1">Portfolio Value</div>
            <div className="text-xl font-black text-white">{formatCurrency(portfolioMetrics.totalValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-indigo-200 mb-1">Total P&L</div>
            <div className={`text-xl font-black ${portfolioMetrics.totalPnL >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {portfolioMetrics.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.totalPnL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-indigo-200 mb-1">Cash Available</div>
            <div className="text-xl font-black text-emerald-300">{formatCurrency(virtualCash)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-indigo-200 mb-1">Holdings</div>
            <div className="text-xl font-black text-white">{portfolio.length}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-2 border-b-2 border-indigo-900">
          <button
            onClick={() => setActiveTab('market')}
            className={`px-6 py-3 font-bold transition ${activeTab === 'market' ? 'text-indigo-400 border-b-4 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
          >
            📊 Market
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-6 py-3 font-bold transition ${activeTab === 'portfolio' ? 'text-indigo-400 border-b-4 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
          >
            💼 Portfolio
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-bold transition ${activeTab === 'history' ? 'text-indigo-400 border-b-4 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
          >
            📜 History
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8">

        {activeTab === 'market' && (
          <div className="flex flex-wrap gap-6">
            <aside className="w-full sm:w-80 flex-shrink-0 space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-800 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></div>
                    <span className="text-xs opacity-80">{isConnected ? "Live" : "Offline"}</span>
                  </div>
                  <span className="text-xs opacity-70">{new Date().toLocaleTimeString()}</span>
                </div>
                <form onSubmit={handleAdd} className="flex gap-2">
                  <input
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Add asset..."
                    className="flex-1 rounded-xl px-3 py-2 bg-slate-800 text-white border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">+</button>
                </form>
              </div>

              <div className="p-4 rounded-xl bg-slate-800 border border-indigo-900 shadow-xl space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-lg">Watchlist</span>
                  <span className="text-xs opacity-60 bg-indigo-900 px-2 py-1 rounded-full">{watchlist.length}</span>
                </div>
                {watchlist.map(symbol => (
                  <div key={symbol} className="group flex items-center justify-between rounded-xl px-3 py-3 bg-slate-900/60 hover:bg-indigo-900/40 transition border border-white/5">
                    <div className="flex-1">
                      <div className="font-bold">{symbol.toUpperCase()}</div>
                      <div className="text-sm opacity-70">{tickers[symbol]?.price ? formatCurrency(tickers[symbol].price) : "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-bold ${tickers[symbol]?.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {tickers[symbol]?.change !== undefined ?
                          (tickers[symbol].change >= 0 ? "+" : "") + tickers[symbol].change.toFixed(2) + "%" : "—"}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setTradeModal({ isOpen: true, asset: symbol, type: 'buy' })}
                          className="px-2 py-1 bg-emerald-600 rounded text-xs hover:bg-emerald-500">Buy</button>
                        <button onClick={() => setTradeModal({ isOpen: true, asset: symbol, type: 'sell' })}
                          className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-500">Sell</button>
                        <button onClick={() => remove(symbol)} className="text-xs text-gray-300 hover:text-red-500">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="flex-1 space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-indigo-900 shadow-2xl">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="text-sm opacity-70 mb-1">Market Overview</div>
                    <div className="text-3xl font-black">Live Prices (24h)</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSMA(!showSMA)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${showSMA ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-gray-400'}`}
                    >
                      SMA({smaPeriod})
                    </button>
                    <button
                      onClick={() => setShowEMA(!showEMA)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${showEMA ? 'bg-pink-600 text-white' : 'bg-slate-700 text-gray-400'}`}
                    >
                      EMA({emaPeriod})
                    </button>
                  </div>
                </div>
                <Plot
                  data={[
                    ...watchlist.map((symbol, idx) => {
                      const dataPoints = (series[symbol] || []);
                      const yValues = dataPoints.map(d => d.y);
                      const xValues = dataPoints.map(d => d.x);

                      const colors = {
                        bitcoin: { line: '#F7931A', fill: 'rgba(247, 147, 26, 0.1)' },
                        ethereum: { line: '#627EEA', fill: 'rgba(98, 126, 234, 0.1)' },
                        dogecoin: { line: '#C2A633', fill: 'rgba(194, 166, 51, 0.1)' },
                        MSFT: { line: '#00A4EF', fill: 'rgba(0, 164, 239, 0.1)' },
                        AAPL: { line: '#A6B1B7', fill: 'rgba(166, 177, 183, 0.1)' },
                        GOOGL: { line: '#4285F4', fill: 'rgba(66, 133, 244, 0.1)' },
                        TSLA: { line: '#E82127', fill: 'rgba(232, 33, 39, 0.1)' },
                      };

                      const colorPalette = [
                        '#F7931A', '#627EEA', '#10B981', '#F59E0B', '#EF4444',
                        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                      ];

                      const symbolColor = colors[symbol] || {
                        line: colorPalette[idx % colorPalette.length],
                        fill: `rgba(${parseInt(colorPalette[idx % colorPalette.length].slice(1, 3), 16)}, ${parseInt(colorPalette[idx % colorPalette.length].slice(3, 5), 16)}, ${parseInt(colorPalette[idx % colorPalette.length].slice(5, 7), 16)}, 0.1)`
                      };

                      const traces = [{
                        x: xValues,
                        y: yValues,
                        type: 'scatter',
                        mode: 'lines',
                        name: symbol.toUpperCase(),
                        line: {
                          color: symbolColor.line,
                          width: 4,
                          shape: 'spline'
                        },
                        fill: 'tonexty',
                        fillcolor: symbolColor.fill,
                        hovertemplate:
                          `<b>${symbol.toUpperCase()}</b><br>` +
                          'Price: $%{y:,.2f}<br>' +
                          'Time: %{x|%H:%M:%S}<br>' +
                          '<extra></extra>',
                      }];

                      if (showSMA && yValues.length >= smaPeriod) {
                        const smaValues = calculateSMA(yValues, smaPeriod);
                        traces.push({
                          x: xValues.slice(smaPeriod - 1),
                          y: smaValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: `${symbol.toUpperCase()} SMA(${smaPeriod})`,
                          line: {
                            color: '#06B6D4',
                            width: 2.5,
                            dash: 'dash'
                          },
                          hovertemplate:
                            `<b>${symbol.toUpperCase()} SMA</b><br>` +
                            'Value: $%{y:,.2f}<br>' +
                            '<extra></extra>',
                        });
                      }

                      if (showEMA && yValues.length >= emaPeriod) {
                        const emaValues = calculateEMA(yValues, emaPeriod);
                        traces.push({
                          x: xValues,
                          y: emaValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: `${symbol.toUpperCase()} EMA(${emaPeriod})`,
                          line: {
                            color: '#EC4899',
                            width: 2.5,
                            dash: 'dot'
                          },
                          hovertemplate:
                            `<b>${symbol.toUpperCase()} EMA</b><br>` +
                            'Value: $%{y:,.2f}<br>' +
                            '<extra></extra>',
                        });
                      }

                      return traces;
                    }).flat()
                  ]}
                  layout={{
                    margin: { t: 40, b: 60, l: 80, r: 40 },
                    height: 500,
                    showlegend: true,
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(15, 23, 42, 0.95)',
                    font: {
                      color: '#E2E8F0',
                      size: 14,
                      family: 'Inter, system-ui, sans-serif'
                    },
                    legend: {
                      orientation: 'v',
                      x: 1.02,
                      y: 1,
                      xanchor: 'left',
                      bgcolor: 'rgba(30, 41, 59, 0.9)',
                      bordercolor: '#475569',
                      borderwidth: 1,
                      font: { size: 13, color: '#F1F5F9' }
                    },
                    xaxis: {
                      showgrid: true,
                      gridcolor: 'rgba(71, 85, 105, 0.3)',
                      color: '#94A3B8',
                      title: {
                        text: 'Time',
                        font: { size: 13, color: '#CBD5E1' }
                      },
                      tickfont: { size: 12 }
                    },
                    yaxis: {
                      showgrid: true,
                      gridcolor: 'rgba(71, 85, 105, 0.3)',
                      color: '#94A3B8',
                      title: {
                        text: 'Price (USD)',
                        font: { size: 13, color: '#CBD5E1' }
                      },
                      tickformat: '$,.2f',
                      tickfont: { size: 12 },
                      type: 'log',        
                      autorange: true,    
                      dtick: 1
                    },
                    hovermode: 'x unified',
                    hoverlabel: {
                      bgcolor: 'rgba(15, 23, 42, 0.95)',
                      bordercolor: '#475569',
                      font: { size: 13, color: '#F1F5F9' }
                    }
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                    toImageButtonOptions: {
                      format: 'png',
                      filename: 'fintrack_chart',
                      height: 800,
                      width: 1200,
                      scale: 2
                    }
                  }}
                  useResizeHandler
                  style={{ width: '100%' }}
                />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <PortfolioGrowthChart />

            <h2 className="text-3xl font-black">Your Holdings</h2>
            {portfolioMetrics.holdings.length === 0 ? (
              <div className="text-center p-12 bg-slate-800 rounded-2xl border-2 border-dashed border-indigo-900">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-xl text-gray-400 mb-2">Your portfolio is empty</p>
                <p className="text-gray-500">Go to Market tab to make your first trade!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {portfolioMetrics.holdings.map((holding, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl shadow-xl border-l-4 border-indigo-500 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black mb-1">{holding.symbol.toUpperCase()}</h3>
                      <p className="text-sm text-gray-400">Quantity: {holding.quantity.toFixed(4)}</p>
                      <p className="text-sm text-gray-400">Avg Cost: {formatCurrency(holding.avgPrice)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black mb-1">{formatCurrency(holding.currentValue)}</div>
                      <div className={`text-lg font-bold ${holding.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {holding.pnl >= 0 ? '+' : ''}{formatCurrency(holding.pnl)} ({holding.pnlPercent.toFixed(2)}%)
                      </div>
                      <button onClick={() => setTradeModal({ isOpen: true, asset: holding.symbol, type: 'sell' })}
                        className="mt-2 px-4 py-1 bg-red-600 rounded-lg text-sm hover:bg-red-500">Sell</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black">Transaction History</h2>
            {transactions.length === 0 ? (
              <div className="text-center p-12 bg-slate-800 rounded-2xl">
                <p className="text-xl text-gray-400">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${tx.type === 'buy' ? 'bg-emerald-900 text-emerald-200' : 'bg-red-900 text-red-200'}`}>
                        {tx.type.toUpperCase()}
                      </span>
                      <span className="ml-3 font-bold">{tx.symbol.toUpperCase()}</span>
                      <span className="ml-3 text-gray-400">{tx.quantity.toFixed(4)} @ {formatCurrency(tx.price)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(tx.total)}</div>
                      <div className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <TradeModal />
    </div>
  );
}
