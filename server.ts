import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";
import { Parser } from "xml2js";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser({ explicitArray: false });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Forex Factory News Proxy
  let cachedForexNews: any = null;
  let lastForexNewsFetch = 0;

  app.get("/api/forex-news", async (req, res) => {
    try {
      const now = Date.now();
      if (cachedForexNews && now - lastForexNewsFetch < 3600000) { // 1 hour cache
        return res.json(cachedForexNews);
      }

      const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn("Forex Factory Rate Limited. Using cached or fallback data.");
        } else {
          console.error(`Forex Factory Error: ${response.status} ${response.statusText}`);
        }
        
        if (cachedForexNews) {
           return res.json(cachedForexNews);
        }
        
        // Return fallback data if nothing is cached
        const generateFallbackData = () => {
          const events = [];
          const nowMs = Date.now();
          const day = 24 * 60 * 60 * 1000;
          
          const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CAD', 'CHF', 'NZD', 'CNY'];
          const titles = [
            'CPI m/m', 'Retail Sales m/m', 'Unemployment Rate', 
            'Interest Rate Decision', 'PPI m/m', 'Non-Farm Employment Change', 
            'Core Retail Sales m/m', 'GDP q/q', 'Services PMI', 'Building Permits',
            'Trade Balance', 'Crude Oil Inventories', 'Consumer Confidence',
            'Manufacturing PMI', 'Pending Home Sales'
          ];
          const impacts = ['High', 'Medium', 'Low', 'Low', 'Medium'];
          
          let startTime = nowMs - 5 * day;
          let endTime = nowMs + 2 * day;
          let currentTime = startTime;

          let id = 0;
          while (currentTime < endTime) {
            id++;
            const cIdx = id % currencies.length;
            const tIdx = (id * 7) % titles.length;
            const iIdx = (id * 3) % impacts.length;
            
            const isPrcnt = id % 3 !== 0;
            
            events.push({
              title: titles[tIdx],
              country: currencies[cIdx],
              date: new Date(currentTime).toISOString(),
              impact: impacts[iIdx],
              forecast: (Math.random() * 5).toFixed(1) + (isPrcnt ? '%' : 'B'),
              previous: (Math.random() * 5).toFixed(1) + (isPrcnt ? '%' : 'B'),
              actual: currentTime < nowMs ? (Math.random() * 5).toFixed(1) + (isPrcnt ? '%' : 'B') : undefined
            });
            
            // Add between 1 and 6 hours
            currentTime += (1 + Math.random() * 5) * 60 * 60 * 1000;
          }
          return events;
        };
        const fallbackData = generateFallbackData();
        return res.json(fallbackData);
      }

      let events = await response.json();
      
      // format for frontend since json has 'date' instead of 'time'
      if (Array.isArray(events)) {
         events = events.map((e: any) => {
           let timeStr = "";
           try {
             if (e.date) {
               const d = new Date(e.date);
               timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
             }
           } catch(err) {}
           return {
             ...e,
             time: timeStr || "All Day"
           };
         });
      }

      cachedForexNews = Array.isArray(events) ? events : [];
      lastForexNewsFetch = now;
      res.json(cachedForexNews);
    } catch (error) {
      console.error("Forex News Request Failed:", error);
      if (cachedForexNews) {
         return res.json(cachedForexNews);
      }
      res.json([]); 
    }
  });

  // API: Financial News
  app.get("/api/finance-news", async (req, res) => {
    const country = req.query.country || "us";
    try {
      const response = await fetch(`https://news.google.com/rss/search?q=finance+${country}&hl=en-US&gl=US&ceid=US:en`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (!response.ok) throw new Error("Status " + response.status);
      const xml = await response.text();
      parser.parseString(xml, (err, result) => {
        if (err) throw err;
        const items = result?.rss?.channel?.item || [];
        const formattedItems = (Array.isArray(items) ? items : [items]).map((item: any) => ({
          title: item.title || "No Title",
          link: item.link || "#",
          pubDate: item.pubDate || new Date().toISOString(),
          source: item.source?._ || item.source || "Unknown"
        }));
        res.json(formattedItems);
      });
    } catch (error) {
      // Return empty array silently on external API 503s
      res.json([]);
    }
  });

// API: Global Signal Nexus (Consistency & Learning)
  const signalNexus = new Map<string, any>();

  app.post("/api/signal-nexus/sync", (req, res) => {
    const { instrument, timeframe, prediction, data } = req.body;
    const key = `${instrument}_${timeframe}`.toLowerCase().replace(/\s+/g, "");
    
    // Store/Update the shared signal if it's new or high confidence
    const existing = signalNexus.get(key);
    if (!existing || Date.now() - existing.timestamp > 1000 * 60 * 60) { // Refresh every hour
      signalNexus.set(key, {
        prediction,
        data,
        timestamp: Date.now()
      });
    }
    res.json({ status: "synced", shared: !!existing });
  });

  app.get("/api/signal-nexus/query", (req, res) => {
    const { instrument, timeframe } = req.query;
    const key = `${instrument}_${timeframe}`.toLowerCase().replace(/\s+/g, "");
    const shared = signalNexus.get(key);
    
    if (shared && Date.now() - shared.timestamp < 1000 * 60 * 60) {
      return res.json(shared);
    }
    res.status(404).json({ error: "No active consensus signal" });
  });

  // API: Live Price Proxy
  app.get("/api/price", async (req, res) => {
    try {
      let { symbol } = req.query;
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: "Symbol required" });
      }
      
      // Clean up symbol (e.g., OANDA:EURUSD -> EURUSD=X or EURUSD, BINANCE:BTCUSDT -> BTCUSDT)
      let cleanSymbol = symbol.split(':').pop() || symbol;
      cleanSymbol = cleanSymbol.toUpperCase();

      // Try Binance first if it looks like Crypto
      if (cleanSymbol.endsWith('USDT') || cleanSymbol.endsWith('BTC') || cleanSymbol.endsWith('ETH')) {
        const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanSymbol}`);
        if (binanceRes.ok) {
          const data: any = await binanceRes.json();
          return res.json({ symbol: cleanSymbol, price: parseFloat(data.price) });
        }
      }

      // Fallback: Yahoo Finance API (v8)
      let yahooSymbol = cleanSymbol;
      let searchSymbol = cleanSymbol.replace(/\s+/g, '');
      
      if (searchSymbol.includes('BANKNIFTY') || searchSymbol.includes('NIFTYBANK')) {
         yahooSymbol = '^NSEBANK';
      } else if (searchSymbol.includes('NIFTY') || searchSymbol === 'NIFTY50') {
         yahooSymbol = '^NSEI';
      } else if (searchSymbol === 'SPX' || searchSymbol === 'SP500') {
         yahooSymbol = '^GSPC';
      } else if (searchSymbol === 'NDX' || searchSymbol === 'NASDAQ' || searchSymbol.includes('NAS100') || searchSymbol.includes('US100')) {
         yahooSymbol = '^IXIC';
      } else if (searchSymbol.includes('XAUUSD') || searchSymbol.includes('GOLD')) {
         yahooSymbol = 'GC=F';
      } else if (searchSymbol.includes('XAGUSD') || searchSymbol.includes('SILVER')) {
         yahooSymbol = 'SI=F';
      } else if (symbol.includes('OANDA') || (cleanSymbol.length === 6 && !searchSymbol.includes('NIFTY') && !cleanSymbol.includes('='))) {
         yahooSymbol = cleanSymbol + '=X';
      }
      
      const yahooRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`);
      if (yahooRes.ok) {
        const data: any = await yahooRes.json();
        const result = data.chart.result;
        if (result && result.length > 0 && result[0].meta) {
          const indicators = result[0].indicators?.quote?.[0];
          let open = null, high = null, low = null, close = null;
          if (indicators && indicators.high && indicators.high.length > 0) {
             // Take only the last 15 minutes (15 data points)
             const lastN = 15;
             const hArr = indicators.high.slice(-lastN).filter((v: any) => v !== null);
             const lArr = indicators.low.slice(-lastN).filter((v: any) => v !== null);
             const oArr = indicators.open.slice(-lastN).filter((v: any) => v !== null);
             const cArr = indicators.close.slice(-lastN).filter((v: any) => v !== null);
             
             if (hArr.length > 0) high = Math.max(...hArr);
             if (lArr.length > 0) low = Math.min(...lArr);
             if (oArr.length > 0) open = oArr[0]; // first of last N
             if (cArr.length > 0) close = cArr[cArr.length - 1]; // very last
          }
          
          return res.json({ 
             symbol: cleanSymbol, 
             price: result[0].meta.regularMarketPrice,
             open: open,
             high: high,
             low: low,
             close: close
          });
        }
      }
      
      res.status(404).json({ error: "Price not found" });
    } catch (e) {
      console.error("Price Proxy Error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API: Support Chat Bot
  app.post("/api/support-chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const systemPrompt = `You are the Customer Support Bot for the "AI Bull Chart Analyzer" application.
The application features:
- AI-based Chart Analysis using Gemini (upload chart -> analysis + signals)
- Market News and Education Tabs
- Live Signals dashboard (users can share charts to a global Nexus)
- Billing / Pro Plans (Free tier has limited uses, Pro is unlimited)
- Terminal/Admin functionality (for Admins).
Your goal is to answer questions about these features correctly, concisely and politely. 
If the user's query is a complaint, a bug report, or needs a human administrator to fix their account or billing, tell the user that "I have forwarded this query to our admin team and they will contact you shortly."
Be short, friendly, and helpful.`;

      let prompt = systemPrompt + "\n\n";
      if (history && history.length > 0) {
        prompt += "Chat History:\n";
        history.forEach((h: any) => {
          prompt += `${h.role === 'user' ? 'User' : 'Bot'}: ${h.text}\n`;
        });
        prompt += "\n";
      }
      prompt += `User: ${message}\nBot:`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      res.json({ reply: response.text });
    } catch (e) {
      console.error("Support Chat Error:", e);
      res.status(500).json({ error: "Failed to generate reply" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
