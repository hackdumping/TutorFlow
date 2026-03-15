import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, MessageSquare, Calendar, Clock, User,
    Video, Copy, CheckCheck, Wifi, WifiOff, BookOpen
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const VirtualClassroomPage = () => {
    const { bookingId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [jitsiReady, setJitsiReady] = useState(false);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await api.get(`bookings/${bookingId}/`);
                const b = res.data;
                // Security: Only the student or teacher of this booking can access
                const userId = user?.user_id;
                const isStudent = b.student === userId || b.student_details?.id === userId;
                const isTeacher = b.teacher_details?.user?.id === userId;
                if (!isStudent && !isTeacher) {
                    setError('Accès non autorisé à cette salle de classe.');
                    return;
                }
                if (b.course_type !== 'online') {
                    setError('Cette réservation est un cours en présentiel.');
                    return;
                }
                setBooking(b);
            } catch (err) {
                if (err.response?.status === 404) {
                    setError('Réservation introuvable.');
                } else {
                    setError("Erreur lors du chargement de la session.");
                }
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchBooking();
    }, [bookingId, user]);

    const copyLink = () => {
        navigator.clipboard.writeText(booking?.meeting_link || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (date, time) => {
        if (!date || !time) return '';
        const d = new Date(`${date}T${time}`);
        return d.toLocaleString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Video className="w-10 h-10 text-sky-500" />
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <WifiOff className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{error}</h2>
                    <button onClick={() => navigate(-1)} className="mt-6 px-8 py-3 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const teacherName = `${booking?.teacher_details?.user?.first_name || ''} ${booking?.teacher_details?.user?.last_name || ''}`.trim();
    const studentName = `${booking?.student_details?.first_name || ''} ${booking?.student_details?.last_name || ''}`.trim();
    const subjectName = booking?.subject_details?.name || 'Matière';
    const roomUrl = booking?.meeting_link || `https://meet.jit.si/tutorflow-${bookingId}`;

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-white">
            {/* Header */}
            <div className="bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
                        <Video className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="font-black text-sm">{subjectName}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TutorFlow Classroom</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
                        <span className="text-[10px] font-black uppercase tracking-widest">En direct</span>
                    </div>
                    <Link
                        to={`/messages?with=${booking?.teacher_details?.user?.id || booking?.student_details?.id}&booking=${bookingId}`}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 hidden sm:block">Chat</span>
                    </Link>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
                {/* Jitsi Meet iframe */}
                <div className="flex-1 relative bg-black">
                    <iframe
                        src={roomUrl}
                        className="w-full h-full border-none"
                        allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media; fullscreen"
                        allowFullScreen
                        title="Salle de cours virtuelle"
                        onLoad={() => setJitsiReady(true)}
                    />
                    {!jitsiReady && (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                            <div className="text-center">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                >
                                    <Video className="w-8 h-8 text-white" />
                                </motion.div>
                                <p className="text-slate-400 font-bold text-sm">Connexion à la salle...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Sidebar */}
                <div className="w-full lg:w-80 bg-slate-900 border-l border-white/5 flex flex-col overflow-y-auto">
                    {/* Session Info */}
                    <div className="p-5 border-b border-white/5">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Détails de la séance</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="text-sm font-bold text-white">{subjectName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="text-sm font-medium text-slate-300">{formatDate(booking?.date, booking?.time)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="text-sm font-medium text-slate-300">{booking?.duration_hours}h de cours</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-sky-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Professeur</p>
                                    <p className="text-sm font-bold text-white">{teacherName}</p>
                                </div>
                            </div>
                            {studentName && (
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Élève</p>
                                        <p className="text-sm font-bold text-white">{studentName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meeting Link */}
                    <div className="p-5 border-b border-white/5">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">Lien de la salle</h3>
                        <div className="bg-white/5 rounded-2xl p-4 break-all text-xs text-slate-300 font-mono mb-3">
                            {roomUrl}
                        </div>
                        <button
                            onClick={copyLink}
                            className={`w-full py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                        >
                            {copied ? <><CheckCheck className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier le lien</>}
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="p-5">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">Conseils</h3>
                        <div className="space-y-2 text-xs text-slate-500">
                            <p className="flex items-center gap-2"><Wifi className="w-3 h-3 text-sky-500" /> Connexion stable recommandée</p>
                            <p className="flex items-center gap-2"><Video className="w-3 h-3 text-violet-500" /> Testez votre caméra avant de commencer</p>
                            <p className="flex items-center gap-2"><MessageSquare className="w-3 h-3 text-emerald-500" /> Utilisez le chat pour les questions</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VirtualClassroomPage;
