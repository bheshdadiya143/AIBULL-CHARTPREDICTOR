import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Users, FileText, CheckCircle, Database, ShieldAlert, Trash2, Activity, Download, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function AdminPanel({ user }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [supportQueries, setSupportQueries] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number, high?: number, low?: number }>>({});
  
  const [activeTab, setActiveTab] = useState<'users' | 'blogs' | 'reports' | 'signals' | 'support'>('users');
  
  // Edit User Modal
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFreeUses, setEditFreeUses] = useState(0);
  const [editProDays, setEditProDays] = useState(0);

  // Blog form
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogImageUrl, setBlogImageUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'signals') {
      fetchSignals();
    } else if (activeTab === 'support') {
      fetchSupportQueries();
    }
  }, [activeTab]);

  useEffect(() => {
    // Only poll live prices if on signals tab and there are active signals
    if (activeTab !== 'signals' || signals.length === 0) return;
    
    const fetchPrices = async () => {
      const activeSymbols: string[] = Array.from(new Set(signals.filter(s => s.status === 'active').map(s => String(s.instrument))));
      for (const symbol of activeSymbols) {
        try {
          const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`);
          if (res.ok) {
            const data = await res.json();
            setLivePrices(prev => ({ ...prev, [symbol]: { price: data.price, high: data.high, low: data.low } }));
            
            // Check TP / SL hit using OHLC (high/low) so we don't miss intra-period hits
            const signalsForSymbol = signals.filter(s => s.status === 'active' && s.instrument === symbol);
            for (const sig of signalsForSymbol) {
               const bias = sig.analysis?.prediction?.bias;
               const tp = parseFloat(sig.analysis?.prediction?.target);
               const sl = parseFloat(sig.analysis?.prediction?.stopLoss);
               
               // Use High, Low if available, otherwise fallback to current price
               const currentPrice = data.price;
               const periodHigh = data.high || currentPrice;
               const periodLow = data.low || currentPrice;
               
               let hitStatus = null;
               if (bias === 'bullish' || bias === 'long') {
                 if (periodHigh >= tp && tp > 0) hitStatus = 'tp_hit';
                 else if (periodLow <= sl && sl > 0) hitStatus = 'sl_hit';
               } else if (bias === 'bearish' || bias === 'short') {
                 if (periodLow <= tp && tp > 0) hitStatus = 'tp_hit';
                 else if (periodHigh >= sl && sl > 0) hitStatus = 'sl_hit';
               }
               
               if (hitStatus) {
                  await updateDoc(doc(db, "signals", sig.id), { status: hitStatus });
                  fetchSignals(); // Refresh the list
               }
            }
          }
        } catch (e) {
          console.error("Failed to fetch price for " + symbol, e);
        }
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 900000); // Check every 15m as requested
    return () => clearInterval(interval);
  }, [activeTab, signals]);

  const fetchSignals = async () => {
    try {
      const snap = await getDocs(collection(db, "signals"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setSignals(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "signals");
    }
  };

  const fetchSupportQueries = async () => {
    try {
      const snap = await getDocs(collection(db, "support_queries"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setSupportQueries(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "support_queries");
    }
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "users");
    }
  };

  const fetchReports = async () => {
    try {
      const snap = await getDocs(collection(db, "reports"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setReports(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "reports");
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status: "resolved" });
      fetchReports();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report record?")) return;
    try {
      await deleteDoc(doc(db, "reports", reportId));
      fetchReports();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `reports/${reportId}`);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const updates: any = { 
        freeUses: editFreeUses,
        updatedAt: serverTimestamp()
      };

      if (editProDays === -1) {
         updates.isSubscribed = false;
         updates.subscriptionExpiresAt = 0;
      } else if (editProDays > 0) {
         updates.isSubscribed = true;
         // If already has an expiration in the future, add to it, else start from now
         const existingExpires = editingUser.subscriptionExpiresAt;
         const start = (existingExpires && existingExpires > Date.now()) ? existingExpires : Date.now();
         updates.subscriptionExpiresAt = start + (editProDays * 24 * 60 * 60 * 1000);
      }

      await updateDoc(doc(db, "users", editingUser.id), updates);
      setEditingUser(null);
      fetchUsers();
      alert("User updated successfully");
    } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `users/${editingUser.id}`);
    }
  };

  const handlePostBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle || !blogContent) return;
    setIsPosting(true);
    try {
      const payload: any = {
        title: blogTitle,
        content: blogContent,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (blogImageUrl) {
        payload.imageUrl = blogImageUrl;
      }
      await addDoc(collection(db, "posts"), payload);
      setBlogTitle('');
      setBlogContent('');
      setBlogImageUrl('');
      alert("Blog posted successfully");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "posts");
    } finally {
       setIsPosting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Database className="w-6 h-6 text-green-500" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-white">Admin Dashboard</h2>
      </div>

      <div className="flex gap-2 lg:gap-4 overflow-x-auto no-scrollbar pb-2 mask-edges relative">
        <button 
          onClick={() => setActiveTab('users')}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <Users className="w-4 h-4 inline-block mr-2" /> User Database
        </button>
        <button 
          onClick={() => setActiveTab('blogs')}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'blogs' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <FileText className="w-4 h-4 inline-block mr-2" /> Post Blog
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <ShieldAlert className="w-4 h-4 inline-block mr-2" /> 
          Reports 
          {reports.filter(r => r.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
              {reports.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('signals')}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'signals' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <Activity className="w-4 h-4 inline-block mr-2" /> Live Signals
        </button>
        <button 
          onClick={() => setActiveTab('support')}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <MessageSquare className="w-4 h-4 inline-block mr-2" /> 
          Support 
          {supportQueries.filter(q => q.status === 'open').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
              {supportQueries.filter(q => q.status === 'open').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'signals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#0F1115] border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
              <thead className="bg-white/5 text-xs uppercase text-slate-400 font-bold border-b border-white/10">
                <tr>
                  <th className="px-6 py-3">Timestamp / User</th>
                  <th className="px-6 py-3">Pair / Symbol (ID)</th>
                  <th className="px-6 py-3 text-center">Prediction (TF)</th>
                  <th className="px-6 py-3 text-right">Entry</th>
                  <th className="px-6 py-3 text-right">Live / Cmp</th>
                  <th className="px-6 py-3 text-right">TP</th>
                  <th className="px-6 py-3 text-right">SL</th>
                  <th className="px-6 py-3 text-center">Status / Feedback</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {signals.map(s => {
                  const p = s.analysis?.prediction || {};
                  const live = livePrices[s.instrument];
                  const bias = p.bias || 'neutral';
                  const isLong = bias === 'bullish' || bias === 'long';
                  const isShort = bias === 'bearish' || bias === 'short';
                  
                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-xs">{new Date(s.createdAt?.seconds * 1000).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">{s.userName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-blue-400">{s.instrument}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1">ID: {s.id}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          isLong ? "bg-green-500/20 text-green-500" : isShort ? "bg-red-500/20 text-red-500" : "bg-slate-500/20 text-slate-400"
                        )}>
                          {bias} ({s.timeframe})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs">{p.entry || p.limitPrice || '---'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-mono text-xs text-yellow-400 font-bold">{live?.price || '---'}</div>
                        {live?.high && live?.low && (
                           <div className="text-[9px] text-slate-500 font-mono mt-1">H:{live.high.toFixed(2)} L:{live.low.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-green-400">{p.target || '---'}</td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-red-400">{p.stopLoss || '---'}</td>
                      <td className="px-6 py-4 text-center flex flex-col items-center gap-1 mt-2">
                        {s.status === 'active' && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded uppercase font-bold animate-pulse">Tracking</span>}
                        {s.status === 'tp_hit' && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold">TP Hit 🏆</span>}
                        {s.status === 'sl_hit' && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded uppercase font-bold">SL Hit ❌</span>}
                        {s.status === 'closed' && <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-[10px] rounded uppercase font-bold">Closed</span>}
                        
                        {s.feedback && (
                          <span className={cn(
                            "px-1.5 py-0.5 mt-1 text-[9px] rounded uppercase font-bold",
                            s.feedback === 'accurate' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                          )}>
                            USER_FB: {s.feedback}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s.analysis, null, 2));
                            const dlAnchorElem = document.createElement('a');
                            dlAnchorElem.setAttribute("href",     dataStr     );
                            dlAnchorElem.setAttribute("download", `${s.instrument}_${s.timeframe}_analysis.json`);
                            dlAnchorElem.click();
                          }}
                          className="p-1.5 bg-white/5 text-slate-300 rounded hover:bg-white/10 transition-colors"
                          title="Download Full JSON Analysis"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {signals.length === 0 && (
                   <tr>
                     <td colSpan={9} className="px-6 py-8 text-center text-slate-500 italic">No signals generated yet.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#0F1115] border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-white/5 text-xs uppercase text-slate-400 font-bold border-b border-white/10">
                <tr>
                  <th className="px-6 py-3">Name / Email</th>
                  <th className="px-6 py-3">Mobile Number</th>
                  <th className="px-6 py-3">Plan / Free Uses</th>
                  <th className="px-6 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {u.mobile || 'Not Provided'}
                    </td>
                    <td className="px-6 py-4">
                      {u.isSubscribed ? (
                         <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-[10px] font-bold uppercase">PRO</span>
                      ) : (
                         <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-[10px] font-bold uppercase">FREE</span>
                      )}
                      <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">Free Uses: <span className="font-mono text-white">{u.freeUses}</span></div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <button
                         onClick={() => {
                           setEditingUser(u);
                           setEditFreeUses(u.freeUses);
                           setEditProDays(0);
                         }}
                         className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/40 transition-colors text-xs font-bold"
                       >
                         Edit User
                       </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">No users found.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'blogs' && (
        <motion.form onSubmit={handlePostBlog} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0F1115] border border-white/10 rounded-xl p-6 space-y-4 max-w-2xl">
           <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500"/> Publish Educational Post</h3>
           <div>
             <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Blog Title</label>
             <input type="text" required value={blogTitle} onChange={e => setBlogTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Master Smart Money Concepts" />
           </div>
           <div>
             <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Image URL (Optional)</label>
             <input type="url" value={blogImageUrl} onChange={e => setBlogImageUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="https://example.com/image.jpg" />
           </div>
           <div>
             <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Blog Content (Markdown supported)</label>
             <textarea required value={blogContent} onChange={e => setBlogContent(e.target.value)} rows={10} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm" placeholder="Write educational content here..." />
           </div>
           <button type="submit" disabled={isPosting} className="px-6 py-3 bg-blue-600 text-white font-bold uppercase rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50">
             {isPosting ? 'Publishing...' : 'Publish Blog Post'}
           </button>
        </motion.form>
      )}

      {activeTab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#0F1115] border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-white/5 text-xs uppercase text-slate-400 font-bold border-b border-white/10">
                <tr>
                  <th className="px-6 py-3">Reported By</th>
                  <th className="px-6 py-3">Reason / Details</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-mono text-xs">{r.reporterId}</div>
                      <div className="text-[10px] text-slate-500">{new Date(r.createdAt?.seconds * 1000).toLocaleString() || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-red-400 text-xs uppercase">{r.reason}</div>
                      <div className="text-xs text-slate-400 mt-1 max-w-xs">{r.details || "No additional details."}</div>
                      <div className="text-[10px] text-slate-600 mt-1 italic">Type: {r.contentType} // ID: {r.contentId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                        r.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {r.status === 'pending' && (
                        <button 
                          onClick={() => handleResolveReport(r.id)}
                          className="p-2 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40"
                          title="Mark as Resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteReport(r.id)}
                        className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/40"
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">No reports found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'support' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {supportQueries.map(q => (
            <div key={q.id} className="bg-[#0F1115] border border-white/10 rounded-xl p-5 shadow-2xl relative flex flex-col items-start text-left">
              <div className="flex items-start justify-between w-full mb-4">
                <div>
                  <h3 className="font-bold text-white text-sm">{q.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    {q.email} {q.mobile && <span>• {q.mobile}</span>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${q.status === 'open' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-green-500/30 text-green-400 bg-green-500/10'}`}>
                    {q.status}
                  </span>
                  {q.status === 'open' && (
                    <button 
                      onClick={async () => {
                        const newResponse = window.prompt("Enter your response to the user:");
                        if (newResponse) {
                          try {
                            await updateDoc(doc(db, "support_queries", q.id), { 
                               response: newResponse, 
                               status: 'closed', 
                               updatedAt: serverTimestamp() 
                            });
                            fetchSupportQueries();
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, "support_queries");
                          }
                        }
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-xs font-bold uppercase text-white rounded transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      if (window.confirm('Delete this query?')) {
                        try {
                           await deleteDoc(doc(db, "support_queries", q.id));
                           fetchSupportQueries();
                        } catch (err) {
                           handleFirestoreError(err, OperationType.DELETE, "support_queries");
                        }
                      }
                    }}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-lg text-sm text-slate-300 w-full">
                <span className="text-xs font-bold uppercase text-slate-500 block mb-2">User Query:</span>
                "{q.query}"
              </div>
              {q.response && (
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm text-slate-200 w-full">
                  <span className="text-xs font-bold uppercase text-blue-400 block mb-2">Admin Response:</span>
                  "{q.response}"
                </div>
              )}
            </div>
          ))}
          {supportQueries.length === 0 && (
             <div className="bg-[#0F1115] border border-white/10 rounded-xl p-8 text-center text-slate-500 italic">
               No support queries yet.
             </div>
          )}
        </motion.div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0F1115] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white">Edit User: {editingUser.name}</h3>
            
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Free Uses Count</label>
              <input 
                type="number" 
                value={editFreeUses} 
                onChange={(e) => setEditFreeUses(parseInt(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Subscription Time (Days)</label>
              <select 
                value={editProDays} 
                onChange={(e) => setEditProDays(parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value={0}>No Change</option>
                <option value={-1}>Revoke PRO Access</option>
                <option value={7}>Grant PRO for 7 Days</option>
                <option value={30}>Grant PRO for 30 Days</option>
                <option value={90}>Grant PRO for 90 Days</option>
                <option value={365}>Grant PRO for 365 Days</option>
              </select>
              {editingUser.subscriptionExpiresAt > 0 && (
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>Current Expiry:</span>
                  <span className={editingUser.subscriptionExpiresAt > Date.now() ? "text-green-400" : "text-red-400"}>
                     {new Date(editingUser.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setEditingUser(null)} 
                className="flex-1 py-3 bg-white/5 text-slate-300 font-bold uppercase text-xs rounded-lg hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser} 
                className="flex-1 py-3 bg-blue-600 text-white font-bold uppercase text-xs rounded-lg hover:bg-blue-500 transition-all"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
