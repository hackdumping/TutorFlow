import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const [messages, setMessages] = useState([
        { text: "Bonjour ! Je suis TutorBot. Comment puis-je vous aider aujourd'hui ?", isBot: true }
    ]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState('');

    // Hide chatbot on messages page - must be after hooks
    if (location.pathname === '/messages') return null;

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { text: input, isBot: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        setTimeout(() => {
            let reply = "C'est une excellente question ! Laissez-moi vérifier nos ressources pour vous.";
            if (input.toLowerCase().includes('prix') || input.toLowerCase().includes('tarif')) {
                reply = "Les tarifs des professeurs varient de 2000 XAF à 10 000 XAF par heure selon le niveau et l'expérience en zone CEMAC.";
            } else if (input.toLowerCase().includes('paiement') || input.toLowerCase().includes('mobile money')) {
                reply = "Nous acceptons Orange Money (OM) et MTN Mobile Money (MoMo) pour une flexibilité totale dans toute l'Afrique Centrale.";
            } else if (input.toLowerCase().includes('besoin') || input.toLowerCase().includes('aide')) {
                reply = "Je suis là pour vous guider. Souhaitez-vous trouver un mentor ou en savoir plus sur nos programmes ?";
            }
            setMessages(prev => [...prev, { text: reply, isBot: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        }, 1200);
    };

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-28 lg:bottom-8 right-8 w-16 h-16 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[100] group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <MessageCircle className="w-7 h-7 relative z-10 group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-sky-500 rounded-full border-4 border-white animate-pulse z-20"></div>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95, transformOrigin: 'bottom right' }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            height: isMinimized ? '80px' : 'min(600px, calc(100vh - 140px))'
                        }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-28 lg:bottom-8 right-4 lg:right-8 w-[400px] max-w-[calc(100vw-32px)] lg:max-w-[calc(100vw-64px)] bg-white rounded-[2.5rem] shadow-premium border border-white/50 z-[110] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-slate-950 p-6 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-600/10 rounded-full blur-3xl"></div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black flex items-center gap-2 uppercase tracking-tight">TutorBot <Sparkles className="w-3 h-3 text-sky-400" /></h4>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">Assistant Actif</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 relative z-10">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                                >
                                    <motion.div animate={{ rotate: isMinimized ? 180 : 0 }}>
                                        <ChevronDown className="w-4 h-4" />
                                    </motion.div>
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-red-500/20 rounded-xl transition-colors text-slate-400 hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 scrollbar-hide">
                                    {messages.map((m, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: m.isBot ? -10 : 10, y: 5 }}
                                            animate={{ opacity: 1, x: 0, y: 0 }}
                                            key={i}
                                            className={`flex flex-col ${m.isBot ? 'items-start' : 'items-end'}`}
                                        >
                                            <div className={`max-w-[85%] p-5 rounded-[1.5rem] text-xs font-bold leading-relaxed shadow-sm ${m.isBot
                                                ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                                : 'bg-slate-950 text-white rounded-tr-none'
                                                }`}>
                                                {m.text}
                                            </div>
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2">
                                                {m.time || 'A l\'instant'}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Input Area */}
                                <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                                    <form onSubmit={handleSend} className="relative group">
                                        <input
                                            type="text"
                                            placeholder="Comment pouvons-nous vous aider ?"
                                            className="w-full bg-slate-50 border-2 border-transparent rounded-[1.2rem] pl-6 pr-14 py-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                        />
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-slate-950 text-white rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-slate-200 active:scale-90 group-hover:rotate-12">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                    <p className="text-[8px] text-center text-slate-400 mt-4 uppercase font-black tracking-widest italic">
                                        Propulsé par TutorFlow AI • zone CEMAC
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>

    );
};

export default Chatbot;
