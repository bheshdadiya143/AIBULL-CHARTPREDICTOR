import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  Download, 
  RefreshCw,
  FileText,
  Activity,
  Maximize2,
  Moon,
  Sun,
  LayoutDashboard,
  Newspaper,
  BookOpen,
  CreditCard,
  Share2,
  LogIn,
  LogOut,
  User as UserIcon,
  MessageCircle,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Cell
} from "recharts";
import { analyzeChartImage, ChartAnalysis } from "./services/geminiService";
import { cn } from "./lib/utils";

// Sub-components
import MarketNews from "./components/MarketNews";
import BlogSection from "./components/BlogSection";
import Billing from "./components/Billing";
import ShareModal from "./components/ShareModal";

// UI Constants for 'AI Bull Chart Predictor' Aesthetic
const COLORS_PRO = {
  bg: "#05070a",
  panel: "rgba(255, 255, 255, 0.05)",
  border: "rgba(255, 255, 255, 0.1)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  accent: "#22c55e", // Bull Green (Lamborghini style)
  accentHover: "#16a34a",
  long: "#22c55e",
  short: "#ef4444",
  entry: "#fbbf24",
  grid: "rgba(255, 255, 255, 0.05)"
};

// Custom Bull Icon (Lamborghini style)
const BullLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L8 6H16L12 2Z" className="opacity-80" />
    <path d="M4 8C4 8 6 12 12 12C18 12 20 8 20 8" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M7 10L12 18L17 10" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="9" cy="9" r="0.5" fill="white" />
    <circle cx="15" cy="9" r="0.5" fill="white" />
    <path d="M12 21L10 18H14L12 21Z" />
  </svg>
);

type Tab = "analysis" | "updates" | "education" | "billing";

// Candlestick Component
const Candlestick = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isUp = close >= open;
  const color = isUp ? COLORS_PRO.long : COLORS_PRO.short;
  const ratio = (high - low) / height;

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={y - (high - close) / ratio}
        x2={x + width / 2}
        y2={y + height + (close - low) / ratio}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
      />
    </g>
  );
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ChartAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isShareUnlockOpen, setIsShareUnlockOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(() => {
    return localStorage.getItem("aibull_disclaimer_accepted") !== "true";
  });
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [feedback, setFeedback] = useState<{ rating: 'accurate' | 'inaccurate' | null, submitted: boolean }>({ rating: null, submitted: false });
  const [user, setUser] = useState<{ 
    name: string; 
    email: string; 
    photo: string; 
    mobile?: string; 
    freeUses: number;
    lastFreeUseAt?: number;
    isSubscribed?: boolean;
  } | null>(() => {
    const saved = localStorage.getItem("aibull_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    if (user) {
      localStorage.setItem("aibull_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("aibull_user");
    }
  }, [user]);

  // Sync theme with body
  useEffect(() => {
    document.body.className = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (method: 'google' | 'email') => {
    // Simulating login (using real auth would involve firebase/auth)
    const newUser = {
      name: "Institutional Trader",
      email: "trader@pro.com",
      photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      freeUses: 1,
      isSubscribed: false
    };
    setUser(newUser);
    localStorage.setItem("aibull_user", JSON.stringify(newUser));
    setIsAuthOpen(false);
  };

  const handleLogout = () => setUser(null);

  const handleMobileSubmit = (mobile: string) => {
    if (user) {
      const updatedUser = { ...user, mobile, freeUses: user.freeUses + 1 };
      setUser(updatedUser);
      localStorage.setItem("aibull_user", JSON.stringify(updatedUser));
      setIsMobileModalOpen(false);
    }
  };

  const handleShareToUnlock = () => {
    if (!user) return;
    
    // Construct WhatsApp share link
    const text = encodeURIComponent("Check out AI Bull Chart Predictor for professional SMC/ICT analysis! 📈💰\n" + window.location.href);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Grant the free use (Mocking share validation as per standard web browser limitations)
    const updatedUser = { 
      ...user, 
      freeUses: user.freeUses + 1,
      lastFreeUseAt: Date.now() 
    };
    setUser(updatedUser);
    setIsShareUnlockOpen(false);
  };

  const handlePurchaseInitiated = (tierId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedTier(tierId);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    setIsProcessingPayment(true);
    // Simulate secure verification delay
    setTimeout(() => {
      if (user) {
        const updatedUser = { ...user, isSubscribed: true };
        setUser(updatedUser);
        localStorage.setItem("aibull_user", JSON.stringify(updatedUser));
      }
      setIsProcessingPayment(false);
      setIsPaymentModalOpen(false);
      alert("Terminal Subscription Activated Successfully!");
    }, 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        performAnalysis(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async (base64: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    if (!user.isSubscribed && user.freeUses <= 0) {
      const now = Date.now();
      const lastUsed = user.lastFreeUseAt || 0;
      const hoursSinceLast = (now - lastUsed) / (1000 * 60 * 60);

      if (hoursSinceLast >= 24) {
        setIsShareUnlockOpen(true);
      } else {
        if (!user.mobile) {
          setIsMobileModalOpen(true);
        } else {
          setActiveTab("billing");
        }
      }
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFeedback({ rating: null, submitted: false });
    try {
      const result = await analyzeChartImage(base64);

      // --- GLOBAL SIGNAL NEXUS SYNC ---
      try {
        const queryRes = await fetch(`/api/signal-nexus/query?instrument=${encodeURIComponent(result.chartType)}&timeframe=${encodeURIComponent(result.timeframe)}`);
        if (queryRes.ok) {
          const shared = await queryRes.json();
          // If a shared consensus exists, we merge/prefer it for "genuine" consistency
          setAnalysis({ ...shared.prediction, simulatedData: shared.data, isSharedConsensus: true });
        } else {
          // If no shared signal, broadcast this new one to the Nexus
          await fetch("/api/signal-nexus/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instrument: result.chartType,
              timeframe: result.timeframe,
              prediction: result,
              data: result.simulatedData
            })
          });
          setAnalysis(result);
        }
      } catch (nexusErr) {
        console.warn("Nexus Sync Offline:", nexusErr);
        setAnalysis(result);
      }
      // ---------------------------------
      if (!user.isSubscribed) {
        const updatedUser = { 
          ...user, 
          freeUses: Math.max(0, user.freeUses - 1),
          lastFreeUseAt: Date.now() 
        };
        setUser(updatedUser);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong during analysis.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportFullReport = () => {
    if (!analysis) return;
    
    // Create CSV content for Excel
    const csvRows = [
      ["AI BULL CHART PREDICTOR - INSTITUTIONAL ANALYSIS REPORT"],
      ["Generated At", new Date().toLocaleString()],
      ["Instrument", analysis.chartType],
      ["Timeframe", analysis.timeframe],
      [""],
      ["MARKET STRUCTURE & BIAS"],
      ["Structure", analysis.marketStructure],
      ["Institutional Bias", analysis.institutionalBias],
      ["Strategy Used", analysis.strategyName],
      ["Confidence Score", `${(analysis.confidence * 100).toFixed(1)}%`],
      [""],
      ["TRADE SETUP"],
      ["Execution Type", analysis.prediction.executionType.toUpperCase()],
      ["Bias", analysis.prediction.bias.toUpperCase()],
      ["Entry / Limit Price", (analysis.prediction.executionType === 'limit' ? analysis.prediction.limitPrice : analysis.prediction.entry)],
      ["Target Price", analysis.prediction.target],
      ["Stop Loss", analysis.prediction.stopLoss],
      ["Risk/Reward Ratio", `1:${analysis.prediction.riskRewardRatio}`],
      [""],
      ["OHLC DATA POINTS"],
      ["Index", "Open", "High", "Low", "Close", "Type"]
    ];

    analysis.simulatedData.forEach((d, i) => {
      csvRows.push([i + 1, d.open, d.high, d.low, d.close, d.type]);
    });

    const csvString = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aibull_analysis_${analysis.chartType.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("aibull_disclaimer_accepted", "true");
    setIsDisclaimerOpen(false);
  };

  // UI Constants based on theme
  const colors = {
    bg: isDarkMode ? COLORS_PRO.bg : "#f8fafc",
    panel: isDarkMode ? COLORS_PRO.panel : "#ffffff",
    border: isDarkMode ? COLORS_PRO.border : "rgba(0, 0, 0, 0.1)",
    text: isDarkMode ? COLORS_PRO.text : "#0f172a",
    muted: isDarkMode ? COLORS_PRO.muted : "#64748b",
    accent: COLORS_PRO.accent,
  };

  const AnalysisMetric = ({ label, value, icon: Icon, colorClass = "text-slate-400" }: { label: string, value: string, icon: any, colorClass?: string }) => (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group hover:border-white/10 transition-all">
      <div className="flex items-center gap-3">
        <div className={cn("p-1.5 rounded bg-white/5", colorClass)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-tighter">{label}</span>
      </div>
      <span className="text-[11px] font-mono font-bold text-white uppercase">{value}</span>
    </div>
  );

  const NavItem = ({ icon: Icon, tab, label }: { icon: any, tab: Tab, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        "flex flex-col items-center gap-1.5 px-4 py-2 border-b-2 transition-all group",
        activeTab === tab 
          ? "border-blue-500 text-blue-500" 
          : "border-transparent text-slate-500 hover:text-slate-300"
      )}
    >
      <Icon className={cn("w-5 h-5 group-hover:scale-110 transition-transform", activeTab === tab && "animate-pulse")} />
      <span className="text-[10px] uppercase font-bold tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen font-sans overflow-x-hidden flex flex-col transition-colors duration-300" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Disclaimer Modal */}
      <AnimatePresence>
        {isDisclaimerOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0F1115] border border-white/10 rounded-3xl max-w-2xl w-full p-8 md:p-12 space-y-8 shadow-[0_0_100px_rgba(34,197,94,0.1)] relative my-8"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 blur-2xl pointer-events-none">
                <BullLogo className="w-48 h-48 text-green-500" />
              </div>
              
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <ShieldAlert className="w-8 h-8 text-green-500" />
                  </div>
                  <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Risk Disclosure</h1>
                </div>
                
                <div className="space-y-6 text-slate-400 text-sm leading-relaxed max-h-[40vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                  <p className="font-bold text-white uppercase italic">Trading financial instruments involves substantial risk of loss and is not suitable for every investor.</p>
                  
                  <p>1. <span className="text-white font-bold">No Financial Advice:</span> AI Bull Chart Predictor provides algorithmic analysis based on SMC (Smart Money Concepts) and ICT methodologies. This data is for educational and informational purposes ONLY. We are not financial advisors.</p>
                  
                  <p>2. <span className="text-white font-bold">Algorithmic Limitations:</span> All predictions and signals are generated by an Artificial Intelligence model. AI can exhibit hallucinations, logic failures, or inaccurate data mapping. Past performance is not indicative of future results.</p>
                  
                  <p>3. <span className="text-white font-bold">Risk Management:</span> Any trade execution initiated based on this terminal is the sole responsibility of the user. Never risk capital you cannot afford to lose.</p>
                  
                  <p>4. <span className="text-white font-bold">Connectivity:</span> The accuracy of the analysis depends heavily on the quality of the uploaded chart image. Blurry or manipulated images will yield unpredictable results.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 relative">
                <button 
                  onClick={handleAcceptDisclaimer}
                  className="w-full py-5 bg-green-600 text-white font-black uppercase text-sm rounded-2xl hover:bg-green-500 transition-all shadow-[0_4px_20px_rgba(34,197,94,0.3)] group"
                >
                  I AGREE - ENTER TERMINAL
                </button>
                <p className="text-[10px] text-slate-600 text-center uppercase font-bold tracking-widest">
                  By entering, you confirm you are 18+ and understand the risks involved in trading.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Payment Processing Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
               className="bg-[#1A1D23] border border-white/10 rounded-3xl max-w-sm w-full overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.15)]"
             >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">Google Play Billing</span>
                  </div>
                  <button onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)} className="text-slate-500 hover:text-white">
                    <ShieldAlert className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Transaction Security: 256-BIT SSL</p>
                    <h3 className="text-2xl font-bold text-white uppercase">Secure Checkout</h3>
                    <p className="text-xs text-slate-400">Total Due: <span className="text-white font-bold">$29.00 - $249.00</span></p>
                  </div>

                  <div className="flex items-center justify-center py-4">
                     <div className="relative">
                        <div className={cn("w-16 h-16 border-4 border-slate-700 rounded-full", isProcessingPayment && "border-t-green-500 animate-spin")} />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <CreditCard className={cn("w-6 h-6", isProcessingPayment ? "text-green-500 animate-pulse" : "text-slate-500")} />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
                           <span className="text-[11px] font-bold text-slate-300">Google Pay •••• 4242</span>
                        </div>
                        <span className="text-[10px] text-green-500 font-bold">VERIFIED</span>
                     </div>
                     <p className="text-[9px] text-slate-500 text-center leading-relaxed">
                        By clicking 'Confirm', you agree to the Google Play Terms of Service. Payments are encrypted and secure.
                     </p>
                  </div>

                  <button 
                    disabled={isProcessingPayment}
                    onClick={handleConfirmPayment}
                    className="w-full py-4 bg-white text-black font-extrabold uppercase text-xs rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                  >
                    {isProcessingPayment ? "Verifying..." : "Confirm Purchase"}
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <BullLogo className="w-16 h-16 text-green-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Access Terminal</h2>
                <p className="text-xs text-slate-500 uppercase tracking-tighter">Login required for institutional signal uplink</p>
              </div>
              <div className="space-y-4 pt-4">
                <button 
                  onClick={() => handleLogin('google')}
                  className="w-full py-3 bg-white text-black font-bold uppercase text-[11px] rounded-lg flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
                  Continue with Google
                </button>
                <div className="text-[10px] text-slate-600 font-bold uppercase flex items-center gap-2">
                  <div className="flex-1 h-px bg-white/5" />
                  OR
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <button 
                  onClick={() => handleLogin('email')}
                  className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold uppercase text-[11px] rounded-lg hover:bg-white/10 transition-all"
                >
                  Email / OTP Verification
                </button>
              </div>
              <button onClick={() => setIsAuthOpen(false)} className="text-[10px] text-slate-500 hover:text-white uppercase transition-colors">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share to Unlock Modal */}
      <AnimatePresence>
        {isShareUnlockOpen && (
          <div className="fixed inset-0 z-[202] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                <Share2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase text-white">Daily Bonus Cycle</h2>
                <p className="text-xs text-slate-500">24 hours have passed! Share the terminal in a WhatsApp group to unlock 1 free professional analysis.</p>
              </div>
              <button 
                onClick={handleShareToUnlock}
                className="w-full py-4 bg-green-600 text-white font-bold uppercase text-xs rounded-lg flex items-center justify-center gap-3 hover:bg-green-500 transition-all shadow-xl shadow-green-600/30"
              >
                <MessageCircle className="w-4 h-4" />
                Share & Unlock Now
              </button>
              <button 
                onClick={() => setIsShareUnlockOpen(false)}
                className="text-[10px] text-slate-600 uppercase font-bold hover:text-slate-400"
              >
                Maybe Later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Collection Modal */}
      <AnimatePresence>
        {isMobileModalOpen && (
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleMobileSubmit((e.target as any).mobile.value); }}
              className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                <Activity className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase text-white">Unlock Free Analysis</h2>
                <p className="text-xs text-slate-500">Verify your mobile number to get 1 extra free professional session.</p>
              </div>
              <input 
                name="mobile" required placeholder="+1 (555) 000-0000"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-center text-sm focus:outline-none focus:border-green-500 text-white"
              />
              <button 
                type="submit"
                className="w-full py-3 bg-green-600 text-white font-bold uppercase text-[11px] rounded-lg hover:bg-green-500 transition-all"
              >
                Claim Free Session
              </button>
            </form>
          </div>
        )}
      </AnimatePresence>

      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        url={window.location.href}
        title={analysis ? `AI Chart Analysis: ${analysis.chartType} detected with ${analysis.prediction.bias.toUpperCase()} bias.` : "Professional AI Chart Analysis"}
      />

      {/* Header */}
      <header className="h-16 border-b bg-black/40 dark:bg-black/40 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-3">
          <BullLogo className="w-8 h-8 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
          <span className="text-xl font-bold tracking-tight text-white uppercase hidden sm:block">
            AI <span className="text-green-500">BULL</span> PREDICTOR
          </span>
        </div>

        <nav className="flex items-center">
          <NavItem icon={LayoutDashboard} tab="analysis" label="Analysis" />
          <NavItem icon={Maximize2} tab="education" label="Education" />
          <NavItem icon={Newspaper} tab="updates" label="Updates" />
          <NavItem icon={CreditCard} tab="billing" label="Plans" />
        </nav>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-white/5 transition-colors border border-white/10"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
          
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-[10px] font-bold uppercase">{user.name}</span>
                <span className="text-[9px] text-green-500 uppercase tracking-tighter font-bold">UPLINK ACTIVE</span>
              </div>
              <img src={user.photo} alt="User" className="w-8 h-8 rounded-full border border-green-500/50" />
              <button onClick={handleLogout} className="p-2 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 bg-green-600 text-white text-[11px] font-bold uppercase rounded-md hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
            >
              Enter Terminal
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1440px] mx-auto w-full pb-20">
        <AnimatePresence mode="wait">
          {!user && activeTab === "analysis" ? (
            <motion.div 
              key="auth-gate"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
                 <BullLogo className="w-32 h-32 text-green-500 relative" />
              </div>
              <div className="space-y-4 max-w-md">
                <h1 className="text-3xl font-bold uppercase tracking-widest">Uplink Restricted</h1>
                <p className="text-slate-500 uppercase text-xs tracking-widest leading-loose">
                  Traditional retail data is offline. Authenticate via institutional credentials to sync with Smart Money feeds.
                </p>
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="px-12 py-4 bg-green-600 text-white font-bold uppercase text-xs rounded-lg hover:bg-green-500 transition-all shadow-xl shadow-green-600/20"
                >
                  Initiate Secure Login
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {activeTab === "analysis" && (
            <motion.div 
              key="analyzer"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <section 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-48 border-2 border-dashed rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group shadow-xl"
                  style={{ borderColor: colors.border }}
                >
                  {image ? (
                    <div className="w-full h-full relative">
                      <img src={image} alt="Chart" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                        <Upload className="w-8 h-8 text-white mb-2" />
                        <span className="text-xs font-bold uppercase text-white">Change Scan</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-sm font-medium">Upload Terminal Scan</p>
                      <p className="text-xs text-slate-500">PNG, JPG or WebP up to 10MB</p>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                </section>

                <div className="flex-1 bg-white/5 border rounded-xl p-5 shadow-2xl relative" style={{ borderColor: colors.border }}>
                  {isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                      <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                      <p className="text-xs font-mono uppercase text-blue-400">Processing Signal Data...</p>
                    </div>
                  ) : analysis ? (
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Target className="w-3 h-3 text-green-500" />
                             Institutional Intelligence
                          </h3>
                          
                          <div className="grid grid-cols-1 gap-2">
                            <AnalysisMetric label="Structure" value={analysis.marketStructure} icon={Activity} colorClass="text-green-400" />
                            <AnalysisMetric label="Strategy" value={analysis.strategyName} icon={Maximize2} colorClass="text-amber-400" />
                            <AnalysisMetric label="Bias State" value={analysis.institutionalBias} icon={ShieldAlert} colorClass="text-blue-400" />
                            <AnalysisMetric label="Confidence" value={`${(analysis.confidence * 100).toFixed(0)}%`} icon={Target} colorClass="text-green-500" />
                            {analysis.isSharedConsensus && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <Activity className="w-3.5 h-3.5 text-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Global Consensus Active</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-white/5">
                            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Detected Concepts</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {analysis.conceptsUsed.map((c, i) => (
                                <div key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[9px] font-mono text-slate-300">
                                  {c}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Sentiment Bias</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className={cn("p-4 border rounded-lg text-center transition-all", analysis.trend === "bullish" ? "bg-green-500/10 border-green-500/30 scale-105" : "bg-white/2 border-white/5 opacity-40")}>
                               <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-500" />
                               <div className="text-[10px] font-bold uppercase">Bullish</div>
                            </div>
                            <div className={cn("p-4 border rounded-lg text-center transition-all", analysis.trend === "bearish" ? "bg-red-500/10 border-red-500/30 scale-105" : "bg-white/2 border-white/5 opacity-40")}>
                               <TrendingDown className="w-5 h-5 mx-auto mb-2 text-red-500" />
                               <div className="text-[10px] font-bold uppercase">Bearish</div>
                            </div>
                          </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="pt-6 border-t border-white/5">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quality Feedback</h3>
                          {!feedback.submitted ? (
                            <div className="flex flex-col gap-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                                Was this institutional signal accurate based on your perspective?
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => setFeedback({ rating: 'accurate', submitted: true })}
                                  className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/5 rounded-lg hover:border-green-500/50 hover:bg-green-500/5 transition-all group"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-green-500" />
                                  <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-white">Accurate</span>
                                </button>
                                <button 
                                  onClick={() => setFeedback({ rating: 'inaccurate', submitted: true })}
                                  className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/5 rounded-lg hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-500" />
                                  <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-white">Inaccurate</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center"
                            >
                              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                                {feedback.rating === 'accurate' ? "Confirmed. Processing signal..." : "Logged. Refining ICT models..."}
                              </p>
                              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tight">Your data helps stabilize the predictive uplink.</p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                      <Activity className="w-12 h-12 mb-4 animate-pulse text-blue-500" />
                      <p className="text-xs font-mono uppercase tracking-[0.3em]">Awaiting Uplink</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="flex-1 bg-white/5 border rounded-xl p-6 relative flex flex-col min-h-[450px] shadow-2xl" style={{ borderColor: colors.border }}>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-6">
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 font-bold">System Path</span>
                        <div className="text-sm font-mono">{analysis?.chartType || "DETECTING..."}</div>
                      </div>
                      <div className="border-l border-white/10 pl-6">
                        <span className="text-[9px] uppercase text-slate-500 font-bold">Timeframe</span>
                        <div className="text-sm font-mono">{analysis?.timeframe || "OFFLINE"}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setIsShareOpen(true)}
                         disabled={!analysis}
                         className="flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/10 rounded text-[10px] uppercase font-bold hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                       >
                         <Share2 className="w-3.5 h-3.5" />
                         Share Report
                       </button>
                    </div>
                  </div>

                  <div className="flex-1 relative border border-white/5 bg-black/20 rounded-xl overflow-hidden min-h-[300px]">
                    {analysis ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={analysis.simulatedData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                          <defs>
                             <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={colors.accent} stopOpacity={0.2}/>
                               <stop offset="95%" stopColor={colors.accent} stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0F1115", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                            itemStyle={{ color: "#fff" }}
                          />
                          <Area type="monotone" dataKey="close" stroke={colors.accent} strokeWidth={1} fillOpacity={1} fill="url(#colorPrice)" animationDuration={2000} />
                          
                          <Bar 
                            dataKey="close" 
                            shape={(props: any) => {
                              const { x, y, width, height, payload } = props;
                              return <Candlestick 
                                x={x + width * 0.25} 
                                y={payload.open > payload.close ? y - (payload.open - payload.close) : y} 
                                width={width * 0.5} 
                                height={Math.max(Math.abs(payload.open - payload.close) * 10, 2)} 
                                low={payload.low} 
                                high={payload.high} 
                                open={payload.open} 
                                close={payload.close} 
                              />;
                            }}
                          />

                          <ReferenceLine y={analysis.prediction.entry} stroke="#fbbf24" strokeWidth={1} strokeDasharray="5 5" label={{ value: 'ENTRY', fill: '#fbbf24', fontSize: 10 }} />
                          <ReferenceLine y={analysis.prediction.target} stroke="#22c55e" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'TARGET', fill: '#22c55e', fontSize: 10 }} />
                          <ReferenceLine y={analysis.prediction.stopLoss} stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" label={{ value: 'SL', fill: '#ef4444', fontSize: 10 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Activity className="w-20 h-20" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                   <div className="md:col-span-3 bg-white/5 border rounded-xl p-5 shadow-inner" style={{ borderColor: colors.border }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Entry Zone</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${analysis?.prediction.executionType === 'limit' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                          {analysis?.prediction.executionType.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-yellow-400">
                        {analysis ? `$${(analysis.prediction.executionType === 'limit' ? analysis.prediction.limitPrice : analysis.prediction.entry)?.toLocaleString()}` : "---"}
                      </div>
                   </div>
                   <div className="md:col-span-3 bg-white/5 border rounded-xl p-5 shadow-inner" style={{ borderColor: colors.border }}>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter text-green-400">Target</div>
                      <div className="text-2xl font-mono font-bold text-green-400">{analysis ? `$${analysis.prediction.target.toLocaleString()}` : "---"}</div>
                   </div>
                   <div className="md:col-span-2 bg-white/5 border rounded-xl p-5 shadow-inner" style={{ borderColor: colors.border }}>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter text-red-400">RR Ratio</div>
                      <div className="text-xl font-mono font-bold">{analysis ? `1:${analysis.prediction.riskRewardRatio}` : "---"}</div>
                   </div>
                    <button 
                      onClick={exportFullReport}
                      disabled={!analysis}
                      className="md:col-span-4 bg-green-600/10 border border-green-500/30 rounded-xl p-5 flex flex-col justify-center items-center gap-2 hover:bg-green-600/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                      <Download className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Export Analysis (CSV)</span>
                    </button>
                </div>

                {analysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Activity className="w-6 h-6 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-widest text-white">Institutional Logic Summary</h3>
                    </div>
                    <div className="text-sm text-slate-400 leading-relaxed font-mono whitespace-pre-wrap p-6 bg-black/40 rounded-xl border border-white/5">
                      {analysis.prediction.rationale}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "updates" && <MarketNews />}
          {activeTab === "education" && <BlogSection />}

          {activeTab === "billing" && <Billing onPurchase={handlePurchaseInitiated} />}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-10 px-6 border-t flex items-center justify-between bg-black/40 text-[10px] font-mono text-slate-500 shrink-0 sticky bottom-0 z-50 backdrop-blur-sm" style={{ borderColor: colors.border }}>
        <div className="flex gap-4">
          <span className="opacity-40 uppercase">Latency:</span>
          <span>12ms</span>
          <span className="opacity-40 uppercase ml-4">Terminal:</span>
          <span className="text-blue-500">OPTIMAL</span>
        </div>
        <div className="hidden lg:flex gap-8">
           <span>NODE // US-EAST-1</span>
           <span className="text-green-500 uppercase animate-pulse">Live Feed</span>
        </div>
        <div className="text-green-400/80 uppercase tracking-widest">
           © 2026 AI Bull Chart Predictor
        </div>
      </footer>
    </div>
  );
}
