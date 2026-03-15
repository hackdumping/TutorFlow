import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // According to typical Django password reset flows
            await api.post('auth/password-reset/', { email });
            setIsSubmitted(true);
        } catch (err) {
            // Even if email not found, usually better to show success to prevent enumeration
            // but we can show error if it's a real API failure
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none rounded-b-[100px] blur-3xl opacity-50" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40 animate-pulse" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass p-10 md:p-12 rounded-[4rem] border border-white shadow-premium text-center">
                    <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-600 transition-colors mb-10 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour à la connexion
                    </Link>

                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                                    <Sparkles className="w-8 h-8 text-sky-500" />
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 leading-none text-center">Mot de passe <br /><span className="text-slate-400">oublié ?</span></h1>
                                <p className="text-slate-500 font-medium italic mb-10 text-center">Entrez votre email pour recevoir un lien de réinitialisation.</p>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email professionnel</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                            <input
                                                type="email"
                                                required
                                                className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                                                placeholder="votre@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-6 bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer le lien"}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8"
                            >
                                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-100/50">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Email Envoyé !</h2>
                                <p className="text-slate-500 font-medium text-sm mb-10 mx-auto max-w-[280px]">
                                    Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe d'ici quelques instants.
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sky-600 transition-colors shadow-lg"
                                >
                                    Retour à la connexion
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                        &copy; {new Date().getFullYear()} TutorFlow Elite. Tous droits réservés.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;
