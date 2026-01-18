import React, { useState } from 'react';
import { supabase } from './supabase';
import { Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function Auth({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('login'); // 'login' or 'signup'
    const [message, setMessage] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // onLogin callback will be triggered by auth state change listener in App
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setMessage({ type: 'error', text: 'Enter your email first!' });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Verification email sent! Check your inbox (and spam).' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-emerald-600 mb-2">SPOILESS BILLS.</h1>
                    <p className="text-slate-400 font-bold text-sm">
                        {mode === 'login' ? 'Welcome back!' : 'Create an account'}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex flex-col gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {message.text}
                        {message.type === 'success' && (
                            <button onClick={handleResend} className="text-xs underline hover:no-underline self-start">
                                Didn't get it? Resend
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Email</label>
                        <div className="bg-slate-50 rounded-xl flex items-center px-4 py-3 border border-slate-100 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                            <Mail className="text-slate-300 w-5 h-5 mr-3" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-transparent w-full outline-none font-bold text-slate-700 placeholder:text-slate-300 text-base"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Password</label>
                        <div className="bg-slate-50 rounded-xl flex items-center px-4 py-3 border border-slate-100 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                            <Lock className="text-slate-300 w-5 h-5 mr-3" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-transparent w-full outline-none font-bold text-slate-700 placeholder:text-slate-300 text-base"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {mode === 'login' ? 'Sign In' : 'Sign Up'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login');
                            setMessage(null);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                        {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
}
