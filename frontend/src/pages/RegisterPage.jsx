import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, User, GraduationCap, Loader2, CheckCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
    const [role, setRole] = useState('student');
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        password: '',
        gender: 'M'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await register({ ...formData, role });
            if (user.role === 'teacher') navigate('/teacher-dashboard');
            else navigate('/student-dashboard');
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Une erreur est survenue lors de l'inscription.";
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 rounded-full blur-[120px] opacity-40"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-6xl glass rounded-[4rem] shadow-premium overflow-hidden flex flex-col md:flex-row min-h-[800px] relative z-10 border border-white/50"
            >
                {/* Left Panel */}
                <div className="md:w-[35%] bg-slate-950 p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden text-center md:text-left">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full -ml-32 -mt-32 blur-3xl"></div>

                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 justify-center md:justify-start mb-16 group">
                            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:rotate-12 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tight">Tutor<span className="text-sky-600">Flow</span></span>
                        </Link>

                        <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-[0.95] tracking-tighter">Bâtissons <br /> l'avenir.</h2>
                        <p className="text-slate-400 font-medium text-sm leading-relaxed mb-12 max-w-xs mx-auto md:mx-0">Rejoignez la communauté éducative la plus dynamique d'Afrique Centrale.</p>

                        <div className="space-y-6 hidden md:block">
                            {[
                                "Mentorat d'élite",
                                "Sécurisé Mobile Money",
                                "Suivi 360°"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-sky-600 group-hover:border-sky-500 transition-all">
                                        <CheckCircle className="w-4 h-4 text-sky-500 group-hover:text-white" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 hidden md:block mt-12">
                        <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden">
                            <Sparkles className="absolute top-4 right-4 w-6 h-6 text-sky-500/20" />
                            <p className="text-xs font-medium italic text-slate-300 leading-relaxed">"TutorFlow est la plateforme que nous attendions tous au Cameroun."</p>
                            <p className="text-[10px] font-black text-sky-500 mt-4 uppercase tracking-widest">— Dr. Atangana, Inspecteur</p>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="md:w-[65%] p-12 lg:p-20 bg-white/40 flex flex-col justify-center">
                    <div className="max-w-2xl mx-auto w-full">
                        <header className="mb-12 text-center md:text-left">
                            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Créer un compte.</h1>
                            <p className="text-slate-500 font-medium italic">Choisissez votre rôle pour commencer l'aventure.</p>
                        </header>

                        <div className="grid grid-cols-2 gap-6 mb-12">
                            {[
                                { id: 'student', label: 'Élève', sub: 'Je veux apprendre', icon: GraduationCap },
                                { id: 'teacher', label: 'Professeur', sub: 'Je veux enseigner', icon: User }
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id)}
                                    className={`flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all active:scale-95 relative overflow-hidden group ${role === r.id ? 'border-sky-600 bg-white shadow-2xl shadow-sky-100' : 'border-transparent bg-slate-50/50 hover:bg-white hover:border-sky-100'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${role === r.id ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'bg-white text-slate-400 shadow-sm'}`}>
                                        <r.icon className="w-7 h-7" />
                                    </div>
                                    <div className="text-center">
                                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${role === r.id ? 'text-sky-600' : 'text-slate-400'}`}>{r.sub}</span>
                                        <span className={`text-sm font-black uppercase tracking-[0.2em] ${role === r.id ? 'text-slate-900' : 'text-slate-600'}`}>{r.label}</span>
                                    </div>
                                    {role === r.id && <motion.div layoutId="activeRole" className="absolute top-4 right-4 w-2 h-2 rounded-full bg-sky-600" />}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4 mb-12">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sexe</label>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'M', label: 'Masculin' },
                                    { id: 'F', label: 'Féminin' }
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender: g.id })}
                                        className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] border-2 transition-all active:scale-95 ${formData.gender === g.id ? 'border-sky-600 bg-sky-50 text-sky-600 shadow-lg shadow-sky-100' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-white hover:border-sky-100'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">{g.label}</span>
                                        {formData.gender === g.id && <CheckCircle className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-8 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 text-center">
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Prénom</label>
                                    <input required name="first_name" type="text" value={formData.first_name} onChange={handleChange} className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" placeholder="Jean" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nom</label>
                                    <input required name="last_name" type="text" value={formData.last_name} onChange={handleChange} className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" placeholder="Dupont" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identifiant</label>
                                    <input required name="username" type="text" value={formData.username} onChange={handleChange} className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" placeholder="jean.dupont" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
                                    <input required name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" placeholder="jean@tutorflow.com" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mot de passe</label>
                                <div className="relative">
                                    <input
                                        required
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                disabled={isLoading}
                                className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98] group mt-10"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Créer mon compte <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>

                        <p className="mt-12 text-center text-xs font-medium text-slate-500">
                            Déjà membre ? <Link to="/login" className="font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest text-[10px] ml-2 border-b-2 border-sky-100 hover:border-sky-600 transition-all">Se connecter</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
