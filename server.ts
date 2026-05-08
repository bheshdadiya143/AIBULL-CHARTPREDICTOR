import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";
import { Parser } from "xml2js";

const parser = new Parser({ explicitArray: false });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Forex Factory News Proxy
  app.get("/api/forex-news", async (req, res) => {
    try {
      const response = await fetch("https://www.forexfactory.com/ff_calendar_thisweek.xml", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/xml,application/xml,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      
      if (!response.ok) {
        console.error(`Forex Factory Error: ${response.status} ${response.statusText}`);
        // Fallback or empty data
        return res.json([]);
      }

      const xml = await response.text();
      parser.parseString(xml, (err, result) => {
        if (err) {
          console.error("XML Parse Error:", err);
          return res.json([]);
        }
        const events = result?.weeklyevents?.event || [];
        res.json(Array.isArray(events) ? events : [events]);
      });
    } catch (error) {
      console.error("Forex News Request Failed:", error);
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
      console.error("Finance News Error:", error);
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
