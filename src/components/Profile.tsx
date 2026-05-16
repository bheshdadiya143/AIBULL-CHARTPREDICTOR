import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, CreditCard, Save, Smartphone, Mail, Edit3, X, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import SupportChat from './SupportChat';

interface ProfileProps {
  user: any;
  onUpdateUser: (data: Partial<any>) => void;
  onCancelSubscription: () => void;
  onUpgradeClick: () => void;
}

export default function Profile({ user, onUpdateUser, onCancelSubscription, onUpgradeClick }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        mobile,
        updatedAt: serverTimestamp()
      });
      onUpdateUser({ name, mobile });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <User className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">User Profile</h1>
          <p className="text-sm text-slate-400">Manage your personal information and subscription status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Info Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-2 space-y-6">
          <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" /> Personal Information
              </h2>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg"
                >
                  <Edit3 className="w-3 h-3" /> Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-5">
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Display Name</label>
                  {isEditing ? (
                     <input 
                       type="text" 
                       value={name} 
                       onChange={(e) => setName(e.target.value)} 
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                       required
                     />
                  ) : (
                     <div className="text-white text-lg font-medium">{user.name}</div>
                  )}
               </div>

               <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Email Address</label>
                  <div className="flex items-center gap-2 text-slate-300 bg-white/5 border border-white/5 rounded-lg px-4 py-3 opacity-70">
                    <Mail className="w-4 h-4" /> {user.email} <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded ml-auto">Immutable</span>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Mobile Number</label>
                  {isEditing ? (
                     <input 
                       type="tel" 
                       value={mobile} 
                       onChange={(e) => setMobile(e.target.value)} 
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                       placeholder="+1 (555) 000-0000"
                       required
                     />
                  ) : (
                     <div className="text-slate-300 flex items-center gap-2">
                       <Smartphone className="w-4 h-4 text-slate-500" /> {user.mobile || <span className="italic text-slate-600">Not provided</span>}
                     </div>
                  )}
               </div>

               {isEditing && (
                 <div className="flex gap-3 pt-4 border-t border-white/10">
                   <button 
                     type="button" 
                     onClick={() => {
                        setIsEditing(false);
                        setName(user.name);
                        setMobile(user.mobile || '');
                     }}
                     className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2"
                   >
                     <X className="w-4 h-4" /> Cancel
                   </button>
                   <button 
                     type="submit" 
                     disabled={isSaving}
                     className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2 ml-auto shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
                   >
                     {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                   </button>
                 </div>
               )}
            </form>
          </div>
        </motion.div>

        {/* Subscription & Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
           <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <CreditCard className="w-5 h-5 text-slate-400" /> Subscription Status
              </h2>

              <div className="flex flex-col items-center text-center py-4">
                <img src={user.photo} alt="User" className="w-20 h-20 rounded-full border border-white/20 mb-4" />
                <span className={`text-xs uppercase font-bold px-4 py-1.5 rounded-full mb-3 ${user.isSubscribed ? 'bg-green-500/20 text-green-500 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-slate-500/20 text-slate-300 border border-slate-500/20'}`}>
                  {user.isSubscribed ? 'PRO MEMBERSHIP ACTIVE' : 'FREE MEMBERSHIP'}
                </span>
                {user.isSubscribed && user.subscriptionExpiresAt > 0 && (
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                    Renews: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="bg-black/30 rounded-lg p-4 border border-white/5 space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500" /> Free Analysis</span>
                   <span className="text-white font-bold font-mono bg-white/10 px-2 py-0.5 rounded">{user.freeUses} Left</span>
                 </div>
              </div>

              <div className="pt-2">
                {user.isSubscribed ? (
                  <button 
                    onClick={onCancelSubscription}
                    className="w-full py-3 bg-red-600/10 border border-red-600/30 text-red-500 font-bold uppercase text-xs rounded-lg hover:bg-red-600 hover:text-white transition-all"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <button 
                    onClick={onUpgradeClick}
                    className="w-full py-3 bg-green-600 border justify-center border-green-500/30 text-white font-bold uppercase text-xs rounded-lg hover:bg-green-500 transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(34,197,94,0.3)]"
                  >
                    <CreditCard className="w-4 h-4" /> Upgrade to Pro
                  </button>
                )}
              </div>
           </div>
        </motion.div>

      </div>
      <SupportChat user={user} />
    </div>
  );
}
