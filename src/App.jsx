import React, { useState, useEffect, useRef } from 'react';
import {
    Camera,
    Trash2,
    CheckCircle2,
    BarChart3,
    Refrigerator,
    X,
    AlertTriangle,
    ChevronRight,
    Plus,
    Loader2,
    Settings,
    LogOut,
    Users,
    Copy,
    Share2,
    User
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import Auth from './Auth';

const CATEGORIES = {
    Produce: { icon: '🥦', color: 'bg-green-100 text-green-600' },
    Dairy: { icon: '🥛', color: 'bg-blue-100 text-blue-600' },
    Meat: { icon: '🥩', color: 'bg-red-100 text-red-600' },
    Beverage: { icon: '🥤', color: 'bg-purple-100 text-purple-600' },
    Pantry: { icon: '🥫', color: 'bg-amber-100 text-amber-600' },
    Bakery: { icon: '🍞', color: 'bg-orange-100 text-orange-600' },
    Frozen: { icon: '❄️', color: 'bg-cyan-100 text-cyan-600' },
    Other: { icon: '📦', color: 'bg-slate-100 text-slate-600' }
};

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

export default function App() {
    const [session, setSession] = useState(null);
    const [items, setItems] = useState([]);
    const [wasteHistory, setWasteHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('fridge');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState('upload'); // upload, loading, verify
    const [draftItems, setDraftItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fridgeName, setFridgeName] = useState('My Fridge');
    const [fridgeId, setFridgeId] = useState(null);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteCodeExpiry, setInviteCodeExpiry] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [view, setView] = useState('loading'); // loading, onboarding, app

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Cloud Sync
    useEffect(() => {
        if (!session) return;

        // Fetch initial data
        const fetchData = async () => {
            // Get user's fridge (create if none)
            let { data: { user } } = await supabase.auth.getUser();
            let { data: fridgeUsers } = await supabase
                .from('fridge_users')
                .select('fridge_id')
                .eq('user_id', user.id)
                .single();

            if (!fridgeUsers) {
                console.log("No fridge found, showing onboarding...");
                setView('onboarding');
                return;
            }

            setView('app');

            const fridgeIdLocal = fridgeUsers.fridge_id;
            setFridgeId(fridgeIdLocal);

            // Fetch Fridge Details
            const { data: fridgeDetails } = await supabase
                .from('fridges')
                .select('name, invite_code, invite_code_expiry')
                .eq('id', fridgeIdLocal)
                .single();

            if (fridgeDetails) {
                setFridgeName(fridgeDetails.name);
                setInviteCode(fridgeDetails.invite_code);
                setInviteCodeExpiry(fridgeDetails.invite_code_expiry);
            }

            // Fetch Items
            const { data: itemsData } = await supabase
                .from('items')
                .select('*')
                .eq('fridge_id', fridgeIdLocal)
                .order('created_at', { ascending: false });

            if (itemsData) setItems(itemsData);

            // Fetch Waste
            const { data: wasteData } = await supabase
                .from('waste_logs')
                .select('*')
                .eq('fridge_id', fridgeIdLocal)
                .order('wasted_at', { ascending: false });

            if (wasteData) setWasteHistory(wasteData);

            // Real-time Subscription
            const channel = supabase
                .channel('fridge_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `fridge_id=eq.${fridgeIdLocal}` }, (payload) => {
                    if (payload.eventType === 'INSERT') setItems(prev => [payload.new, ...prev]);
                    if (payload.eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== payload.old.id));
                    if (payload.eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_logs', filter: `fridge_id=eq.${fridgeIdLocal}` }, (payload) => {
                    if (payload.eventType === 'INSERT') setWasteHistory(prev => [payload.new, ...prev]);
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        };

        fetchData();
    }, [session]);

    // Legacy LocalStorage removal (optional, or keep as backup?)
    // leaving empty to stop localstorage sync
    useEffect(() => { }, [items, wasteHistory]);

    const capturePhoto = async () => {
        setModalStep('loading');
        setIsProcessing(true);

        try {
            const photo = await CapCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });

            await analyzeReceipt(photo.base64String);
        } catch (error) {
            console.error("Camera Error:", error);
            alert(`Failed to capture photo: ${error.message}`);
            setModalStep('upload');
            setIsProcessing(false);
        }
    };

    const processReceipt = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setModalStep('loading');
        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = async () => {
            const base64Data = reader.result.split(',')[1];
            await analyzeReceipt(base64Data);
        };
        reader.readAsDataURL(file);
    };

    const analyzeReceipt = async (base64Data) => {
        const systemPrompt = "You are a grocery receipt parser. Extract items into a JSON array. For each item include: 'name', 'price' (number), 'category' (Produce, Dairy, Meat, Beverage, Pantry, Bakery, Frozen, Other), and 'expiry' (estimate YYYY-MM-DD based on today's date). Return ONLY valid JSON with no additional text.";
        const userPrompt = `Parse this receipt. Today is ${new Date().toISOString().split('T')[0]}.`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: userPrompt
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/jpeg;base64,${base64Data}`
                                    }
                                }
                            ]
                        }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'API request failed');
            }

            const text = result.choices[0].message.content;
            const parsed = JSON.parse(text);

            // Handle both array format and object with items array
            const itemsArray = Array.isArray(parsed) ? parsed : (parsed.items || []);

            setDraftItems(itemsArray.map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) })));
            setModalStep('verify');
        } catch (error) {
            console.error("OpenAI Error:", error);
            alert(`Failed to read receipt: ${error.message}. Please try a clearer photo.`);
            setModalStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    const addToFridge = async () => {
        // Optimistic update
        const newItems = draftItems.map(i => ({ ...i, created_at: new Date().toISOString() }));
        // setItems(prev => [...newItems, ...prev]); // Subscription will handle this
        setIsModalOpen(false);
        setModalStep('upload');

        // Persist to Supabase
        const { data: { user } } = await supabase.auth.getUser();
        const { data: fridgeUser } = await supabase.from('fridge_users').select('fridge_id').eq('user_id', user.id).single();

        if (fridgeUser) {
            const itemsToInsert = draftItems.map(item => ({
                name: item.name,
                category: item.category,
                price: item.price,
                expiry: item.expiry,
                fridge_id: fridgeUser.fridge_id
            }));
            await supabase.from('items').insert(itemsToInsert);
        }
    };

    const markConsumed = async (id) => {
        // setItems(prev => prev.filter(item => item.id !== id)); // Subscription handles this
        await supabase.from('items').delete().eq('id', id);
    };

    const markWasted = async (id) => {
        const item = items.find(i => i.id === id);
        if (item) {
            // Optimistic update
            // setWasteHistory(prev => [{ ...item, wastedAt: new Date().toISOString() }, ...prev]); 
            // setItems(prev => prev.filter(i => i.id !== id));

            // DB Updates
            const { data: { user } } = await supabase.auth.getUser();
            const { data: fridgeUser } = await supabase.from('fridge_users').select('fridge_id').eq('user_id', user.id).single();

            if (fridgeUser) {
                await supabase.from('waste_logs').insert({
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    fridge_id: fridgeUser.fridge_id,
                    wasted_at: new Date().toISOString()
                });
                await supabase.from('items').delete().eq('id', id);
            }
        }
    };

    const updateDraft = (id, field, value) => {
        setDraftItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleJoinFridge = async () => {
        if (!joinCode) return alert("Please enter a code");

        try {
            // Find fridge by code
            const { data: fridge, error } = await supabase
                .from('fridges')
                .select('id, name, invite_code_expiry')
                .eq('invite_code', joinCode)
                .single();

            if (error || !fridge) throw new Error("Fridge not found with that code");

            // Check expiry
            if (fridge.invite_code_expiry && new Date(fridge.invite_code_expiry) < new Date()) {
                throw new Error("This invite code has expired. Ask for a new one.");
            }

            // Add user to fridge
            const { data: { user } } = await supabase.auth.getUser();

            // First remove from old fridge (optional, but for now 1 user = 1 fridge to keep simple)
            // Ideally we supports multiple, but UI needs adaptation. 
            // Let's just add mapping.

            const { error: joinError } = await supabase
                .from('fridge_users')
                .insert({ user_id: user.id, fridge_id: fridge.id });

            if (joinError) {
                if (joinError.code === '23505') throw new Error("You are already in this fridge!");
                throw joinError;
            }

            alert(`Joined ${fridge.name}!`);
            setJoinCode('');
            window.location.reload(); // Simple reload to refresh everything
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode);
        alert("Invite code copied!");
    };

    const generateCode = async () => {
        if (!fridgeId) {
            alert("Error: No fridge ID found. Please refresh.");
            return;
        }

        const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        // Set expiry to 24 hours from now
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
            .from('fridges')
            .update({ invite_code: newCode, invite_code_expiry: expiry })
            .eq('id', fridgeId)
            .select();

        if (error) {
            alert("Error generating code: " + error.message);
        } else {
            setInviteCode(newCode);
            setInviteCodeExpiry(expiry);
        }
    };

    const createFridge = async () => {
        // Use RPC to safe-create and link in one go (bypassing RLS issues)
        const { error } = await supabase
            .rpc('create_fridge_for_user', { fridge_name: 'My Fridge' });

        if (error) {
            console.error("Create Fridge Error:", error);
            return alert("Failed to create fridge: " + error.message);
        }

        window.location.reload();
    };

    const totalValue = items.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const totalWasted = wasteHistory.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const isNative = Capacitor.isNativePlatform();



    if (!session) {
        return <Auth />;
    }

    if (view === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
        );
    }

    if (view === 'onboarding') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-emerald-600 mb-2">WELCOME! 👋</h1>
                        <p className="text-slate-500 font-bold">Let's get your fridge set up.</p>
                    </div>

                    <div className="grid gap-4">
                        <button
                            onClick={createFridge}
                            className="bg-emerald-600 text-white p-6 rounded-[2.5rem] shadow-xl shadow-emerald-200 hover:scale-[1.02] transition-all text-left group"
                        >
                            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                                <Plus size={24} className="text-white" />
                            </div>
                            <h3 className="text-lg font-black mb-1">Create New Fridge</h3>
                            <p className="text-emerald-100 text-xs font-bold">Start fresh for you or your family.</p>
                        </button>

                        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100">
                            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                                <Users size={24} className="text-blue-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-1">Join a Fridge</h3>
                            <p className="text-slate-400 text-xs font-bold mb-4">Enter an invite code to connect.</p>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter connection code..."
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-emerald-500 text-sm"
                                />
                                <button onClick={handleJoinFridge} className="bg-slate-900 text-white px-6 rounded-xl font-black text-xs">
                                    JOIN
                                </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleSignOut} className="w-full text-slate-400 text-xs font-bold hover:text-slate-600">
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-black tracking-tighter text-emerald-600">SPOILESS BILLS.</h1>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('fridge')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'fridge' ?
                                'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                        >
                            Fridge
                        </button>
                        <button onClick={() => setActiveTab('stats')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'stats' ?
                                'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                        >
                            Wastage
                        </button>
                        <button onClick={() => setActiveTab('settings')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ?
                                'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                        >
                            <Settings size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto p-6 pb-24 space-y-8">
                {activeTab === 'settings' ? (
                    <div className="space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                <User size={20} className="text-emerald-500" /> PROFILE
                            </h2>
                            <p className="text-slate-500 text-sm font-bold mb-4">{session?.user?.email}</p>
                            <button onClick={handleSignOut} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                                <LogOut size={14} /> SIGN OUT
                            </button>
                        </div>

                        {/* Share Fridge Card */}
                        <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-lg shadow-emerald-200 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                            <h2 className="text-lg font-black mb-2 flex items-center gap-2 relative z-10">
                                <Share2 size={20} /> SHARE FRIDGE
                            </h2>
                            <p className="text-emerald-100 text-xs mb-6 font-medium relative z-10">
                                Invite family members to manage this fridge together.
                            </p>

                            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-natural-white/20 mb-4 relative z-10">
                                {inviteCode && new Date(inviteCodeExpiry) > new Date() ? (
                                    <>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-emerald-200 mb-1">
                                            Expires in {Math.ceil((new Date(inviteCodeExpiry) - new Date()) / (1000 * 60 * 60))}h
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-4xl font-black tracking-wider font-mono">{inviteCode}</span>
                                            <button onClick={copyCode} className="p-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                                                <Copy size={20} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-emerald-100 text-xs mb-3">No active invite code.</p>
                                        <button onClick={generateCode} className="w-full py-3 bg-white text-emerald-600 rounded-xl font-black text-xs shadow-sm hover:bg-emerald-50 transition-colors">
                                            GENERATE 24H CODE
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Join Fridge Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                <Users size={20} className="text-blue-500" /> JOIN A FRIDGE
                            </h2>
                            <p className="text-slate-400 text-xs font-bold mb-4">
                                Enter an invite code to join another family fridge.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter connection code..."
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-emerald-500 text-sm"
                                />
                                <button onClick={handleJoinFridge} className="bg-slate-900 text-white px-6 rounded-xl font-black text-xs">
                                    JOIN
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'stats' ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <BarChart3 size={20} className="text-emerald-500" /> WASTAGE REPORT
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Wasted</p>
                                    <p className="text-2xl font-black text-emerald-700">${totalWasted.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Wasted</p>
                                    <p className="text-2xl font-black text-slate-700">{wasteHistory.length}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Waste</h3>
                                {wasteHistory.length === 0 ? (
                                    <p className="text-sm text-slate-400 font-bold text-center py-8">Great job! No waste recorded.</p>
                                ) : (
                                    wasteHistory.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">
                                                    {CATEGORIES[item.category]?.icon || '📦'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-700">{item.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">
                                                        {new Date(item.wastedAt || item.wasted_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-black text-red-500 text-sm">-${item.price?.toFixed(2)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Fridge</p>
                                <p className="text-2xl font-black text-slate-900">${totalValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Wasted Loss</p>
                                <p className="text-2xl font-black text-red-600">${totalWasted.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <Refrigerator className="w-12 h-12 mx-auto mb-4 stroke-1" />
                                    <p className="font-bold">Your fridge is empty</p>
                                    <p className="text-sm">Scan a receipt to begin tracking</p>
                                </div>
                            ) : (
                                items.map(item => {
                                    const isExpired = new Date(item.expiry) < new Date();
                                    const daysLeft = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <div key={item.id}
                                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${CATEGORIES[item.category]?.color || CATEGORIES.Other.color}`}>
                                                {CATEGORIES[item.category]?.icon || '📦'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                                                    <span className="font-bold text-slate-400 text-xs">${item.price?.toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${isExpired ? 'bg-red-100 text-red-600' :
                                                        daysLeft <= 3 ? 'bg-amber-100 text-amber-600' :
                                                            'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                        {isExpired ? (
                                                            <><AlertTriangle size={10} /> Expired</>
                                                        ) : (
                                                            <><CheckCircle2 size={10} /> {daysLeft} Days Left</>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button onClick={() => markConsumed(item.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Consumed">
                                                    <CheckCircle2 size={18} />
                                                </button>
                                                <button onClick={() => markWasted(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Wasted">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* FAB */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
            >
                <Camera size={24} />
            </button>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">

                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                {modalStep === 'upload' && <><Camera className="text-emerald-500" /> SCAN RECEIPT</>}
                                {modalStep === 'loading' && <><Loader2 className="animate-spin text-emerald-500" /> PROCESSING</>}
                                {modalStep === 'verify' && <><CheckCircle2 className="text-emerald-500" /> VERIFY ITEMS</>}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="min-h-[200px]">
                            {modalStep === 'upload' && (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <Camera className="text-emerald-500 w-10 h-10" />
                                    </div>
                                    <p className="text-slate-500 text-sm mb-8 px-4">
                                        {isNative ? 'Take a photo of your receipt.' : 'Upload a clear photo of your receipt.'} OpenAI will automatically extract names, prices, and expiry dates.
                                    </p>
                                    {isNative ? (
                                        <button
                                            onClick={capturePhoto}
                                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">
                                            TAKE PHOTO
                                        </button>
                                    ) : (
                                        <label className="block w-full py-4 bg-emerald-600 text-white rounded-2xl font-black cursor-pointer text-center">
                                            CHOOSE PHOTO
                                            <input type="file" className="hidden" accept="image/*" onChange={processReceipt} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {modalStep === 'loading' && (
                                <div className="text-center py-10">
                                    <div className="relative w-20 h-20 mx-auto mb-6">
                                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <p className="font-black text-slate-800 mb-2">Analyzing Receipt...</p>
                                    <p className="text-slate-400 text-xs">Extracting items, prices, and expiry dates with AI.</p>
                                </div>
                            )}

                            {modalStep === 'verify' && (
                                <div className="space-y-4">
                                    {draftItems.map(item => (
                                        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-start">
                                                <input
                                                    value={item.name}
                                                    onChange={(e) => updateDraft(item.id, 'name', e.target.value)}
                                                    className="bg-transparent font-bold text-slate-800 outline-none w-full placeholder:text-slate-300"
                                                    placeholder="Item Name"
                                                />
                                                <button onClick={() => setDraftItems(prev => prev.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-red-500 p-1">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[8px] font-black text-slate-400 uppercase">Price</label>
                                                    <input type="number" value={item.price} onChange={(e) => updateDraft(item.id, 'price', parseFloat(e.target.value))}
                                                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-black text-slate-400 uppercase">Expiry</label>
                                                    <input type="date" value={item.expiry} onChange={(e) => updateDraft(item.id, 'expiry', e.target.value)}
                                                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-slate-400 uppercase">Category</label>
                                                <select value={item.category} onChange={(e) => updateDraft(item.id, 'category', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold">
                                                    {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => setDraftItems(prev => [...prev, { id: Math.random().toString(), name: 'New Item', price: 0, category: 'Other', expiry: new Date().toISOString().split('T')[0] }])}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
                                        <Plus size={14} /> ADD ITEM
                                    </button>

                                    <div className="pt-6">
                                        <button onClick={addToFridge}
                                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100">
                                            SAVE TO FRIDGE
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
