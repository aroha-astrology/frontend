'use client';

import './cosmic-app.css';
import { useState } from 'react';
import { MessageCircle, Heart, User, Send } from 'lucide-react';
import { CosmicBg } from '@/components/cosmic-app/CosmicBg';
import { CardCarousel } from '@/components/cosmic-app/CardCarousel';
import { FeatureList } from '@/components/cosmic-app/FeatureList';
import { AppNav, type TabId } from '@/components/cosmic-app/AppNav';

// ─── Chat Tab ─────────────────────────────────────────────
function ChatTab() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot' as const, text: 'Namaste! Ask the cosmos anything about your chart, transit, or daily energies.' },
  ]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), sender: 'user' as const, text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'The stars are contemplating your question… 🌟',
      }]);
    }, 900);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden pb-24">
      {/* Chat header */}
      <div className="glass-panel px-4 py-3 flex items-center z-10">
        <div className="w-9 h-9 rounded-full flex items-center justify-center border border-yellow-500/30"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#3730a3)' }}>
          <span className="text-yellow-200 text-base">✦</span>
        </div>
        <div className="ml-3">
          <p className="text-white text-sm cinzel-font font-bold leading-tight">Cosmic Guide</p>
          <p className="text-[10px] text-green-400 leading-tight">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 text-sm shadow-lg ${msg.sender === 'user' ? 'chat-bubble-sent text-white' : 'chat-bubble-received text-blue-50'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="glass-panel rounded-full flex items-center px-4 py-2 gap-3">
          <input
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
            placeholder="Ask the cosmos…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-blue-300 disabled:opacity-40"
            style={{ background: 'rgba(37,99,235,0.25)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Match Tab ─────────────────────────────────────────────
function MatchTab() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 pb-24">
      <div className="glass-panel rounded-3xl p-8 w-full text-center border border-pink-500/20">
        <Heart size={48} className="mx-auto text-pink-400 mb-4 opacity-60" />
        <h2 className="cinzel-font text-xl mb-2 text-white">Kundli Milan</h2>
        <p className="text-gray-400 text-sm mb-6 font-light leading-relaxed">
          Check compatibility based on ancient Vedic principles.
        </p>
        <button className="btn-gradient w-full py-3 rounded-full font-semibold text-sm uppercase tracking-wider border-pink-500/40">
          Enter Partner Details
        </button>
      </div>
    </div>
  );
}

// ─── Home Tab ──────────────────────────────────────────────
function HomeTab({ name }: { name: string }) {
  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
      <CardCarousel />

      {/* Visual separator */}
      <div className="my-4 px-8 relative flex justify-center items-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
        <div className="absolute w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
      </div>

      <FeatureList />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return (
    <>
      <CosmicBg />

      <div
        className="relative w-full min-h-screen max-w-md mx-auto flex flex-col overflow-hidden"
        style={{ background: 'transparent', color: '#e0e5ff', zIndex: 1, fontFamily: 'var(--font-lato, var(--font-inter, sans-serif))' }}
      >
        {/* Top Header */}
        <div className="pt-12 px-6 pb-2 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400 font-light">Welcome back,</p>
              <h1
                className="cinzel-font text-2xl font-bold text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(to right, #fff, #9ca3af)' }}
              >
                Seeker
              </h1>
            </div>
            <div className="w-10 h-10 rounded-full border border-yellow-500/30 glass-panel flex items-center justify-center">
              <User size={20} className="text-gray-300" />
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'home' && <HomeTab name="Seeker" />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'match' && <MatchTab />}
        </div>

        <AppNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
}
