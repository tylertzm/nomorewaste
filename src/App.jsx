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
    Loader2
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

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
    const [items, setItems] = useState([]);
    const [wasteHistory, setWasteHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('fridge');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState('upload'); // upload, loading, verify
    const [draftItems, setDraftItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Persistence
    useEffect(() => {
        const savedItems = localStorage.getItem('nfw_items');
        const savedWaste = localStorage.getItem('nfw_waste');
        if (savedItems) setItems(JSON.parse(savedItems));
        if (savedWaste) setWasteHistory(JSON.parse(savedWaste));
    }, []);

    useEffect(() => {
        localStorage.setItem('nfw_items', JSON.stringify(items));
        localStorage.setItem('nfw_waste', JSON.stringify(wasteHistory));
    }, [items, wasteHistory]);

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

    const addToFridge = () => {
        setItems(prev => [...draftItems, ...prev]);
        setIsModalOpen(false);
        setModalStep('upload');
    };

    const markConsumed = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const markWasted = (id) => {
        const item = items.find(i => i.id === id);
        if (item) {
            setWasteHistory(prev => [{ ...item, wastedAt: new Date().toISOString() }, ...prev]);
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const updateDraft = (id, field, value) => {
        setDraftItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const totalValue = items.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const totalWasted = wasteHistory.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const isNative = Capacitor.isNativePlatform();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-black tracking-tighter text-emerald-600">NO FOOD WASTE.</h1>
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
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-6 pb-32">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Fridge</p>
                        <p className="text-2xl font-black text-slate-900">${totalValue.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Wasted Loss</p>
                        <p className="text-2xl font-black text-red-600">${totalWasted.toFixed(2)}</p>
                    </div>
                </div>

                {activeTab === 'fridge' ? (
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
                                            <h3 className="font-bold truncate">{item.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isExpired
                                                    ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {isExpired ? 'EXPIRED' : `${daysLeft}d left`}
                                                </span>
                                                <span className="text-[10px] font-bold text-emerald-600">${item.price?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => markConsumed(item.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg active:scale-90 transition-transform">
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <button onClick={() => markWasted(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-transform">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-lg font-black flex items-center gap-2">
                            <BarChart3 className="text-emerald-500" />
                            Loss History
                        </h2>
                        {wasteHistory.length === 0 ? (
                            <p className="text-center py-10 text-slate-400 text-sm italic">No wastage logged yet. Great job!</p>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                                {wasteHistory.map((item, idx) => (
                                    <div key={idx} className="p-4 border-b last:border-0 border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl opacity-60">{CATEGORIES[item.category]?.icon}</span>
                                            <div>
                                                <p className="text-sm font-bold">{item.name}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">
                                                    {new Date(item.wastedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-black text-red-500">-${item.price?.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* FAB */}
            <div className="fixed bottom-8 left-0 right-0 px-6 max-w-md mx-auto z-40">
                <button onClick={() => setIsModalOpen(true)}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl shadow-xl shadow-slate-200 font-black flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all">
                    <Camera size={20} />
                    SCAN RECEIPT
                </button>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black">
                                {modalStep === 'upload' && 'New Scan'}
                                {modalStep === 'loading' && 'Processing...'}
                                {modalStep === 'verify' && 'Verify Items'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400">
                                <X />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                                <div className="text-center py-20">
                                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                                    <p className="font-bold">OpenAI is thinking...</p>
                                    <p className="text-xs text-slate-400 mt-1">Extracting prices and dates</p>
                                </div>
                            )}

                            {modalStep === 'verify' && (
                                <div className="space-y-4">
                                    {draftItems.map(item => (
                                        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{CATEGORIES[item.category]?.icon || '📦'}</span>
                                                <input value={item.name} onChange={(e) => updateDraft(item.id, 'name', e.target.value)}
                                                    className="bg-transparent font-bold border-b border-slate-200 outline-none flex-1 text-sm" />
                                                <button onClick={() => setDraftItems(prev => prev.filter(d => d.id !== item.id))}
                                                    className="text-slate-300 hover:text-red-500">
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
                                </div>
                            )}
                        </div>

                        {modalStep === 'verify' && (
                            <div className="pt-6">
                                <button onClick={addToFridge}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100">
                                    SAVE TO FRIDGE
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
