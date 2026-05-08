import React, { useState, useEffect } from "react";
import { BookOpen, Search, Filter, ArrowRight, User, Clock } from "lucide-react";
import { motion } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function BlogSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [readingBlog, setReadingBlog] = useState<any | null>(null);
  const [blogs, setBlogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
      }));
      setBlogs(data);
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, "posts");
    });
    return () => unsubscribe();
  }, []);

  const filteredBlogs = activeCategory === "All" 
    ? blogs 
    : blogs.filter(blog => (blog.category || "Education") === activeCategory);

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
                src={blog.imageUrl || "https://images.unsplash.com/photo-1611974717411-ae764723ca20?auto=format&fit=crop&q=80&w=800"} 
                alt={blog.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                {blog.category || "Education"}
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1 justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Admin
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {new Date(blog.createdAt?.seconds * 1000).toLocaleDateString() || "Recent"}
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-tight group-hover:text-blue-400 transition-colors">
                  {blog.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {blog.content.substring(0, 100)}...
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <button 
                  onClick={() => setReadingBlog(blog)}
                  className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors group/btn"
                >
                  {readingBlog?.id === blog.id ? "Securing Decryption..." : "Read Full Intelligence"}
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
                {readingBlog.category || "Education"}
              </span>
              <button onClick={() => setReadingBlog(null)} className="text-slate-500 hover:text-white uppercase text-[10px] font-bold">Close Intel</button>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">{readingBlog.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
               <span>By Admin</span>
               <span>•</span>
               <span>{new Date(readingBlog.createdAt?.seconds * 1000).toLocaleDateString() || "Recent"}</span>
            </div>
            {readingBlog.imageUrl && (
              <img src={readingBlog.imageUrl} alt={readingBlog.title} className="w-full rounded-2xl object-cover max-h-80" />
            )}
            <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
              <div className="whitespace-pre-wrap">{readingBlog.content}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
