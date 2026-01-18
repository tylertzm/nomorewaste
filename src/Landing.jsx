import React from 'react';
import groceryImage from './grocery.webp';

export default function Landing({ onGetStarted }) {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="fixed inset-0 z-0">
                <img
                    src={groceryImage}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

                * {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.4);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 20px 60px -10px rgba(16, 185, 129, 0.5);
                }

                .btn-outline {
                    border: 2px solid rgba(16, 185, 129, 0.3);
                    backdrop-filter: blur(10px);
                    background: rgba(255, 255, 255, 0.5);
                    transition: all 0.3s ease;
                }

                .btn-outline:hover {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.1);
                    transform: translateY(-1px);
                }

                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
                }

                .hero-gradient {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
                }

                .stat-number {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
            `}</style>

            {/* Animated Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-50 px-6 py-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <span className="text-2xl font-bold text-white drop-shadow-lg">
                        Spoiless Bills
                    </span>
                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={onGetStarted} className="btn-outline px-6 py-2.5 rounded-full text-sm font-semibold text-emerald-600">
                            Sign In
                        </button>
                        <button onClick={onGetStarted} className="btn-primary px-6 py-2.5 rounded-full text-sm font-bold text-white">
                            Get Started Free
                        </button>
                    </div>
                    <button onClick={onGetStarted} className="md:hidden btn-primary px-5 py-2 rounded-full text-sm font-bold text-white">
                        Start Free
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 px-4 pt-6 pb-12 md:pt-20 md:pb-20">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-4xl mx-auto">
                        {/* Content */}
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card mb-4 md:mb-6">
                                <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs md:text-sm font-semibold text-emerald-700">10,000+ Active Users</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-4 md:mb-6 drop-shadow-2xl">
                                <span className="block text-white">Stop wasting</span>
                                <span className="block bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 bg-clip-text text-transparent drop-shadow-lg">
                                    good food
                                </span>
                                <span className="block text-white">& money.</span>
                            </h1>

                            <p className="text-base md:text-lg lg:text-xl text-white/90 mb-6 md:mb-8 max-w-lg mx-auto leading-relaxed drop-shadow-lg px-4">
                                Smart grocery tracking that prevents spoilage, reduces waste, and saves you money automatically.
                                <span className="font-semibold text-emerald-300"> Track it once, save forever.</span>
                            </p>

                            <div className="flex justify-center mb-8 md:mb-12">
                                <button
                                    onClick={onGetStarted}
                                    className="btn-primary group px-6 py-3 md:px-8 md:py-4 rounded-full text-base md:text-lg font-bold text-white inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                                >
                                    Start Saving Now
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto px-4">
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl lg:text-5xl font-black mb-1 text-white drop-shadow-lg">$247</div>
                                    <div className="text-[10px] md:text-xs text-white/80 font-bold uppercase tracking-wide drop-shadow-md">Avg. Saved/Year</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl lg:text-5xl font-black mb-1 text-white drop-shadow-lg">40%</div>
                                    <div className="text-[10px] md:text-xs text-white/80 font-bold uppercase tracking-wide drop-shadow-md">Less Waste</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl lg:text-5xl font-black mb-1 text-white drop-shadow-lg">2min</div>
                                    <div className="text-[10px] md:text-xs text-white/80 font-bold uppercase tracking-wide drop-shadow-md">Setup Time</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Pills */}
            <div className="relative z-10 px-4 pb-8 md:pb-12">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                        {['🤖 AI Receipt Scanning', '📊 Waste Analytics', '🔔 Expiry Alerts', '👥 Family Sharing', '💰 Money Saved Tracker'].map((feature, i) => (
                            <div key={i} className="glass-card px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold text-slate-700">
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
