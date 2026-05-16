import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface SupportChatProps {
  user: any;
}

export default function SupportChat({ user }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string, role: 'user' | 'bot', text: string }[]>([
    { id: '1', role: 'bot', text: 'Hi there! I am your AI Support Bot. How can I help you with the AI Bull Chart Analyzer today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Create a ticket for the user's message
      try {
        await addDoc(collection(db, 'support_queries'), {
          userId: user.uid,
          email: user.email,
          name: user.name,
          mobile: user.mobile || null,
          query: userMsg.text,
          status: 'open',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'support_queries');
      }

      // Ask Gemini for auto-reply
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg.text, 
          history: messages.slice(-5) // Send last 5 messages for context
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: 'Sorry, I am having trouble connecting to the support server right now.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: 'An error occurred while sending your message.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-transform hover:scale-110 z-40 flex items-center gap-2 font-bold uppercase text-xs"
      >
        <MessageCircle className="w-5 h-5" /> Support
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 bg-[#0F1115] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            style={{ height: '500px', maxHeight: '80vh' }}
          >
            <div className="bg-blue-600 p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2 text-white font-bold uppercase text-sm">
                <Bot className="w-5 h-5" /> Support Bot
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-white/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-[#1A1D24] text-slate-200 border border-white/5 rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-700 text-slate-300">
                     <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl text-sm bg-[#1A1D24] text-slate-200 border border-white/5 rounded-tl-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
