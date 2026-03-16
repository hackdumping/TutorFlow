import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Users, Calendar, Clock,
    Settings, CheckCircle, TrendingUp, BookOpen,
    Bell, ChevronRight, LayoutDashboard, LogOut,
    Sparkles, User, Star, Plus, PieChart, Menu, X,
    Video, MapPin, MessageSquare, Check, XCircle, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDesktop } from '../hooks/useDesktop';
import api from '../api/axios';

const TeacherDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const isDesktop = useDesktop();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [filterMode, setFilterMode] = useState('week'); // 'week' or 'all'
    const [activeTab, setActiveTab] = useState('overview');

    // Teacher specific features
    const [teacherProfile, setTeacherProfile] = useState(null);
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [newRate, setNewRate] = useState('');
    const [isSavingRate, setIsSavingRate] = useState(false);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [students, setStudents] = useState([]);
    const [newSessionData, setNewSessionData] = useState({
        student: '',
        subject: '',
        date: '',
        time: '',
        duration_hours: 1,
        course_type: 'online'
    });
    const [subjects, setSubjects] = useState([]);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [studentSearch, setStudentSearch] = useState({ name: '', city: '', country: '' });
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [sessionCreated, setSessionCreated] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

    const filteredStudents = students.filter(s => {
        const matchesName = `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.name.toLowerCase());
        const matchesCity = !studentSearch.city || (s.city && s.city.toLowerCase().includes(studentSearch.city.toLowerCase()));
        const matchesCountry = !studentSearch.country || (s.country && s.country.toLowerCase().includes(studentSearch.country.toLowerCase()));
        return matchesName && matchesCity && matchesCountry;
    });

    // Close sidebar when switching to desktop
    useEffect(() => {
        if (isDesktop) setIsSidebarOpen(false);
    }, [isDesktop]);

    const updateBookingStatus = useCallback(async (bookingId, newStatus) => {
        setUpdatingStatus(bookingId);
        try {
            await api.patch(`bookings/${bookingId}/update_status/`, { status: newStatus });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingStatus(null);
        }
    }, []);

    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await api.get('bookings/');
                setBookings(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchTeacherProfile = async () => {
            try {
                const res = await api.get('teachers/me/');
                setTeacherProfile(res.data);
                setNewRate(res.data.hourly_rate);
            } catch (err) {
                console.error("Error fetching teacher profile", err);
            }
        };

        const fetchStudents = async () => {
            try {
                const res = await api.get('users/chat-contacts/');
                setStudents(res.data.filter(u => u.role === 'student'));
            } catch (err) { }
        };

        const fetchSubjects = async () => {
            try {
                const res = await api.get('subjects/');
                setSubjects(res.data);
            } catch (err) { }
        };

        const fetchNotifications = async () => {
            try {
                const res = await api.get('notifications/');
                // ONLY show new bookings for teachers on the dashboard bell
                const filtered = res.data.filter(n => n.type === 'new_booking');
                setNotifications(filtered);
                setUnreadNotificationsCount(filtered.filter(n => !n.is_read).length);
            } catch (err) { }
        };

        fetchBookings();
        fetchTeacherProfile();
        fetchStudents();
        fetchSubjects();
        fetchNotifications();

        const interval = setInterval(() => {
            fetchBookings();
            fetchNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleUpdateRate = async () => {
        setIsSavingRate(true);
        try {
            const res = await api.patch(`teachers/${teacherProfile.id}/`, { hourly_rate: newRate });
            setTeacherProfile(res.data);
            setIsEditingRate(false);
        } catch (err) {
            console.error("Error updating rate", err);
        } finally {
            setIsSavingRate(false);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!newSessionData.student || !newSessionData.subject || !newSessionData.date || !newSessionData.time) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }
        setIsCreatingSession(true);
        try {
            // teacher_profile is what the backend expects for 'teacher' field if NOT request.user, 
            // but here request.user IS the teacher, so perform_create handles it.
            // We just need to send student and subject
            await api.post('bookings/', {
                ...newSessionData
            });
            setSessionCreated(true);
            // Refresh bookings
            const response = await api.get('bookings/');
            setBookings(response.data);
            // Reset form
            setNewSessionData({
                student: '',
                subject: '',
                date: '',
                time: '',
                duration_hours: 1,
                course_type: 'online'
            });
        } catch (err) {
            console.error("Error creating session", err);
        } finally {
            setIsCreatingSession(false);
        }
    };

    // Dynamic Stats Calculation
    const totalEarnings = bookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (parseFloat(b.teacher_details?.hourly_rate || 0) * b.duration_hours), 0);

    const uniqueStudents = new Set(bookings.map(b => b.student)).size;

    const statsData = {
        earnings: Math.round(totalEarnings),
        students: uniqueStudents,
        sessions: bookings.filter(b => b.status === 'completed').length,
        pending: bookings.filter(b => b.status === 'pending').length
    };

    return (
        <div className="min-h-screen bg-slate-100/50 text-slate-900 font-sans selection:bg-sky-100 overflow-x-hidden">
            {/* Mobile Sidebar Overlay (Premium Independence) */}
            <AnimatePresence>
                {!isDesktop && isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140]"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-[80vw] max-w-sm bg-white z-[150] overflow-y-auto p-8 shadow-2xl"
                        >
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-between mb-12">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <span className="font-black text-slate-900">TutorFlow</span>
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-xl">
                                        <X className="w-5 h-5 text-slate-900" />
                                    </button>
                                </div>

                                <div className="mb-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
                                    <img src={user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} className="w-14 h-14 rounded-2xl object-cover bg-white relative z-10" alt="" />
                                    <div className="relative z-10">
                                        <p className="font-black text-slate-900 text-sm leading-tight">
                                            {user?.teacher_profile?.academic_title === 'Dr' ? 'Dr.' : user?.teacher_profile?.academic_title === 'Pr' ? 'Pr.' : user?.teacher_profile?.academic_title === 'Mme' ? 'Mme' : 'M.'} {user?.last_name}
                                        </p>
                                        <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{user?.role}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {/* Sidebar Navigation Items */}
                                    {[
                                        { name: 'Dashboard', icon: LayoutDashboard, handler: () => setActiveTab('overview') },
                                        { name: 'Cours', icon: BookOpen, handler: () => setActiveTab('schedule') },
                                        { name: 'Messages', icon: MessageSquare, handler: () => navigate('/messages') },
                                        { name: 'Profil', icon: User, handler: () => navigate('/profile') },
                                        { name: 'Revenus', icon: PieChart, handler: () => setActiveTab('revenue') }
                                    ].map((item) => (
                                        <button
                                            key={item.name}
                                            onClick={() => {
                                                item.handler();
                                                setIsSidebarOpen(false);
                                            }}
                                            className="w-full flex items-center gap-4 py-4 px-6 text-xs font-black text-slate-950 uppercase tracking-widest border border-transparent hover:border-slate-100 hover:bg-slate-50 rounded-2xl transition-all"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            {item.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-auto pt-8 border-t border-slate-100">
                                    <button
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="w-full py-4 text-center font-black text-[10px] uppercase tracking-widest bg-slate-950 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
                                    >
                                        Fermer le menu
                                    </button>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-32">
                {/* Mobile Toggle Button */}
                <div className="lg:hidden fixed bottom-8 right-8 z-[100]">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-16 h-16 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-sky-600 transition-all active:scale-95 border-4 border-white"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 items-start relative">
                    {/* Desktop Side Bar */}
                    <aside className="hidden lg:block w-80 sticky top-32">
                        <div className="bg-white/60 backdrop-blur-xl shadow-sm border border-slate-200/60 text-center rounded-3xl p-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                            <div className="relative inline-block mb-8">
                                <div className="absolute -inset-2 bg-gradient-to-tr from-sky-500 to-purple-500 rounded-[3rem] opacity-20 blur-xl"></div>
                                <img
                                    src={user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                    className="w-28 h-28 rounded-[2.5rem] bg-white p-2 border-2 border-white shadow-xl relative z-10 object-cover"
                                    alt="avatar"
                                />
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg z-20">
                                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                                {user?.teacher_profile?.academic_title === 'Dr' ? 'Dr.' : user?.teacher_profile?.academic_title === 'Pr' ? 'Pr.' : user?.teacher_profile?.academic_title === 'Mme' ? 'Mme' : 'M.'} {user?.last_name}
                            </h2>
                            <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-4 italic">Enseignant Certifié CEMAC</p>

                            {/* Hourly Rate Quick Edit */}
                            <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tarif Horaire</p>
                                {isEditingRate ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={newRate}
                                            onChange={(e) => setNewRate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 outline-none text-sm font-bold"
                                        />
                                        <button
                                            onClick={handleUpdateRate}
                                            disabled={isSavingRate}
                                            className="p-2 bg-sky-600 text-white rounded-xl active:scale-95 disabled:opacity-50"
                                        >
                                            {isSavingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setIsEditingRate(false)} className="p-2 bg-white text-slate-400 rounded-xl">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsEditingRate(true)}>
                                        <span className="text-lg font-black text-slate-900">{teacherProfile?.hourly_rate || '0.00'} <span className="text-[10px] text-slate-400">FCFA/h</span></span>
                                        <Settings className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Desktop Navigation Menu */}
                        <div className="mt-8 space-y-3">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <LayoutDashboard className="w-4 h-4" /> Vue d'ensemble
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'schedule' ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <BookOpen className="w-4 h-4" /> Mes Cours
                            </button>
                            <Link to="/messages" className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-black text-[10px] uppercase tracking-widest transition-all">
                                <MessageSquare className="w-4 h-4" /> Messagerie
                            </Link>
                            <Link to="/profile" className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-black text-[10px] uppercase tracking-widest transition-all">
                                <User className="w-4 h-4" /> Mon Profil
                            </Link>
                            <button
                                onClick={() => setActiveTab('revenue')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'revenue' ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <PieChart className="w-4 h-4" /> Revenus
                            </button>

                            <div className="pt-6 border-t border-slate-100 mt-6">
                                <button
                                    onClick={() => logout(navigate)}
                                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> Déconnexion
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Dashboard Content */}
                    <div className="flex-1 space-y-12 w-full">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-6">
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="lg:hidden w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <Menu className="w-6 h-6" />
                                    </button>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600">Bonjour, {user?.first_name} 👋</h2>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-[0.95]">Centre de <br /> <span className="text-slate-400">Management Élite.</span></h1>
                                <p className="text-slate-500 font-medium italic">Analysez votre performance et gérez vos élèves en temps réel.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                                        className={`p-4 rounded-2xl border border-slate-100 relative group transition-all ${showNotificationsDropdown ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-white text-slate-400 hover:text-sky-600 hover:border-sky-100 hover:bg-sky-50'}`}
                                    >
                                        <Bell className={`w-6 h-6 transition-colors ${showNotificationsDropdown ? 'text-sky-600' : 'text-slate-400 group-hover:text-sky-600'}`} />
                                        {unreadNotificationsCount > 0 && (
                                            <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-100 flex items-center justify-center text-[7px] text-white font-bold">
                                                {unreadNotificationsCount}
                                            </span>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {showNotificationsDropdown && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setShowNotificationsDropdown(false)}
                                                    className="fixed inset-0 z-[160]"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute top-full left-0 md:left-auto md:right-0 mt-4 w-[calc(100vw-3rem)] sm:w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[170] origin-top-left md:origin-top-right"
                                                >
                                                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notifications</span>
                                                        {notifications.length > 0 && (
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await api.patch('notifications/mark_all_read/');
                                                                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                                                            setUnreadNotificationsCount(0);
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                        }
                                                                    }}
                                                                    className="text-[9px] font-bold text-sky-600 hover:underline"
                                                                >
                                                                    Tout lu
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('Supprimer toutes les notifications ?')) {
                                                                            try {
                                                                                await api.delete('notifications/delete_all/');
                                                                                setNotifications([]);
                                                                                setUnreadNotificationsCount(0);
                                                                            } catch (e) {
                                                                                console.error(e);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-[9px] font-bold text-red-500 hover:underline"
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                        {notifications.length === 0 ? (
                                                            <div className="p-12 text-center">
                                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                    <Bell className="w-8 h-8 text-slate-200" />
                                                                </div>
                                                                <p className="text-xs text-slate-400 font-medium italic">Aucun nouveau cours programmé.</p>
                                                            </div>
                                                        ) : (
                                                            notifications.map((notif) => (
                                                                <button
                                                                    key={notif.id}
                                                                    onClick={async () => {
                                                                        if (!notif.is_read) {
                                                                            try {
                                                                                await api.patch(`notifications/${notif.id}/mark_read/`);
                                                                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                                                                                setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
                                                                            } catch (e) {
                                                                                console.error(e);
                                                                            }
                                                                        }
                                                                        setShowNotificationsDropdown(false);
                                                                        // For teachers, new_booking means checking the dashboard
                                                                        if (notif.type === 'new_booking') {
                                                                            setActiveTab('schedule');
                                                                        }
                                                                    }}
                                                                    className={`w-full p-6 flex items-start gap-4 hover:bg-slate-50 transition-all text-left border-b border-slate-50/50 last:border-0 ${!notif.is_read ? 'bg-sky-50/30' : ''}`}
                                                                >
                                                                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${notif.type === 'new_booking' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                                                                        {notif.type === 'new_booking' ? <Calendar className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[11px] font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">{notif.title}</p>
                                                                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{notif.content}</p>
                                                                        <p className="text-[9px] text-slate-400 mt-2 font-bold flex items-center gap-1.5">
                                                                            <Clock className="w-3 h-3" />
                                                                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                    {!notif.is_read && (
                                                                        <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 mt-1 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                                                                    )}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button
                                    onClick={() => {
                                        setSessionCreated(false);
                                        setShowNewSessionModal(true);
                                    }}
                                    className="px-8 py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-500 transition-colors flex items-center gap-3 active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> Nouvelle Session
                                </button>
                            </div>
                        </header>

                        {/* Stats Grid */}
                        {(activeTab === 'overview' || activeTab === 'revenue') && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                {[
                                    { label: 'Revenus', val: `${statsData.earnings} F`, icon: DollarSign, color: 'emerald' },
                                    { label: 'Élèves', val: statsData.students, icon: Users, color: 'sky' },
                                    { label: 'Sessions', val: statsData.sessions, icon: CheckCircle, color: 'purple' },
                                    { label: 'En attente', val: statsData.pending, icon: Clock, color: 'amber' },
                                ].map((s, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i}
                                        className={`bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <s.icon className={`w-12 h-12 ${s.color === 'emerald' ? 'text-emerald-500' :
                                                s.color === 'sky' ? 'text-sky-500' :
                                                    s.color === 'purple' ? 'text-purple-500' : 'text-amber-500'
                                                }`} />
                                        </div>
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            s.color === 'sky' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                                s.color === 'purple' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                            <s.icon className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{s.val}</div>
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Main Content Sections */}
                        <div className={`grid gap-12 ${activeTab === 'overview' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
                            {/* Schedule List */}
                            {(activeTab === 'overview' || activeTab === 'schedule') && (
                                <div className={activeTab === 'overview' ? "lg:col-span-2" : "col-span-1"}>
                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60">
                                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-sky-600" />
                                            </div>
                                            {filterMode === 'week' ? 'Semaine ' : 'Agenda '} <span className="font-medium text-slate-400">{filterMode === 'week' ? 'complète' : 'complet'}</span>
                                        </h2>
                                        <button
                                            onClick={() => setFilterMode(prev => prev === 'week' ? 'all' : 'week')}
                                            className="text-xs font-bold text-sky-600 uppercase tracking-wider px-4 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors"
                                        >
                                            {filterMode === 'week' ? 'Voir Tout' : 'Semaine Complète'}
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {loading ? (
                                            [1, 2].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>)
                                        ) : bookings.length > 0 ? (
                                            bookings.filter(b => {
                                                if (filterMode === 'all') return true;
                                                const bDate = new Date(b.date);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const nextWeek = new Date(today);
                                                nextWeek.setDate(today.getDate() + 7);
                                                return bDate >= today && bDate <= nextWeek;
                                            }).length > 0 ? bookings.filter(b => {
                                                if (filterMode === 'all') return true;
                                                const bDate = new Date(b.date);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const nextWeek = new Date(today);
                                                nextWeek.setDate(today.getDate() + 7);
                                                return bDate >= today && bDate <= nextWeek;
                                            }).map((booking) => (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                                                            <span className="text-[10px] font-bold uppercase text-slate-500">
                                                                {new Date(booking.date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()}
                                                            </span>
                                                            <span className="text-xl font-black text-slate-900 tracking-tight">
                                                                {new Date(booking.date).getDate()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">{booking.subject_details?.name}</span>
                                                                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${booking.course_type === 'online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                                                    }`}>
                                                                    {booking.course_type === 'online' ? <><Video className="w-3 h-3" /> En ligne</> : <><MapPin className="w-3 h-3" /> Présentiel</>}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-slate-900 text-[15px]">
                                                                {booking.student_details?.first_name} {booking.student_details?.last_name || `Élève #${booking.student}`}
                                                            </h4>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                                    <Clock className="w-4 h-4 text-slate-400" /> {booking.time?.substring(0, 5)} · {booking.duration_hours}h
                                                                </p>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                                                                    booking.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                                    }`}>{booking.status === 'confirmed' ? 'Confirmé' : booking.status === 'cancelled' ? 'Annulé' : 'En attente'}</span>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/messages?with=${booking.student_details?.id || booking.student}`);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                                                    title="Discuter avec l'élève"
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                                                        {booking.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                                                    disabled={updatingStatus === booking.id}
                                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                                                                >
                                                                    <Check className="w-4 h-4" /> Accepter
                                                                </button>
                                                                <button
                                                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                                    disabled={updatingStatus === booking.id}
                                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <XCircle className="w-4 h-4" /> Refuser
                                                                </button>
                                                            </>
                                                        )
                                                        }
                                                        {
                                                            booking.status === 'confirmed' && booking.course_type === 'online' && (
                                                                <Link
                                                                    to={`/classroom/${booking.id}`}
                                                                    className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-xs hover:bg-indigo-600 transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                                                                >
                                                                    <Video className="w-4 h-4" /> Rejoindre
                                                                </Link>
                                                            )
                                                        }
                                                    </div>
                                                </motion.div>
                                            )) : (
                                                <div className="text-center p-8 bg-white/50 rounded-3xl border border-slate-100">
                                                    <p className="text-slate-500 font-medium italic">Aucune session pour cette période.</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="bg-slate-50 rounded-3xl p-16 border border-slate-100 border-dashed text-center">
                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                    <Calendar className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <p className="text-slate-500 font-medium text-sm">Aucune session prévue pour le moment.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Performance Radar Sidebar */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10"></div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            Impact Score
                                        </h3>
                                        <div className="space-y-8">
                                            <div>
                                                <div className="flex justify-between items-end text-xs font-bold uppercase tracking-wider mb-3">
                                                    <span className="text-slate-500">Satisfaction Élèves</span>
                                                    <span className="text-slate-900 text-sm">4.9/5</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} whileInView={{ width: '98%' }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-indigo-500 rounded-full"></motion.div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-end text-xs font-bold uppercase tracking-wider mb-3">
                                                    <span className="text-slate-500">Réactivité</span>
                                                    <span className="text-slate-900 text-sm">100%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }} className="h-full bg-emerald-500 rounded-full"></motion.div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Revenue Tab */}
                        {activeTab === 'revenue' && (
                            <div className="bg-white p-12 rounded-[3rem] border border-slate-200/60 shadow-sm text-center">
                                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border 
border-emerald-100">
                                    <DollarSign className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tighter">Revenus Détaillés</h2>
                                <p className="text-slate-500 font-medium max-w-md mx-auto mb-10 leading-relaxed">L'historique complet de vos transactions et paiements arrivera très prochainement dans cette section dédiée.</p>
                                <button className="px-10 py-5 bg-slate-950 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sky-600 transition-colors shadow-xl shadow-slate-900/10 active:scale-95">Télécharger le rapport (Bientôt)</button>
                            </div>
                        )}
                    </div>
                </div >
            </main >
            {/* New Session Modal */}
            < AnimatePresence >
                {showNewSessionModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNewSessionModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-950 p-8 text-white relative">
                                <Sparkles className="absolute top-6 right-6 w-8 h-8 text-sky-400 opacity-20" />
                                <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Programmer une séance</h3>
                                <p className="text-sky-400 text-[10px] font-black uppercase tracking-[0.2em]">Créez un nouvel engagement avec votre élève.</p>
                            </div>

                            {sessionCreated ? (
                                <div className="p-12 text-center space-y-8">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100"
                                    >
                                        <CheckCircle className="w-12 h-12" />
                                    </motion.div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Session Confirmée</h3>
                                        <p className="text-slate-500 font-medium italic">Votre élève a été notifié et la session est ajoutée à votre agenda.</p>
                                    </div>
                                    <button
                                        onClick={() => { setShowNewSessionModal(false); setSessionCreated(false); }}
                                        className="w-full py-5 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-sky-600 transition-all active:scale-95"
                                    >
                                        Terminer
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateSession} className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Trouver l'élève</label>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    placeholder="Nom..."
                                                    value={studentSearch.name}
                                                    onChange={(e) => setStudentSearch({ ...studentSearch, name: e.target.value })}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Ville..."
                                                    value={studentSearch.city}
                                                    onChange={(e) => setStudentSearch({ ...studentSearch, city: e.target.value })}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Pays..."
                                                    value={studentSearch.country}
                                                    onChange={(e) => setStudentSearch({ ...studentSearch, country: e.target.value })}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                                                />
                                            </div>
                                            <select
                                                required
                                                value={newSessionData.student}
                                                onChange={(e) => setNewSessionData({ ...newSessionData, student: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none transition-all"
                                            >
                                                <option value="">
                                                    {studentSearch.name || studentSearch.city || studentSearch.country
                                                        ? `Résultats (${filteredStudents.length})...`
                                                        : 'Sélectionner un élève...'
                                                    }
                                                </option>
                                                {filteredStudents.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.first_name} {s.last_name} ({s.city || '???'}, {s.country || '???'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Matière</label>
                                            <select
                                                required
                                                value={newSessionData.subject}
                                                onChange={(e) => setNewSessionData({ ...newSessionData, subject: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none transition-all"
                                            >
                                                <option value="">Sélectionner la matière...</option>
                                                {teacherProfile?.subjects?.map(sub => (
                                                    <option key={sub.id} value={sub.id}>
                                                        {sub.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Durée (Heures)</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    required
                                                    value={newSessionData.duration_hours}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, duration_hours: parseFloat(e.target.value) })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Format</label>
                                                <select
                                                    value={newSessionData.course_type}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, course_type: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none"
                                                >
                                                    <option value="online">En ligne</option>
                                                    <option value="in_person">Présentiel</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={newSessionData.date}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, date: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Heure</label>
                                                <input
                                                    type="time"
                                                    required
                                                    value={newSessionData.time}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, time: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setShowNewSessionModal(false); setSessionCreated(false); }}
                                            className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreatingSession}
                                            className="flex-1 py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-500 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {isCreatingSession ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer la séance'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </div >
    );
};

export default TeacherDashboard;
