import React, { useEffect, useState } from "react";
import { Clock, Globe, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";

interface ForexEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export default function MarketNews() {
  const [forexEvents, setForexEvents] = useState<ForexEvent[]>([]);
  const [financeNews, setFinanceNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const [forexRes, financeRes] = await Promise.all([
          fetch("/api/forex-news"),
          fetch("/api/finance-news?country=us")
        ]);
        const forexData = await forexRes.json();
        const financeData = await financeRes.json();
        setForexEvents(Array.isArray(forexData) ? forexData : [forexData]);
        setFinanceNews(financeData);
      } catch (err) {
        console.error("Failed to fetch news", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNews();
  }, []);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6">
      {/* Forex Calendar */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="text-blue-500 w-5 h-5" />
            Forex Factory Calendar
          </h2>
          <div className="text-[10px] font-mono opacity-50 bg-white/5 px-2 py-1 rounded">
            SYNCED // {userTimeZone}
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden bg-white/5 border-white/10">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] opacity-60">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Event</th>
                <th className="p-3 text-center">Impact</th>
                <th className="p-3">Forecast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-4 bg-white/2" />
                  </tr>
                ))
              ) : forexEvents.map((event, idx) => (
                <tr key={idx} className="hover:bg-white/2 transition-colors">
                  <td className="p-3 text-slate-400">{event.time}</td>
                  <td className="p-3 font-bold">{event.country}</td>
                  <td className="p-3 uppercase">{event.title}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      event.impact === "High" ? "bg-red-500/20 text-red-400" :
                      event.impact === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>
                      {event.impact}
                    </span>
                  </td>
                  <td className="p-3 text-blue-400">{event.forecast || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relevant Finance News */}
      <div className="lg:col-span-5 space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="text-blue-500 w-5 h-5" />
          Global Finance Pulse
        </h2>

        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))
          ) : financeNews.map((news, idx) => (
            <motion.a
              key={idx}
              href={news.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="block p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  {news.source}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {news.pubDate ? format(new Date(news.pubDate), "MMM dd, HH:mm") : ""}
                </span>
              </div>
              <h3 className="text-sm font-semibold group-hover:text-blue-400 transition-colors leading-relaxed">
                {news.title.split(" - ")[0]}
              </h3>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
}
