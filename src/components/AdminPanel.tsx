import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, FileText, CheckCircle, Database } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminPanel({ user }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'blogs'>('users');
  
  // Edit User Modal
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFreeUses, setEditFreeUses] = useState(0);
  const [editProDays, setEditProDays] = useState(0); // 0 = no change, -1 = revoke, >0 = add days

  // Blog form
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogImageUrl, setBlogImageUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "users");
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

      <div className="flex gap-4">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <Users className="w-4 h-4 inline-block mr-2" /> User Database
        </button>
        <button 
          onClick={() => setActiveTab('blogs')}
          className={`px-4 py-2 text-sm font-bold uppercase rounded-lg transition-colors ${activeTab === 'blogs' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <FileText className="w-4 h-4 inline-block mr-2" /> Post Blog
        </button>
      </div>

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
