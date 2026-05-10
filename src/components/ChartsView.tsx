import React, { useState } from "react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { Share2, MessageCircle, Send, Search } from "lucide-react";

const INSTRUMENTS = [
  // Forex Majors
  { symbol: "OANDA:EURUSD", label: "EUR/USD" },
  { symbol: "OANDA:GBPUSD", label: "GBP/USD" },
  { symbol: "OANDA:USDJPY", label: "USD/JPY" },
  { symbol: "OANDA:AUDUSD", label: "AUD/USD" },
  { symbol: "OANDA:USDCAD", label: "USD/CAD" },
  { symbol: "OANDA:USDCHF", label: "USD/CHF" },
  { symbol: "OANDA:NZDUSD", label: "NZD/USD" },
  // Forex Minors
  { symbol: "OANDA:EURGBP", label: "EUR/GBP" },
  { symbol: "OANDA:EURJPY", label: "EUR/JPY" },
  { symbol: "OANDA:GBPJPY", label: "GBP/JPY" },
  { symbol: "OANDA:AUDJPY", label: "AUD/JPY" },
  { symbol: "OANDA:EURAUD", label: "EUR/AUD" },
  { symbol: "OANDA:CADJPY", label: "CAD/JPY" },
  { symbol: "OANDA:CHFJPY", label: "CHF/JPY" },
  { symbol: "OANDA:EURNZD", label: "EUR/NZD" },
  { symbol: "OANDA:GBPAUD", label: "GBP/AUD" },
  // Commodities
  { symbol: "OANDA:XAUUSD", label: "Gold (XAU/USD)" },
  { symbol: "OANDA:XAGUSD", label: "Silver (XAG/USD)" },
  { symbol: "TVC:USOIL", label: "US Oil (WTI)" },
  { symbol: "TVC:UKOIL", label: "UK Oil (Brent)" },
  { symbol: "OANDA:XPTUSD", label: "Platinum" },
  { symbol: "OANDA:XCUUSD", label: "Copper" },
  { symbol: "TVC:NGAS", label: "Natural Gas" },
  // Indices
  { symbol: "CAPITALCOM:US30", label: "US30 (Dow Jones)" },
  { symbol: "CAPITALCOM:US100", label: "US100 (Nasdaq)" },
  { symbol: "CAPITALCOM:US500", label: "US500 (S&P 500)" },
  { symbol: "OANDA:GER30", label: "GER30 (DAX)" },
  { symbol: "OANDA:UK100", label: "UK100 (FTSE 100)" },
  { symbol: "OANDA:JP225", label: "JP225 (Nikkei)" },
  { symbol: "OANDA:EU50", label: "Euro Stoxx 50" },
  { symbol: "NSE:NIFTY", label: "NIFTY 50" },
  { symbol: "NSE:BANKNIFTY", label: "BANKNIFTY" },
  // Crypto
  { symbol: "BINANCE:BTCUSDT", label: "Bitcoin (BTC/USDT)" },
  { symbol: "BINANCE:ETHUSDT", label: "Ethereum (ETH/USDT)" },
  { symbol: "BINANCE:SOLUSDT", label: "Solana (SOL/USDT)" },
  { symbol: "BINANCE:BNBUSDT", label: "BNB/USDT" },
  { symbol: "BINANCE:XRPUSDT", label: "Ripple (XRP/USDT)" },
  { symbol: "BINANCE:ADAUSDT", label: "Cardano (ADA/USDT)" },
  { symbol: "BINANCE:DOGEUSDT", label: "Dogecoin (DOGE/USDT)" },
  // Indian Stocks (F&O)
  { symbol: "NSE:RELIANCE", label: "Reliance (RELIANCE)" },
  { symbol: "NSE:HDFCBANK", label: "HDFC Bank (HDFCBANK)" },
  { symbol: "NSE:TCS", label: "TCS (TCS)" },
  { symbol: "NSE:INFY", label: "Infosys (INFY)" },
  { symbol: "NSE:ICICIBANK", label: "ICICI Bank (ICICIBANK)" },
  { symbol: "NSE:SBIN", label: "State Bank of India (SBIN)" },
  { symbol: "NSE:BHARTIARTL", label: "Bharti Airtel (BHARTIARTL)" },
  { symbol: "NSE:ITC", label: "ITC (ITC)" },
  { symbol: "NSE:LARSEN", label: "Larsen & Toubro (LT)" },
  { symbol: "NSE:BAJFINANCE", label: "Bajaj Finance (BAJFINANCE)" },
  { symbol: "NSE:TATAMOTORS", label: "Tata Motors (TATAMOTORS)" },
  { symbol: "NSE:TATASTEEL", label: "Tata Steel (TATASTEEL)" },
  { symbol: "NSE:MARUTI", label: "Maruti Suzuki (MARUTI)" },
  { symbol: "NSE:AXISBANK", label: "Axis Bank (AXISBANK)" },
  { symbol: "NSE:KOTAKBANK", label: "Kotak Mahindra (KOTAKBANK)" },
  // US Stocks (NASDAQ 100 & Major NYSE)
  { symbol: "NASDAQ:AAPL", label: "Apple (AAPL)" },
  { symbol: "NASDAQ:MSFT", label: "Microsoft (MSFT)" },
  { symbol: "NASDAQ:GOOGL", label: "Alphabet (GOOGL)" },
  { symbol: "NASDAQ:AMZN", label: "Amazon (AMZN)" },
  { symbol: "NASDAQ:META", label: "Meta (META)" },
  { symbol: "NASDAQ:TSLA", label: "Tesla (TSLA)" },
  { symbol: "NASDAQ:NVDA", label: "NVIDIA (NVDA)" },
  { symbol: "NASDAQ:NFLX", label: "Netflix (NFLX)" },
  { symbol: "NASDAQ:PEP", label: "PepsiCo (PEP)" },
  { symbol: "NASDAQ:COST", label: "Costco (COST)" },
  { symbol: "NASDAQ:AVGO", label: "Broadcom (AVGO)" },
  { symbol: "NASDAQ:ADBE", label: "Adobe (ADBE)" },
  { symbol: "NASDAQ:CSCO", label: "Cisco (CSCO)" },
  { symbol: "NASDAQ:INTC", label: "Intel (INTC)" },
  { symbol: "NASDAQ:AMD", label: "AMD (AMD)" },
  { symbol: "NASDAQ:QCOM", label: "Qualcomm (QCOM)" },
  { symbol: "NYSE:V", label: "Visa (V)" },
  { symbol: "NYSE:JPM", label: "JPMorgan (JPM)" },
  { symbol: "NYSE:WMT", label: "Walmart (WMT)" },
  { symbol: "NYSE:MA", label: "Mastercard (MA)" },
  { symbol: "NYSE:PG", label: "Procter & Gamble (PG)" },
  { symbol: "NYSE:HD", label: "Home Depot (HD)" },
  { symbol: "NYSE:CVX", label: "Chevron (CVX)" },
  { symbol: "NYSE:KO", label: "Coca-Cola (KO)" },
  { symbol: "NYSE:MCD", label: "McDonald's (MCD)" },
  { symbol: "NYSE:CRM", label: "Salesforce (CRM)" }
];

export default function ChartsView() {
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");
  const [searchInput, setSearchInput] = useState("OANDA:XAUUSD");

  const handleShare = (platform: "whatsapp" | "telegram" | "native") => {
    const text = encodeURIComponent(`Check out my trading analysis on ${symbol.split(":")[1] || symbol} using AI Bull Chart Analyzer! 📈💰\n${window.location.href}`);
    
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } else if (platform === "telegram") {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check out my trading analysis on ' + (symbol.split(":")[1] || symbol) + ' using AI Bull Chart Analyzer! 📈💰')}`, '_blank');
    } else if (platform === "native") {
      if (navigator.share) {
        navigator.share({
          title: 'AI Bull Chart Analyzer',
          text: `Check out my trading analysis on ${symbol.split(":")[1] || symbol}! 📈💰`,
          url: window.location.href,
        }).catch((err) => {
          if (err?.name !== 'AbortError' && !err?.message?.toLowerCase().includes('cancel')) {
            console.error(err);
          }
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full p-4 overflow-hidden gap-4">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 w-full max-w-sm relative">
          <div className="absolute left-3 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input 
            list="instruments-list"
            className="w-full dark:bg-black/40 bg-slate-100 dark:border-white/10 border-slate-300 dark:text-white text-slate-900 pl-9 pr-4 py-2 rounded text-sm uppercase font-mono focus:outline-none focus:border-green-500/50"
            placeholder="Search instrument (e.g. EURUSD)"
            onChange={(e) => {
              setSearchInput(e.target.value.toUpperCase());
              // Auto-select if it matches a known symbol
              if (INSTRUMENTS.some(i => i.symbol === e.target.value.toUpperCase() || i.label.toUpperCase() === e.target.value.toUpperCase())) {
                const match = INSTRUMENTS.find(i => i.symbol === e.target.value.toUpperCase() || i.label.toUpperCase() === e.target.value.toUpperCase());
                if (match) setSymbol(match.symbol);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSymbol(searchInput);
              }
            }}
            value={searchInput}
          />
          <datalist id="instruments-list">
            {INSTRUMENTS.map(inst => (
              <option key={inst.symbol} value={inst.symbol}>
                {inst.label}
              </option>
            ))}
          </datalist>
          <button 
            onClick={() => setSymbol(searchInput)}
            className="px-3 py-2 dark:bg-white/10 bg-slate-200 dark:hover:bg-white/20 hover:bg-slate-300 dark:border-white/10 border-slate-300 rounded text-xs font-bold uppercase transition-colors dark:text-white text-slate-800"
          >
            Load
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={() => handleShare("whatsapp")}
            className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/40 border border-[#25D366]/50 dark:text-white text-[#25D366] px-3 py-1.5 rounded transition-all text-xs font-bold uppercase active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button 
            onClick={() => handleShare("telegram")}
            className="flex items-center gap-2 bg-[#0088cc]/20 hover:bg-[#0088cc]/40 border border-[#0088cc]/50 dark:text-white text-[#0088cc] px-3 py-1.5 rounded transition-all text-xs font-bold uppercase active:scale-95"
          >
            <Send className="w-4 h-4" />
            Telegram
          </button>
          {navigator.share && (
            <button 
              onClick={() => handleShare("native")}
              className="flex items-center gap-2 dark:bg-white/10 bg-slate-200 dark:hover:bg-white/20 hover:bg-slate-300 dark:border-white/20 border-slate-300 dark:text-white text-slate-800 px-3 py-1.5 rounded transition-all text-xs font-bold uppercase active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              More
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative">
        <AdvancedRealTimeChart 
          theme="dark"
          symbol={symbol}
          interval="D"
          timezone="Etc/UTC"
          style="1"
          locale="en"
          enable_publishing={false}
          allow_symbol_change={true}
          container_id="tradingview_widget"
          hide_side_toolbar={false}
          save_image={false}
          details={true}
          hotlist={true}
          calendar={true}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
