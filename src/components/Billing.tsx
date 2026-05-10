import React from "react";
import { Check, ShieldCheck, Zap, Star, Crown, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

const TIERS = [
  {
    id: "monthly",
    name: "Standard",
    price: "$49",
    duration: "Month",
    description: "Perfect for casual traders starting with AI signals.",
    features: ["Standard AI Analysis", "Daily Market Reports", "Blog Access", "Basic News Feed"],
    icon: Zap,
    color: "blue"
  },
  {
    id: "3-months",
    name: "Growth",
    price: "$75",
    duration: "3 Months",
    description: "Optimized for consistent market participation.",
    features: ["Priority Processing", "Pattern Alerts", "Advanced News Sync", "Community Blog Access"],
    icon: Star,
    color: "purple",
    popular: true
  },
  {
    id: "6-months",
    name: "Professional",
    price: "$139",
    duration: "6 Months",
    description: "Built for deep technical analysis and trend-following.",
    features: ["Ultra-Fast Analysis", "Deep Logic Logs", "Localized News Tiers", "Ad-Free Experience"],
    icon: Crown,
    color: "emerald"
  },
  {
    id: "yearly",
    name: "Institution",
    price: "$249",
    duration: "1 Year",
    description: "Full suite of quantum tools for serious capital management.",
    features: ["All Features Included", "Beta Tool Access", "Unlimited Exports", "Direct Support"],
    icon: ShieldCheck,
    color: "amber"
  }
];

export default function Billing({ 
  onPurchase, 
  currentPlanId, 
  isSubscribed 
}: { 
  onPurchase: (tierId: string) => void, 
  currentPlanId?: string,
  isSubscribed?: boolean 
}) {
  return (
    <div className="py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          {isSubscribed ? "Your Terminal Level is Active" : "Select your Bull Terminal level."}
        </h1>
        <p className="text-slate-400">
          Professional grade technical analysis at your fingertips. Guaranteed security 
          via <span className="text-blue-400 font-bold mx-1">Google Play Billing</span> 
          integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier) => {
          const isActive = isSubscribed && currentPlanId === tier.id;
          
          return (
            <motion.div
              key={tier.id}
              whileHover={!isActive ? { y: -5 } : {}}
              className={`relative p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                isActive
                  ? "bg-blue-600/20 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)]"
                  : tier.popular 
                    ? "bg-green-600/10 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.1)]" 
                    : "bg-white/5 border-white/10 text-white"
              }`}
            >
              {isActive && (
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full flex items-center gap-1">
                   <ShieldCheck className="w-3 h-3" />
                   Currently Active
                 </div>
              )}
              {tier.popular && !isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full">
                  Professional Choice
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500/20 text-blue-400' : tier.popular ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    <tier.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider">{tier.name}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-slate-500 text-sm">/ {tier.duration}</span>
                </div>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">{tier.description}</p>
                
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs opacity-80 text-slate-300">
                      <Check className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-500' : tier.popular ? 'text-green-500' : 'text-blue-500'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => !isActive && onPurchase(tier.id)}
                disabled={isActive}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/50 cursor-default"
                    : tier.popular 
                      ? "bg-green-600 hover:bg-green-500 text-white shadow-lg" 
                      : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                {isActive ? "Plan Activated" : "Unlock Terminal"}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-500">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold tracking-tight">No-Risk Refund Guarantee</h4>
            <p className="text-sm text-slate-500">Cancel within the first 72 hours and get a 100% partial-free refund. No questions asked.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <ShieldCheck className="w-8 h-8 opacity-20" />
        </div>
      </div>
    </div>
  );
}
