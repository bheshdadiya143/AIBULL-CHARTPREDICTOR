import React, { useState } from "react";
import { BookOpen, Search, Filter, ArrowRight, User, Clock } from "lucide-react";
import { motion } from "motion/react";

const MOCK_BLOGS = [
  {
    id: 1,
    title: "Understanding RSI Divergence in High Volatility Markets",
    summary: "A deep dive into why RSI divergence is one of the most reliable reversal signals and how to filter out fakeouts using AI analysis.",
    author: "AI Analyst Alpha",
    date: "May 15, 2026",
    category: "Strategy",
    image: "https://images.unsplash.com/photo-1611974717411-ae764723ca20?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    title: "Quarterly Market Outlook: The Crypto Bull Run Cycle",
    summary: "Exploring the macro factors driving the current Bitcoin cycle and what technical milestones we need to see for continuation.",
    author: "Market Master",
    date: "May 10, 2026",
    category: "Analysis",
    image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    title: "Risk Management: The 1% Rule in Professional Trading",
    summary: "Why most retail traders fail and how professional capital managers preserve liquidity during drawdown periods.",
    author: "Admin",
    date: "May 05, 2026",
    category: "Education",
    image: "https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=800"
  }
];

export default function BlogSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [readingBlog, setReadingBlog] = useState<number | null>(null);

  const filteredBlogs = activeCategory === "All" 
    ? MOCK_BLOGS 
    : MOCK_BLOGS.filter(blog => blog.category === activeCategory);

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-blue-500 w-6 h-6" />
            Terminal Education & Strategy
          </h2>
          <p className="text-sm text-slate-500">Expert analysis and system updates from the AI Bull team.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search intel..." 
              className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {["All", "Strategy", "Analysis", "Education", "Updates"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCategory === cat 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBlogs.map((blog, idx) => (
          <motion.article 
            key={blog.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all flex flex-col h-full"
          >
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={blog.image} 
                alt={blog.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                {blog.category}
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1 justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    {blog.author}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {blog.date}
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-tight group-hover:text-blue-400 transition-colors">
                  {blog.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {blog.summary}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <button 
                  onClick={() => setReadingBlog(blog.id)}
                  className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors group/btn"
                >
                  {readingBlog === blog.id ? "Securing Decryption..." : "Read Full Intelligence"}
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      
      {readingBlog && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div className="bg-[#1A1D23] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 md:p-12 space-y-6">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-3 py-1 bg-blue-500/10 rounded-full">
                {MOCK_BLOGS.find(b => b.id === readingBlog)?.category}
              </span>
              <button onClick={() => setReadingBlog(null)} className="text-slate-500 hover:text-white uppercase text-[10px] font-bold">Close Intel</button>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">{MOCK_BLOGS.find(b => b.id === readingBlog)?.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
               <span>By {MOCK_BLOGS.find(b => b.id === readingBlog)?.author}</span>
               <span>•</span>
               <span>{MOCK_BLOGS.find(b => b.id === readingBlog)?.date}</span>
            </div>
            <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
              <p>{MOCK_BLOGS.find(b => b.id === readingBlog)?.summary}</p>
              <p>This is a protected intelligence briefing. To access the full technical framework including backtested entry models, please ensure your Terminal Subscription is active. Our SMC models indicate high-probability liquidity pools forming near recently established PDHs/PDLs.</p>
              <p>Institutional order flow tracking suggests significant accumulation signatures in the lower timeframes. Use the AI Bull Analyzer tool to verify these levels on your specific chart pairings.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
