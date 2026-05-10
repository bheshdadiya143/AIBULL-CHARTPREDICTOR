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
  ThumbsDown,
  Settings,
  LineChart
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
  Line,
  Bar,
  Cell,
  Brush
} from "recharts";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { analyzeChartImage, ChartAnalysis } from "./services/geminiService";
import { auth, db } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection } from "firebase/firestore";
import { cn } from "./lib/utils";

// Sub-components
import MarketNews from "./components/MarketNews";
import ChartsView from "./components/ChartsView";
import BlogSection from "./components/BlogSection";
import Billing from "./components/Billing";
import ShareModal from "./components/ShareModal";
import AdminPanel from "./components/AdminPanel";

import Profile from "./components/Profile";

type Tab = "analysis" | "charts" | "updates" | "education" | "billing" | "admin" | "profile";

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
  const [analyses, setAnalyses] = useState<Record<string, ChartAnalysis>>({});
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1H");
  const [draggedLine, setDraggedLine] = useState<null | 'entry' | 'target' | 'stopLoss'>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareUnlockOpen, setIsShareUnlockOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(() => {
    return localStorage.getItem("aibull_disclaimer_accepted") !== "true";
  });
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [feedback, setFeedback] = useState<{ rating: 'accurate' | 'inaccurate' | null, submitted: boolean }>({ rating: null, submitted: false });
  const [user, setUser] = useState<{ 
    uid: string;
    name: string; 
    email: string; 
    photo: string; 
    mobile?: string; 
    freeUses: number;
    lastFreeUseAt?: number;
    isSubscribed?: boolean;
    isAdmin?: boolean;
  } | null>(null);
  
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence and Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user document from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            let isSubscribed = data.isSubscribed;
            if (isSubscribed && data.subscriptionExpiresAt && data.subscriptionExpiresAt < Date.now()) {
               isSubscribed = false;
               // Inform user on next action or silently let them revert
            }
            setUser({ uid: firebaseUser.uid, ...data, isSubscribed } as any);
          } else {
                        const newUser = {
               name: firebaseUser.displayName || 'Trader',
               email: firebaseUser.email || '',
               photo: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
               freeUses: 1,
               isSubscribed: false,
               isAdmin: firebaseUser.email === 'bheshdadiya@gmail.com', // Bootstrap admin
               createdAt: serverTimestamp(),
               updatedAt: serverTimestamp()
             };
             await setDoc(doc(db, "users", firebaseUser.uid), newUser);
             setUser({ uid: firebaseUser.uid, ...newUser } as any);
          }
        } catch (e) {
          console.error("Error fetching user data", e);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (method: 'google' | 'email') => {
    if (method === 'google') {
       try {
         const provider = new GoogleAuthProvider();
         await signInWithPopup(auth, provider);
         setIsAuthOpen(false);
       } catch (e) {
         console.error(e);
         alert("Failed to login with Google");
       }
    } else {
      alert("Email authentication not yet implemented. Please use Google.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handleReportContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportReason) return;

    try {
      const reportRef = doc(collection(db, "reports"));
      await setDoc(reportRef, {
        reporterId: user.uid,
        reason: reportReason,
        details: reportDetails,
        contentType: "AI Analysis",
        contentId: "analysis_" + Date.now(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      setIsReportModalOpen(false);
      setReportReason("");
      setReportDetails("");
      alert("Thank you. Your report has been submitted for review. We take objectionable content seriously.");
    } catch (err) {
      console.error("Error reporting content:", err);
      alert("Failed to submit report. Please try again.");
    }
  };

  // Sync theme with body
  useEffect(() => {
    document.body.className = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const analysis = analyses[selectedTimeframe];

  const handleChartMouseMove = (e: any) => {
    if (!draggedLine || !e || !e.activePayload || !analysis) return;
    
    // Calculate price from Y coordinate
    // Recharts doesn't provide a direct coord-to-value for Y axis easily in this way
    // So we'll use a hack to get value from the active chart domain if possible
    // or just use the mouse event's activeCoordinate if available
    const price = e.activeCoordinate?.y;
    if (price === undefined) return;
    
    // We need to convert pixel Y to Price value
    // Since Recharts doesn't expose the scale easily, we'll use the domain mapping
    const chartHeight = 400; // Expected height
    const domain = [
      Math.min(...analysis.simulatedData.map(d => d.low)) * 0.99,
      Math.max(...analysis.simulatedData.map(d => d.high)) * 1.01
    ];
    
    // Approximate pixel to value
    const padding = 60; // Approximate top/bottom padding in Recharts
    const usefulHeight = chartHeight - padding;
    const valueRange = domain[1] - domain[0];
    const relativeY = (price - 30) / usefulHeight; // 30 is approx top offset
    const newValue = domain[1] - (relativeY * valueRange);

    const updatedPrediction = { ...analysis.prediction };
    if (draggedLine === 'entry') updatedPrediction.entry = newValue;
    if (draggedLine === 'target') updatedPrediction.target = newValue;
    if (draggedLine === 'stopLoss') updatedPrediction.stopLoss = newValue;

    // Recalculate RR
    const risk = Math.abs(updatedPrediction.entry - updatedPrediction.stopLoss);
    const reward = Math.abs(updatedPrediction.target - updatedPrediction.entry);
    updatedPrediction.riskRewardRatio = Number((reward / risk).toFixed(2));

    setAnalyses(prev => ({
      ...prev,
      [selectedTimeframe]: { ...analysis, prediction: updatedPrediction }
    }));
  };

  const handleShareToUnlock = async () => {
    if (!user) return;
    
    // Construct WhatsApp share link
    const text = encodeURIComponent("Check out AI Bull Chart Analyzer for professional SMC/ICT analysis! 📈💰\n" + window.location.href);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Grant the free use (Mocking share validation as per standard web browser limitations)
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { freeUses: user.freeUses + 1, lastFreeUseAt: Date.now(), updatedAt: serverTimestamp() });
      const updatedUser = { 
        ...user, 
        freeUses: user.freeUses + 1,
        lastFreeUseAt: Date.now() 
      };
      setUser(updatedUser);
      setIsShareUnlockOpen(false);
    } catch (e) { console.error(e); }
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
    setTimeout(async () => {
      if (user) {
        try {
          const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { isSubscribed: true, subscriptionExpiresAt: expiresAt, updatedAt: serverTimestamp() });
          const updatedUser = { ...user, isSubscribed: true, subscriptionExpiresAt: expiresAt };
          setUser(updatedUser);
        } catch (e) { console.error(e); }
      }
      setIsProcessingPayment(false);
      setIsPaymentModalOpen(false);
      alert("Terminal Subscription Activated Successfully!");
    }, 2500);
  };

  const handleCancelSubscription = async () => {
    if (window.confirm("Are you sure you want to cancel your subscription? You will lose terminal access.")) {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            isSubscribed: false,
            subscriptionExpiresAt: 0,
            updatedAt: serverTimestamp()
          });
          setUser({ ...user, isSubscribed: false, subscriptionExpiresAt: 0 });
          alert("Subscription cancelled.");
        } catch (error) {
          console.error("Error cancelling subscription:", error);
          alert("Failed to cancel subscription.");
        }
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async (base64: string, targetTimeframe?: string) => {
    const tfToAnalyze = targetTimeframe || selectedTimeframe;

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
          // This should never happen now as it's strictly enforced, but fallback
          setActiveTab("billing");
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
      const result = await analyzeChartImage(base64, tfToAnalyze);

      // Store in multi-timeframe state
      const updatedAnalyses = { ...analyses, [tfToAnalyze]: result };
      setAnalyses(updatedAnalyses);

      // --- GLOBAL SIGNAL NEXUS SYNC ---
      try {
        const queryRes = await fetch(`/api/signal-nexus/query?instrument=${encodeURIComponent(result.chartType)}&timeframe=${encodeURIComponent(result.timeframe)}`);
        if (queryRes.ok) {
          const shared = await queryRes.json();
          const sharedResult = { ...shared.prediction, simulatedData: shared.data, isSharedConsensus: true };
          setAnalyses(prev => ({ ...prev, [tfToAnalyze]: sharedResult }));
        } else {
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
        }
      } catch (nexusErr) {
        console.warn("Nexus Sync Offline:", nexusErr);
      }
      // ---------------------------------
      if (!user.isSubscribed) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { freeUses: Math.max(0, user.freeUses - 1), lastFreeUseAt: Date.now(), updatedAt: serverTimestamp() });
          const updatedUser = { 
            ...user, 
            freeUses: Math.max(0, user.freeUses - 1),
            lastFreeUseAt: Date.now() 
          };
          setUser(updatedUser);
        } catch (e) { console.error(e); }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong during analysis.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportFullReport = () => {
    const currentAnalysis = analyses[selectedTimeframe];
    if (!currentAnalysis) return;
    
    // Create CSV content for Excel
    const csvRows = [
      ["AI BULL CHART ANALYZER - INSTITUTIONAL ANALYSIS REPORT"],
      ["Generated At", new Date().toLocaleString()],
      ["Instrument", currentAnalysis.chartType],
      ["Timeframe", currentAnalysis.timeframe],
      [""],
      ["MARKET STRUCTURE & BIAS"],
      ["Structure", currentAnalysis.marketStructure],
      ["Institutional Bias", currentAnalysis.institutionalBias],
      ["Strategy Used", currentAnalysis.strategyName],
      ["Confidence Score", `${(currentAnalysis.confidence * 100).toFixed(1)}%`],
      [""],
      ["TRADE SETUP"],
      ["Execution Type", currentAnalysis.prediction.executionType.toUpperCase()],
      ["Bias", currentAnalysis.prediction.bias.toUpperCase()],
      ["Entry / Limit Price", (currentAnalysis.prediction.executionType === 'limit' ? currentAnalysis.prediction.limitPrice : currentAnalysis.prediction.entry)],
      ["Target Price", currentAnalysis.prediction.target],
      ["Stop Loss", currentAnalysis.prediction.stopLoss],
      ["Risk/Reward Ratio", `1:${currentAnalysis.prediction.riskRewardRatio}`],
      [""],
      ["OHLC DATA POINTS"],
      ["Index", "Open", "High", "Low", "Close", "Type"]
    ];

    currentAnalysis.simulatedData.forEach((d, i) => {
      csvRows.push([i + 1, d.open, d.high, d.low, d.close, d.type]);
    });

    const csvString = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aibull_analysis_${currentAnalysis.chartType.replace(/\s+/g, '_')}_${Date.now()}.csv`;
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
    <div className={cn("flex items-center justify-between p-3 border rounded-lg group transition-all", isDarkMode ? "bg-white/5 border-white/5 hover:border-white/10" : "bg-slate-100 border-slate-200 hover:border-slate-300")}>
      <div className="flex items-center gap-3">
        <div className={cn("p-1.5 rounded", isDarkMode ? "bg-white/5" : "bg-white", colorClass)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-tighter", isDarkMode ? "text-slate-500" : "text-slate-600")}>{label}</span>
      </div>
      <span className={cn("text-[11px] font-mono font-bold uppercase", isDarkMode ? "text-white" : "text-slate-900")}>{value}</span>
    </div>
  );

  const NavItem = ({ icon: Icon, tab, label }: { icon: any, tab: Tab, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        "flex flex-col items-center gap-1.5 px-4 py-2 border-b-2 transition-all group",
        activeTab === tab 
          ? "border-blue-500 text-blue-500" 
          : cn("border-transparent", isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-800")
      )}
    >
      <Icon className={cn("w-5 h-5 group-hover:scale-110 transition-transform", activeTab === tab && "animate-pulse")} />
      <span className={cn("text-[10px] uppercase font-bold tracking-widest", !isDarkMode && activeTab !== tab && "text-slate-600")}>{label}</span>
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
                  
                  <p>1. <span className="text-white font-bold">No Financial Advice:</span> AI Bull Chart Analyzer provides algorithmic analysis based on SMC (Smart Money Concepts) and ICT methodologies. This data is for educational and informational purposes ONLY. We are not financial advisors.</p>
                  
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
        {(user && !user.mobile) && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <form 
              onSubmit={async (e) => { 
                e.preventDefault(); 
                const mobile = (e.target as any).mobile.value;
                if (user) {
                  try {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, { mobile, updatedAt: serverTimestamp() });
                    setUser({ ...user, mobile });
                  } catch (err) { console.error(err); }
                }
              }}
              className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-sm w-full text-center space-y-6 shadow-2xl relative"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                <Activity className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase text-white">Mobile Verification Required</h2>
                <p className="text-xs text-slate-500">You must provide your mobile number before you can continue using the application.</p>
              </div>
              <input 
                name="mobile" required placeholder="+1 (555) 000-0000"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-center text-sm focus:outline-none focus:border-blue-500 text-white"
              />
              <button 
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold uppercase text-[11px] rounded-lg hover:bg-blue-500 transition-all"
              >
                Verify & Continue
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
      <header className="h-16 border-b bg-black/40 dark:bg-black/40 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 lg:px-6" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-3 shrink-0">
          <BullLogo className="w-8 h-8 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
          <span className={cn("text-xl font-bold tracking-tight uppercase hidden xl:block", isDarkMode ? "text-white" : "text-slate-900")}>
            AI <span className="text-green-500">BULL</span> ANALYZER
          </span>
        </div>

        <div className="flex-1 overflow-x-auto no-scrollbar mx-4 mask-edges relative">
          <nav className="flex items-center gap-2 min-w-max">
            <NavItem icon={LayoutDashboard} tab="analysis" label="Analysis" />
            <NavItem icon={LineChart} tab="charts" label="Charts" />
            <NavItem icon={Maximize2} tab="education" label="Education" />
            <NavItem icon={Newspaper} tab="updates" label="Updates" />
            <NavItem icon={CreditCard} tab="billing" label="Plans" />
            {user?.isAdmin && (
              <NavItem icon={Settings} tab="admin" label="Admin" />
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <button 
            onClick={toggleTheme}
            className={cn("p-2 rounded-full transition-colors border", isDarkMode ? "hover:bg-white/5 border-white/10" : "hover:bg-black/5 border-black/10")}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
          
          {user ? (
            <div className={cn("flex items-center gap-3 pl-3 border-l", isDarkMode ? "border-white/10" : "border-black/10")}>
              <div className="flex flex-col items-end hidden lg:flex">
                <span className={cn("text-[10px] font-bold uppercase", isDarkMode ? "text-white" : "text-slate-900")}>{user.name}</span>
                <span className={`text-[9px] uppercase tracking-tighter font-bold ${user.isSubscribed ? 'text-green-500' : 'text-slate-400'}`}>
                  {user.isSubscribed ? 'PRO ACTIVE' : 'FREE MODE'}
                </span>
              </div>
              <img src={user.photo} alt="User" className={`w-8 h-8 rounded-full border ${user.isSubscribed ? 'border-green-500/50' : 'border-slate-500/50'}`} />
              <button onClick={() => setActiveTab('profile')} className={cn("p-2 transition-colors", isDarkMode ? "hover:text-blue-400 text-slate-300" : "hover:text-blue-600 text-slate-600")} title="Account Settings">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className={cn("p-2 transition-colors", isDarkMode ? "hover:text-red-400 text-slate-300" : "hover:text-red-600 text-slate-600")} title="Log Out">
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
                <div className="space-y-6">
                  <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-lg flex flex-col sm:flex-row items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-[2px] text-center sm:text-left leading-relaxed">
                      Risk Disclosure: Trading financial instruments involves significant risk. AI analyses are for educational purposes and NOT financial advice.
                    </span>
                  </div>
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
                
                {image && !isAnalyzing && (
                  <button 
                    onClick={() => performAnalysis(image)}
                    className="w-full py-4 bg-blue-600 text-white font-black uppercase text-sm rounded-xl hover:bg-blue-500 transition-all shadow-[0_4px_20px_rgba(59,130,246,0.3)] group flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    Execute AI Analysis
                  </button>
                )}

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

                          <div className={cn("border rounded-xl p-5 mb-6 relative overflow-hidden group", isDarkMode ? "border-white/5" : "border-slate-200")}>
                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                            <h3 className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 relative", isDarkMode ? "text-slate-400" : "text-slate-600")}>Market Context & Thesis</h3>
                            <div className={cn("text-xs leading-relaxed font-mono relative", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                              {analysis.explanation}
                            </div>
                          </div>

                          <div className={cn("pt-4 border-t", isDarkMode ? "border-white/5" : "border-black/5")}>
                            <h4 className={cn("text-[9px] font-bold uppercase tracking-widest mb-3", isDarkMode ? "text-slate-500" : "text-slate-600")}>Detected Concepts</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {analysis.conceptsUsed.map((c, i) => (
                                <div key={i} className={cn("px-2 py-1 border rounded text-[9px] font-mono", isDarkMode ? "bg-white/5 border-white/5 text-slate-300" : "bg-black/5 border-black/5 text-slate-700")}>
                                  {c}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className={cn("text-[10px] font-bold uppercase tracking-widest mb-4", isDarkMode ? "text-slate-400" : "text-slate-600")}>Sentiment Bias</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className={cn("p-4 border rounded-lg text-center transition-all", analysis.trend === "bullish" ? "bg-green-500/10 border-green-500/30 scale-105" : (isDarkMode ? "bg-white/2 border-white/5 opacity-40" : "bg-black/5 border-black/10 opacity-40"))}>
                               <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-500" />
                               <div className={cn("text-[10px] font-bold uppercase", !isDarkMode && "text-slate-800")}>Bullish</div>
                            </div>
                            <div className={cn("p-4 border rounded-lg text-center transition-all", analysis.trend === "bearish" ? "bg-red-500/10 border-red-500/30 scale-105" : (isDarkMode ? "bg-white/2 border-white/5 opacity-40" : "bg-black/5 border-black/10 opacity-40"))}>
                               <TrendingDown className="w-5 h-5 mx-auto mb-2 text-red-500" />
                               <div className={cn("text-[10px] font-bold uppercase", !isDarkMode && "text-slate-800")}>Bearish</div>
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
                              <button 
                                onClick={() => setIsReportModalOpen(true)}
                                className="flex items-center justify-center gap-2 py-2 w-full mt-2 text-[9px] uppercase font-bold text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                Report Objectionable content
                              </button>
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
                    {analysis && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md flex items-center gap-2">
                          <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest line-clamp-1">Educational Analysis Only • Not Financial Advice</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-6 items-center">
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 font-bold">System Path</span>
                        <div className="text-sm font-mono">{analysis?.chartType || "DETECTING..."}</div>
                      </div>
                      <div className="border-l border-white/10 pl-6">
                        <span className="text-[9px] uppercase text-slate-500 font-bold">Timeframe</span>
                        <div className="flex gap-2 mt-1">
                          {["1H", "4H", "D"].map((tf) => (
                            <button
                              key={tf}
                              onClick={() => {
                                setSelectedTimeframe(tf);
                                if (!analyses[tf] && image) {
                                  performAnalysis(image, tf);
                                }
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded font-mono text-[10px] border transition-all",
                                selectedTimeframe === tf 
                                  ? "bg-green-500/20 border-green-500 text-green-400" 
                                  : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                              )}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
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
                  </div>
                  <div 
                      className="flex-1 relative border border-white/5 bg-black/20 rounded-xl overflow-hidden min-h-[300px]"
                      onMouseUp={() => setDraggedLine(null)}
                      onMouseLeave={() => setDraggedLine(null)}
                    >
                      {analysis ? (
                        <>
                          {/* Faint Background Logo */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none">
                            <BullLogo className="w-80 h-80 text-green-500" />
                          </div>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart 
                              data={analysis.simulatedData} 
                              margin={{ top: 20, right: 30, left: -20, bottom: 20 }}
                              onMouseMove={handleChartMouseMove}
                            >
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
                              <Area type="monotone" dataKey="close" stroke={colors.accent} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" animationDuration={2000} />
                              
                              <ReferenceLine 
                                y={analysis.prediction.entry} 
                                stroke="#fbbf24" 
                                strokeWidth={2} 
                                strokeDasharray="5 5" 
                                label={(props: any) => (
                                  <g 
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggedLine('entry'); }}
                                    style={{ cursor: 'ns-resize' }}
                                  >
                                    <rect x={props.viewBox.width - 60} y={props.viewBox.y - 10} width={60} height={20} fill="#fbbf24" rx={4} />
                                    <text x={props.viewBox.width - 30} y={props.viewBox.y + 5} fill="#000" fontSize={10} fontWeight="bold" textAnchor="middle">ENTRY</text>
                                  </g>
                                )} 
                              />
                              <ReferenceLine 
                                y={analysis.prediction.target} 
                                stroke="#22c55e" 
                                strokeWidth={3} 
                                strokeDasharray="3 3" 
                                label={(props: any) => (
                                  <g 
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggedLine('target'); }}
                                    style={{ cursor: 'ns-resize' }}
                                  >
                                    <rect x={props.viewBox.width - 60} y={props.viewBox.y - 10} width={60} height={20} fill="#22c55e" rx={4} />
                                    <text x={props.viewBox.width - 30} y={props.viewBox.y + 5} fill="#000" fontSize={10} fontWeight="bold" textAnchor="middle">TARGET</text>
                                  </g>
                                )} 
                              />
                              <ReferenceLine 
                                y={analysis.prediction.stopLoss} 
                                stroke="#ef4444" 
                                strokeWidth={2} 
                                strokeDasharray="5 5" 
                                label={(props: any) => (
                                  <g 
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggedLine('stopLoss'); }}
                                    style={{ cursor: 'ns-resize' }}
                                  >
                                    <rect x={props.viewBox.width - 60} y={props.viewBox.y - 10} width={60} height={20} fill="#ef4444" rx={4} />
                                    <text x={props.viewBox.width - 30} y={props.viewBox.y + 5} fill="#000" fontSize={10} fontWeight="bold" textAnchor="middle">SL</text>
                                  </g>
                                )} 
                              />
                              
                              {/* Liquidity Pools (Swing Highs/Lows) */}
                              {analysis.simulatedData.map((d, i, arr) => {
                                if (i > 1 && i < arr.length - 2) {
                                  const isSwingHigh = d.high > arr[i-1].high && d.high > arr[i-2].high && d.high > arr[i+1].high && d.high > arr[i+2].high;
                                  const isSwingLow = d.low < arr[i-1].low && d.low < arr[i-2].low && d.low < arr[i+1].low && d.low < arr[i+2].low;
                                  
                                  if (isSwingHigh) {
                                    return (
                                      <ReferenceLine 
                                        key={`sh-${i}`} 
                                        y={d.high} 
                                        stroke="rgba(255,255,255,0.1)" 
                                        strokeWidth={1} 
                                        label={{ value: 'BSL', fill: 'rgba(255,255,255,0.4)', fontSize: 8, position: 'top' }} 
                                      />
                                    );
                                  }
                                  if (isSwingLow) {
                                    return (
                                      <ReferenceLine 
                                        key={`sl-${i}`} 
                                        y={d.low} 
                                        stroke="rgba(255,255,255,0.1)" 
                                        strokeWidth={1} 
                                        label={{ value: 'SSL', fill: 'rgba(255,255,255,0.4)', fontSize: 8, position: 'bottom' }} 
                                      />
                                    );
                                  }
                                }
                                return null;
                              })}
                              <Brush dataKey="time" height={30} stroke="#22c55e" fill="#000" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Activity className="w-20 h-20" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                  </div>
                  
                  {analysis?.instrumentSymbol && (
                    <div className="h-[400px] border border-white/5 bg-black/20 rounded-xl overflow-hidden shadow-2xl relative z-10">
                      <AdvancedRealTimeChart
                        theme={isDarkMode ? "dark" : "light"}
                        symbol={analysis.instrumentSymbol}
                        interval="D"
                        timezone="Etc/UTC"
                        style="1"
                        locale="en"
                        enable_publishing={false}
                        allow_symbol_change={true}
                        container_id={"tv_analysis_" + analysis.instrumentSymbol.replace(/[^a-zA-Z0-9]/g, '')}
                        hide_side_toolbar={false}
                        autosize={true}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                   <div className={cn("md:col-span-3 border rounded-xl p-4 shadow-inner", isDarkMode ? "bg-white/5" : "bg-slate-100/50")} style={{ borderColor: colors.border }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-[10px] uppercase font-bold tracking-tighter", isDarkMode ? "text-slate-500" : "text-slate-600")}>Entry Zone</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${analysis?.prediction.executionType === 'limit' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                          {analysis?.prediction.executionType.toUpperCase()}
                        </span>
                      </div>
                      <div className={cn("text-xl font-mono font-bold", isDarkMode ? "text-yellow-400" : "text-amber-600")}>
                        {analysis ? `$${(analysis.prediction.executionType === 'limit' ? analysis.prediction.limitPrice : analysis.prediction.entry)?.toLocaleString()}` : "---"}
                      </div>
                   </div>
                   <div className={cn("md:col-span-3 border rounded-xl p-4 shadow-inner", isDarkMode ? "bg-white/5" : "bg-slate-100/50")} style={{ borderColor: colors.border }}>
                      <div className={cn("text-[10px] uppercase font-bold mb-1 tracking-tighter", isDarkMode ? "text-slate-500" : "text-green-600")}>Target</div>
                      <div className="text-xl font-mono font-bold text-green-500">{analysis ? `$${analysis.prediction.target.toLocaleString()}` : "---"}</div>
                   </div>
                   <div className={cn("md:col-span-3 border rounded-xl p-4 shadow-inner", isDarkMode ? "bg-white/5" : "bg-slate-100/50")} style={{ borderColor: colors.border }}>
                      <div className={cn("text-[10px] uppercase font-bold mb-1 tracking-tighter", isDarkMode ? "text-slate-500" : "text-red-600")}>Stop Loss</div>
                      <div className="text-xl font-mono font-bold text-red-500">{analysis ? `$${analysis.prediction.stopLoss.toLocaleString()}` : "---"}</div>
                   </div>
                   <div className={cn("md:col-span-2 border rounded-xl p-4 shadow-inner", isDarkMode ? "bg-white/5" : "bg-slate-100/50")} style={{ borderColor: colors.border }}>
                      <div className={cn("text-[10px] uppercase font-bold mb-1 tracking-tighter", isDarkMode ? "text-slate-500" : "text-red-500")}>RR Ratio</div>
                      <div className={cn("text-lg font-mono font-bold", !isDarkMode && "text-slate-900")}>{analysis ? `1:${analysis.prediction.riskRewardRatio}` : "---"}</div>
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
                      <h3 className={cn("text-xl font-bold uppercase tracking-widest", isDarkMode ? "text-white" : "text-slate-900")}>Institutional Logic Summary</h3>
                    </div>
                    <div className={cn("text-sm leading-relaxed font-mono whitespace-pre-wrap p-6 rounded-xl border", isDarkMode ? "bg-black/40 text-slate-400 border-white/5" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      {analysis.prediction.rationale}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
        
          {activeTab === "charts" && <ChartsView />}
          {activeTab === "updates" && <MarketNews />}
          {activeTab === "education" && <BlogSection />}

          {activeTab === "billing" && <Billing onPurchase={handlePurchaseInitiated} />}
          
          {activeTab === "profile" && user && (
            <Profile 
              user={user} 
              onUpdateUser={(data) => setUser({ ...user, ...data })} 
              onCancelSubscription={handleCancelSubscription}
              onUpgradeClick={() => setActiveTab("billing")} 
            />
          )}

          {activeTab === "admin" && user?.isAdmin && <AdminPanel user={user} />}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-12 px-6 border-t flex items-center justify-between bg-black/40 text-[10px] font-mono text-slate-500 shrink-0 sticky bottom-0 z-50 backdrop-blur-sm" style={{ borderColor: colors.border }}>
        <div className="flex gap-4 items-center">
          <span className="opacity-40 uppercase">Latency:</span>
          <span>12ms</span>
          <span className="opacity-40 uppercase ml-4">Terminal:</span>
          <span className="text-blue-500">OPTIMAL</span>
          <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block" />
          <button onClick={() => setIsPrivacyModalOpen(true)} className="hover:text-white transition-colors">Privacy Policy</button>
          <button onClick={() => setIsTermsModalOpen(true)} className="hover:text-white transition-colors">Terms of Service</button>
          <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block" />
          <span className="text-red-500 font-bold uppercase hidden xl:block">Risk Warning: Capital at Risk</span>
        </div>
        <div className="hidden lg:flex gap-8">
           <span>NODE // US-EAST-1</span>
           <span className="text-green-500 uppercase animate-pulse">Live Feed</span>
        </div>
        <div className="text-green-400/80 uppercase tracking-widest text-right">
           © 2026 AI Bull Chart Analyzer
        </div>
      </footer>

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Report Content
                </h2>
                <button onClick={() => setIsReportModalOpen(false)} className="text-slate-500 hover:text-white">
                  <Maximize2 className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-widest leading-loose">
                Help us keep the community safe. If you find this AI-generated content offensive, illegal, or violating policies, please report it.
              </p>
              <form onSubmit={handleReportContent} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Reason</label>
                  <select 
                    required 
                    value={reportReason} 
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select Reason</option>
                    <option value="Offensive/Harassment">Offensive or Harassment</option>
                    <option value="Hate Speech">Hate Speech</option>
                    <option value="Sexually Explicit">Sexually Explicit</option>
                    <option value="Violence">Violence</option>
                    <option value="Dangerous Activities">Dangerous or Illegal Activities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Details (Optional)</label>
                  <textarea 
                    value={reportDetails} 
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 h-24"
                    placeholder="Provide more context..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-red-600 text-white font-bold uppercase text-xs rounded-lg hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
                >
                  Submit Report
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {isPrivacyModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-6 shadow-2xl relative custom-scrollbar">
              <div className="flex justify-between items-center sticky top-0 bg-[#0F1115] pb-4 z-10">
                <h2 className="text-xl font-bold uppercase text-white">Privacy Policy</h2>
                <button onClick={() => setIsPrivacyModalOpen(false)} className="text-slate-500 hover:text-white">
                  <Maximize2 className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="prose prose-invert prose-xs text-slate-400 space-y-4">
                <p>Last updated: May 08, 2026</p>
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">1. Data Collection</h3>
                <p>We collect minimal personal data: email, name, and profile photo provided via authentication. We also collect chart images you upload for analysis.</p>
                
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">2. Use of AI</h3>
                <p>Your uploaded charts are processed by Google's Gemini AI. No personal data is shared with the AI beyond the visual information in the chart.</p>
                
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">3. User Controls</h3>
                <p>You can view, edit, or delete your account data at any time through the Profile section. Reports on content are reviewed by our administration team.</p>
                
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">4. Policy Compliance</h3>
                <p>We strictly adhere to Google Play Developer Policies regarding AI-generated content and user data protection.</p>
              </div>
              <button 
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold uppercase text-xs rounded-lg hover:bg-white/10 transition-all font-mono"
              >
                Close Protocol
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {isTermsModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0F1115] border border-white/10 p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-6 shadow-2xl relative custom-scrollbar">
              <div className="flex justify-between items-center sticky top-0 bg-[#0F1115] pb-4 z-10">
                <h2 className="text-xl font-bold uppercase text-white">Terms of Service</h2>
                <button onClick={() => setIsTermsModalOpen(false)} className="text-slate-500 hover:text-white">
                  <Maximize2 className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="prose prose-invert prose-xs text-slate-400 space-y-4">
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">1. Acceptance</h3>
                <p>By using AI Bull Chart Analyzer, you agree to these terms. This terminal is for educational and technical analysis purposes only.</p>
                
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">2. AI Accuracy & Financial Risk</h3>
                <p>AI predictions are probabilistic and not financial advice. Trading contains high risk of losing your entire capital. Analysis is based on SMC/ICT concepts but DOES NOT guarantee results. Users should perform their own due diligence before making any financial decisions.</p>
                
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">3. Content Moderation</h3>
                <p>Users are forbidden from uploading offensive, illegal, or NSFW content. All AI-generated content is subject to reporting and review.</p>
                
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mt-6">4. Intellectual Property</h3>
                <p>All trademarks and logos are the property of their respective owners. AI Bull Chart Analyzer is a technical analysis tool.</p>
              </div>
              <button 
                onClick={() => setIsTermsModalOpen(false)}
                className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold uppercase text-xs rounded-lg hover:bg-white/10 transition-all font-mono"
              >
                Close Protocol
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
