import React from "react";
import { X, Copy, Facebook, Instagram, Send, MessageCircle, Share2, Link } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export default function ShareModal({ isOpen, onClose, url, title }: ShareModalProps) {
  const shareLinks = [
    { name: "WhatsApp", icon: MessageCircle, color: "bg-green-500", link: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}` },
    { name: "Telegram", icon: Send, color: "bg-blue-400", link: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { name: "Facebook", icon: Facebook, color: "bg-blue-600", link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: "Instagram", icon: Instagram, color: "bg-pink-600", link: `https://www.instagram.com/` } // Instagram doesn't have a direct share URL for web
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-[#0F1115] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-500" />
                Share Analysis
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 opacity-50" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {shareLinks.map((app) => (
                <a
                  key={app.name}
                  href={app.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <app.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tighter opacity-50">{app.name}</span>
                </a>
              ))}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Copy terminal link</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono truncate opacity-60">
                  {url}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
