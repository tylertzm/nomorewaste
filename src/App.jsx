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
    User,
    Search,
    Filter,
    ArrowUpDown,
    ChefHat,
    Pencil,
    Home,
    Clock,
    MoreVertical,
    UtensilsCrossed,
    List,
    Send,
    Bot,
    UserCircle2,
    Bell,
    History
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import Auth from './Auth';
import Landing from './Landing';
import translations from './i18n';

const SimpleMarkdownRenderer = ({ content }) => {
    if (!content) return null;

    // Split by newlines
    const lines = content.split('\n');

    return (
        <div className="space-y-3 font-medium text-slate-700 leading-relaxed">
            {lines.map((line, i) => {
                // Header (H1/H3)
                if (line.startsWith('# ')) {
                    return <h3 key={i} className="text-lg font-black text-emerald-800 mt-4 mb-2">{line.replace('# ', '')}</h3>;
                }
                if (line.startsWith('### ')) {
                    return <h4 key={i} className="text-sm font-black text-emerald-600 uppercase tracking-wider mt-4">{line.replace('### ', '')}</h4>;
                }

                // List Items
                if (line.trim().startsWith('- ')) {
                    return (
                        <div key={i} className="flex gap-2 ml-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span dangerouslySetInnerHTML={{
                                __html: line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }} />
                        </div>
                    );
                }

                // Numbered List
                if (/^\d+\.\s/.test(line)) {
                    return (
                        <div key={i} className="flex gap-2 mb-2">
                            <span className="font-black text-emerald-600 min-w-[20px]">{line.match(/^\d+\./)[0]}</span>
                            <span dangerouslySetInnerHTML={{
                                __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }} />
                        </div>
                    );
                }

                // Empty lines
                if (line.trim() === '') return <div key={i} className="h-2" />;

                // Standard Paragraph with bold support
                return (
                    <p key={i} dangerouslySetInnerHTML={{
                        __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }} />
                );
            })}
        </div>
    );
};


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
    const [consumedHistory, setConsumedHistory] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    // Manual Add State
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [manualAddType, setManualAddType] = useState('fridge'); // fridge, waste, consumed

    // Unified Fridge ID State
    const [currentFridgeId, setCurrentFridgeId] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);

    // History Tab State
    const [historyFilter, setHistoryFilter] = useState('all'); // all, waste, consumed

    // Filter Stats
    const [statsFilter, setStatsFilter] = useState('week'); // Default to week
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [sortBy, setSortBy] = useState('expiry'); // expiry, created_at, price, name
    const [activeTab, setActiveTab] = useState('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState('upload'); // upload, loading, verify
    const [wastingItem, setWastingItem] = useState(null); // Item being processed for waste
    const [editingItem, setEditingItem] = useState(null);
    const [editType, setEditType] = useState(null); // 'fridge' or 'waste'

    // Chat State
    const [chatMessages, setChatMessages] = useState([
        { id: '1', role: 'assistant', text: "Hello Chef! 👨‍🍳 I'm ready to cook. Tell me what you're craving, or pick a quick option below!" }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages, isTyping, activeTab]);
    const [wasteAmount, setWasteAmount] = useState(1);
    const [draftItems, setDraftItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fridgeName, setFridgeName] = useState('My Fridge');
    const [inviteCode, setInviteCode] = useState('');
    const [inviteCodeExpiry, setInviteCodeExpiry] = useState(null);
    const [fridgeMembers, setFridgeMembers] = useState([]);
    const [joinCode, setJoinCode] = useState('');
    const [view, setView] = useState('loading');
    const [showLanding, setShowLanding] = useState(true);
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

    const t = (path) => {
        const keys = path.split('.');
        let result = translations[language];
        for (const key of keys) {
            if (result && result[key]) {
                result = result[key];
            } else {
                return path;
            }
        }
        return result;
    };

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    // AI Chef State
    const [dailyRecipeCount, setDailyRecipeCount] = useState(0);
    const [generatedRecipe, setGeneratedRecipe] = useState(null);
    const [recipeLoading, setRecipeLoading] = useState(false);

    // Helpers
    const getDaysDifference = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const groupItemsByDate = (itemsToGroup, dateKey = 'created_at') => {
        const groups = {
            'Today': [],
            'Yesterday': [],
            'Earlier': []
        };

        itemsToGroup.forEach(item => {
            const date = new Date(item[dateKey]);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                groups['Today'].push(item);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups['Yesterday'].push(item);
            } else {
                groups['Earlier'].push(item);
            }
        });
        return groups;
    };

    // Computed Stats
    const filteredWaste = wasteHistory.filter(item => {
        if (statsFilter === 'all') return true;
        const wastedDate = new Date(item.wastedAt || item.wasted_at);
        const now = new Date();
        if (statsFilter === 'week') {
            const d = new Date(); d.setDate(now.getDate() - 7);
            return wastedDate >= d;
        }
        if (statsFilter === 'month') {
            const d = new Date(); d.setDate(now.getDate() - 30);
            return wastedDate >= d;
        }
        return true;
    });

    const filteredConsumed = consumedHistory.filter(item => {
        if (statsFilter === 'all') return true;
        const consumedDate = new Date(item.consumed_at);
        const now = new Date();
        if (statsFilter === 'week') {
            const d = new Date(); d.setDate(now.getDate() - 7);
            return consumedDate >= d;
        }
        if (statsFilter === 'month') {
            const d = new Date(); d.setDate(now.getDate() - 30);
            return consumedDate >= d;
        }
        return true;
    });

    const filteredTotalWasted = filteredWaste.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const filteredTotalSavings = filteredConsumed.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    // All Time Stats (Unfiltered)
    const totalWastedAllTime = wasteHistory.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0);

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

    const refreshData = async (fId = currentFridgeId) => {
        if (!fId) return;

        const { data: itemsData } = await supabase
            .from('items')
            .select('*')
            .eq('fridge_id', fId)
            .order('created_at', { ascending: false });

        if (itemsData) setItems(itemsData);

        const { data: wasteData } = await supabase
            .from('waste_logs')
            .select('*')
            .eq('fridge_id', fId)
            .order('wasted_at', { ascending: false });

        if (wasteData) setWasteHistory(wasteData);

        const { data: consumedData } = await supabase
            .from('consumed_logs')
            .select('*')
            .eq('fridge_id', fId)
            .order('consumed_at', { ascending: false });

        if (consumedData) setConsumedHistory(consumedData);

        // Fetch daily recipe count
        if (session?.user) {
            fetchRecipeCount(session.user.id);
        }

        // Fetch fridge members
        fetchFridgeMembers();
    };

    const fetchRecipeCount = async (userId) => {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('daily_recipe_counts')
            .select('count')
            .eq('user_id', userId)
            .eq('date', today)
            .single();

        if (data) {
            setDailyRecipeCount(data.count);
        } else {
            setDailyRecipeCount(0);
        }
    };

    const logActivity = async (action, itemName, details = '') => {
        if (!currentFridgeId) return;
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('activity_logs').insert({
            fridge_id: currentFridgeId,
            user_email: user.email,
            action_type: action,
            item_name: itemName,
            details: details
        });
    };

    const generateRecipe = async (type, customPrompt = null) => {
        // checks
        const today = new Date().toISOString().split('T')[0];
        if (dailyRecipeCount >= 2) {
            alert("You've reached your daily recipe limit (2/2). Come back tomorrow!");
            return;
        }

        // Add User Message (if custom prompt)
        if (customPrompt) {
            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: customPrompt }]);
        } else if (type === 'expiring') {
            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "What can I make with my expiring items?" }]);
        } else if (type === 'surprise') {
            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "Surprise me with a recipe!" }]);
        }

        setIsTyping(true);
        setRecipeLoading(true); // Keep legacy loading state for safety if used elsewhere

        try {
            const { data, error } = await supabase.functions.invoke('generate-recipe', {
                body: { items: items, type, customPrompt } // specific 'items' (fridge items)
            });

            if (error) throw error;

            // Add Assistant Message
            setChatMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: data.recipe,
                isRecipe: true
            }]);

            // Update Limit
            const { error: upsertError } = await supabase
                .from('daily_recipe_counts')
                .upsert({
                    user_id: session.user.id,
                    date: today,
                    count: dailyRecipeCount + 1
                }, { onConflict: 'user_id, date' });

            if (upsertError) console.error('Error updating count:', upsertError);
            else setDailyRecipeCount(prev => prev + 1);

        } catch (error) {
            console.error('Error generating recipe:', error);
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                text: "I had a little trouble checking the pantry. Please try again! 🤕"
            }]);
        } finally {
            setRecipeLoading(false);
            setIsTyping(false);
        }
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        // For now, treat text input as a 'custom' request
        // Note: Backend needs to support 'customPrompt'. 
        // If not, we might need to fallback or just send it as 'surprise' with a note?
        // Assuming we pass it through.
        generateRecipe('custom', chatInput);
        setChatInput('');
    };

    // Cloud Sync
    useEffect(() => {
        if (!session) {
            // If no session, set view to 'app' so the landing/auth page can show
            setView('app');
            return;
        }

        // Fetch initial data
        const fetchData = async () => {
            // Get user's fridge (create if none)
            let { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log("No user found, skipping data fetch");
                return;
            }

            let { data: fridgeUser } = await supabase
                .from('fridge_users')
                .select('fridge_id')
                .eq('user_id', user.id)
                .single();

            if (!fridgeUser) {
                console.log("No fridge found, showing onboarding...");
                setView('onboarding');
                return;
            }

            setView('app');

            const fridgeIdLocal = fridgeUser.fridge_id;
            setCurrentFridgeId(fridgeIdLocal);

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

            await refreshData(fridgeIdLocal);

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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'consumed_logs', filter: `fridge_id=eq.${fridgeIdLocal}` }, (payload) => {
                    if (payload.eventType === 'INSERT') setConsumedHistory(prev => [payload.new, ...prev]);
                })
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `fridge_id=eq.${fridgeIdLocal}` },
                    (payload) => {
                        setActivityLogs(prev => [payload.new, ...prev]);
                        // Simple Toast
                        // alert(`New Activity: ${payload.new.action_type} - ${payload.new.item_name}`);
                    }
                )
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

    const resizeImage = (base64Str, maxWidth = 800) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = `data:image/jpeg;base64,${base64Str}`;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
            };
        });
    };

    const analyzeReceipt = async (originalBase64) => {
        const base64Data = await resizeImage(originalBase64);
        const systemPrompt = "You are a grocery receipt parser. Extract items into a JSON array. For each item include: 'name', 'price' (number), 'quantity' (integer, default 1), 'category' (Produce, Dairy, Meat, Beverage, Pantry, Bakery, Frozen, Other), 'expiry' (estimate YYYY-MM-DD based on today's date), and 'emoji' (a single emoji character representing the item). Return ONLY valid JSON with no additional text.";
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

    const updateItem = async (id, updates) => {
        const { error } = await supabase
            .from('items')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating item:', error);
            alert('Failed to update item');
        } else {
            await logActivity('UPDATE', updates.name || id, 'Updated item details');
            refreshData(currentFridgeId);
        }
    };

    const updateWasteLog = async (id, updates) => {
        const { error } = await supabase
            .from('waste_logs')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating waste log:', error);
            alert('Failed to update log');
        } else {
            await logActivity('UPDATE_HISTORY', updates.name || id, 'Updated waste log');
            refreshData(currentFridgeId);
        }
    };
    const updateConsumedLog = async (id, updates) => {
        const { error } = await supabase
            .from('consumed_logs')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating consumed log:', error);
            alert('Failed to update log');
        } else {
            await logActivity('UPDATE_HISTORY', updates.name || id, 'Updated consumption log');
            refreshData(currentFridgeId);
        }
    };

    const deleteHistoryItem = async (id, type) => {
        const table = type === 'waste' ? 'waste_logs' : 'consumed_logs';
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting log:', error);
            alert('Failed to delete log');
        } else {
            await logActivity('DELETE_HISTORY', type, `Deleted ${type} log entry`);
            refreshData(currentFridgeId);
        }
    };

    const handleEditSave = async () => {
        if (!editingItem) return;

        const quantity = parseInt(editingItem.quantity);
        const price = parseFloat(editingItem.price);

        if (isNaN(quantity) || isNaN(price)) {
            alert("Please enter valid numbers for quantity and price.");
            return;
        }

        const updates = {
            name: editingItem.name,
            quantity,
            price,
            category: editingItem.category
        };

        if (editType === 'fridge') {
            updates.expiry = editingItem.expiry;
            await updateItem(editingItem.id, updates);
        } else if (editType === 'waste') {
            await updateWasteLog(editingItem.id, updates);
        } else if (editType === 'consumed') {
            await updateConsumedLog(editingItem.id, updates);
        }

        setEditingItem(null);
    };

    const addToFridge = async () => {
        // Optimistic update
        const newItems = draftItems.map(i => ({ ...i, created_at: new Date().toISOString() }));
        setItems(prev => [...newItems, ...prev]);
        setIsModalOpen(false);
        setModalStep('upload');
        setActiveTab('fridge'); // Navigate to fridge tab

        // Persist to Supabase
        const { data: { user } } = await supabase.auth.getUser();
        const { data: fridgeUser } = await supabase.from('fridge_users').select('fridge_id').eq('user_id', user.id).single();

        if (fridgeUser) {
            const itemsToInsert = draftItems.map(item => ({
                name: item.name,
                category: item.category,
                price: item.price,
                quantity: item.quantity || 1,
                expiry: item.expiry,
                emoji: item.emoji,
                fridge_id: fridgeUser.fridge_id
            }));
            await supabase.from('items').insert(itemsToInsert);
            await logActivity('ADD', `${itemsToInsert.length} Items`, 'Scanned Receipt');
            await refreshData(fridgeUser.fridge_id);
        }
    };

    const markConsumed = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        // Optimistic Remove/Update
        if (item.quantity > 1) {
            setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i));
        } else {
            setItems(prev => prev.filter(i => i.id !== id));
        }

        // Optimistic Add to Consumed
        const consumedLog = {
            id: Math.random(), // temp id
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: 1,
            consumed_at: new Date().toISOString()
        };
        setConsumedHistory(prev => [consumedLog, ...prev]);

        // DB Updates
        const { data: { user } } = await supabase.auth.getUser();
        const { data: fridgeUser } = await supabase.from('fridge_users').select('fridge_id').eq('user_id', user.id).single();

        if (fridgeUser) {
            // 1. Add to consumed_logs
            await supabase.from('consumed_logs').insert({
                name: item.name,
                category: item.category,
                price: item.price,
                quantity: 1,
                fridge_id: fridgeUser.fridge_id,
                consumed_at: new Date().toISOString()
            });

            await logActivity('CONSUME', item.name, 'Marked as consumed');

            // 2. Update or Delete Item
            if (item.quantity > 1) {
                await supabase.from('items').update({ quantity: item.quantity - 1 }).eq('id', id);
            } else {
                await supabase.from('items').delete().eq('id', id);
            }

            // Sync with DB to get real IDs for any future edits/deletes
            refreshData(fridgeUser.fridge_id);
        }
    };

    const markWasted = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        if (item.quantity && item.quantity > 1) {
            setWastingItem(item);
            setWasteAmount(1);
            return;
        }

        // Single item logic (legacy + q=1)
        confirmWaste(item, 1);
    };

    const confirmWaste = async (item, amount) => {
        // Optimistic update
        setWasteHistory(prev => [{ ...item, quantity: amount, wastedAt: new Date().toISOString() }, ...prev]);

        if (amount < item.quantity) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - amount } : i));
        } else {
            setItems(prev => prev.filter(i => i.id !== item.id));
        }

        setWastingItem(null); // Close modal

        // DB Updates
        const { data: { user } } = await supabase.auth.getUser();
        const { data: fridgeUser } = await supabase.from('fridge_users').select('fridge_id').eq('user_id', user.id).single();

        if (fridgeUser) {
            await supabase.from('waste_logs').insert({
                name: item.name,
                category: item.category,
                price: item.price,
                quantity: amount,
                fridge_id: fridgeUser.fridge_id,
                wasted_at: new Date().toISOString()
            });

            await logActivity('WASTE', item.name, `Wasted ${amount}x`);

            if (amount < item.quantity) {
                // Partial update
                await supabase.from('items').update({ quantity: item.quantity - amount }).eq('id', item.id);
            } else {
                // Full delete
                await supabase.from('items').delete().eq('id', item.id);
            }

            // Sync with DB to get real IDs for any future edits/deletes
            refreshData(fridgeUser.fridge_id);
        }
    };

    const updateDraft = (id, field, value) => {
        setDraftItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleManualAddSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value;
        const quantity = parseInt(form.quantity.value);
        const price = parseFloat(form.price.value);
        const category = form.category.value;
        const expiry = form.expiry?.value; // Only for Fridge

        if (!currentFridgeId) return;

        if (manualAddType === 'fridge') {
            await supabase.from('items').insert({
                fridge_id: currentFridgeId,
                name, quantity, price, category, expiry,
                created_at: new Date().toISOString()
            });
            await logActivity('ADD', name, 'Manual Add');
            await refreshData(currentFridgeId);
        } else if (manualAddType === 'waste') {
            await supabase.from('waste_logs').insert({
                fridge_id: currentFridgeId,
                name, quantity, price, category,
                wasted_at: new Date().toISOString()
            });
            await logActivity('WASTE', name, 'Manual Waste Log');
            await refreshData(currentFridgeId);
        } else if (manualAddType === 'consumed') {
            await supabase.from('consumed_logs').insert({
                fridge_id: currentFridgeId,
                name, quantity, price, category,
                consumed_at: new Date().toISOString()
            });
            await logActivity('CONSUME', name, 'Manual Consume Log');
            await refreshData(currentFridgeId);
        }

        setIsManualAddOpen(false);
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
            if (fridge.invite_code_expiry && new Date(frridge.invite_code_expiry) < new Date()) {
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
        if (!currentFridgeId) {
            alert("Error: No fridge ID found. Please refresh.");
            return;
        }

        const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        // Set expiry to 24 hours from now
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
            .from('fridges')
            .update({ invite_code: newCode, invite_code_expiry: expiry })
            .eq('id', currentFridgeId)
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

    const fetchFridgeMembers = async () => {
        if (!currentFridgeId) return;

        // Get all user_ids for this fridge
        const { data: fridgeUsers, error: fridgeError } = await supabase
            .from('fridge_users')
            .select('user_id')
            .eq('fridge_id', currentFridgeId);

        if (fridgeError) {
            console.error('Error fetching fridge users:', fridgeError);
            return;
        }

        // Get user emails from auth.users (need to use RPC or service role)
        // For now, let's just show user IDs and fetch emails separately
        const membersWithEmails = await Promise.all(
            (fridgeUsers || []).map(async (fu) => {
                const { data: { user } } = await supabase.auth.admin.getUserById(fu.user_id).catch(() => ({ data: { user: null } }));
                return {
                    user_id: fu.user_id,
                    email: user?.email || fu.user_id.substring(0, 8) + '...'
                };
            })
        );

        setFridgeMembers(membersWithEmails);
    };

    const leaveFridge = async () => {
        if (!currentFridgeId || !session?.user?.id) return;

        const confirmed = window.confirm('Are you sure you want to leave this fridge? You will lose access to all items.');
        if (!confirmed) return;

        // Log the leave activity
        await logActivity('LEAVE', null, `${session.user.email} left the fridge`);

        // Remove user from fridge
        const { error } = await supabase
            .from('fridge_users')
            .delete()
            .eq('fridge_id', currentFridgeId)
            .eq('user_id', session.user.id);

        if (error) {
            alert('Error leaving fridge: ' + error.message);
        } else {
            // Reload to show the "no fridge" state
            window.location.reload();
        }
    };

    const deleteFridge = async () => {
        if (!currentFridgeId) return;

        const confirmed = window.confirm('⚠️ DELETE FRIDGE PERMANENTLY?\n\nThis will delete:\n- All items\n- All history (waste & consumed)\n- All activity logs\n- Remove all members\n\nThis action cannot be undone!');
        if (!confirmed) return;

        const doubleCheck = window.prompt('Type "DELETE" to confirm permanent deletion:');
        if (doubleCheck !== 'DELETE') {
            alert('Deletion cancelled.');
            return;
        }

        // Delete all related data (cascade should handle this, but we'll be explicit)
        const { error } = await supabase
            .from('fridges')
            .delete()
            .eq('id', currentFridgeId);

        if (error) {
            alert('Error deleting fridge: ' + error.message);
        } else {
            alert('Fridge deleted successfully.');
            window.location.reload();
        }
    };


    const totalValue = items.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0);
    const totalWasted = wasteHistory.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0);
    const isNative = Capacitor.isNativePlatform();

    // Filter & Sort Logic Helpers
    const getFilteredList = (list, dateKey) => {
        return list
            .filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                if (sortBy === 'expiry') return new Date(a.expiry || '9999-12-31') - new Date(b.expiry || '9999-12-31');
                if (sortBy === 'created_at') return new Date(b[dateKey] || b.created_at) - new Date(a[dateKey] || a.created_at);
                if (sortBy === 'price') return b.price - a.price;
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return 0;
            });
    };

    const filteredItems = getFilteredList(items, 'created_at');
    const filteredWasteItems = getFilteredList(wasteHistory, 'wasted_at');
    const filteredConsumedItems = getFilteredList(consumedHistory, 'consumed_at');

    // Unified History Logic
    const getHistoryItems = () => {
        let items = [];
        if (historyFilter === 'all' || historyFilter === 'waste') {
            items = [...items, ...wasteHistory.map(i => ({
                ...i,
                type: 'waste',
                date: i.wasted_at || i.wastedAt,
                uniqueId: `waste-${i.id}`
            }))];
        }
        if (historyFilter === 'all' || historyFilter === 'consumed') {
            items = [...items, ...consumedHistory.map(i => ({
                ...i,
                type: 'consumed',
                date: i.consumed_at,
                uniqueId: `consumed-${i.id}`
            }))];
        }

        // Filter by search
        if (searchQuery) {
            items = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Sort by date desc
        return items.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const historyItems = getHistoryItems();

    // Specific grouping for History that groups by actual calendar dates
    const groupHistoryByDate = (items) => {
        const groups = {};
        items.forEach(item => {
            const date = new Date(item.date).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });
        return groups;
    };

    const historyGroups = groupHistoryByDate(historyItems);




    if (!session) {
        if (showLanding) {
            return <Landing onGetStarted={() => setShowLanding(false)} />;
        }
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 font-sans selection:bg-emerald-100">
            {/* Desktop Sidebar Navigation */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col z-40">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-slate-200 px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center border-b border-slate-100">
                        <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            SPOILESS BILLS
                        </h1>
                    </div>
                    <nav className="flex flex-1 flex-col">
                        <ul role="list" className="flex flex-1 flex-col gap-y-2">
                            <li>
                                <button
                                    onClick={() => setActiveTab('home')}
                                    className={`group flex gap-x-3 rounded-xl p-3 text-sm font-bold leading-6 w-full hover-lift ${activeTab === 'home'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <Home size={20} />
                                    {t('nav.home')}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('fridge')}
                                    className={`group flex gap-x-3 rounded-xl p-3 text-sm font-bold leading-6 w-full hover-lift ${activeTab === 'fridge'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <Refrigerator size={20} />
                                    {t('nav.fridge')}
                                    {items.length > 0 && (
                                        <span className="ml-auto inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                                            {items.length}
                                        </span>
                                    )}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`group flex gap-x-3 rounded-xl p-3 text-sm font-bold leading-6 w-full hover-lift ${activeTab === 'history'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <History size={20} />
                                    {t('nav.history')}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('recipes')}
                                    className={`group flex gap-x-3 rounded-xl p-3 text-sm font-bold leading-6 w-full hover-lift ${activeTab === 'recipes'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <Bot size={20} />
                                    {t('nav.recipes')}
                                    {dailyRecipeCount >= 10 && (
                                        <span className="ml-auto text-xs text-amber-600 font-bold">{t('recipes.limit')}</span>
                                    )}
                                </button>
                            </li>
                            <li className="mt-auto">
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`group flex gap-x-3 rounded-xl p-3 text-sm font-bold leading-6 w-full hover-lift ${activeTab === 'settings'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <Settings size={20} />
                                    {t('nav.settings')}
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-72">
                {/* Mobile Header - Hidden on Recipes Tab */}
                {activeTab !== 'recipes' && (
                    <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 fade-in">
                        <div className="max-w-md mx-auto flex justify-between items-center relative">
                            <h1 className="text-xl font-black tracking-tighter text-emerald-600">SPOILESS BILLS.</h1>
                        </div>

                        {/* Toolbar for Fridge/History Tabs */}
                        {(activeTab === 'fridge' || activeTab === 'history') && (
                            <div className="max-w-md mx-auto mt-4 space-y-3 scale-in">
                                {/* Search, Sort, and Add Button */}
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search items..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>

                                    {/* Manual Add Button */}
                                    <button
                                        onClick={() => { setManualAddType(activeTab === 'history' ? 'consumed' : 'fridge'); setIsManualAddOpen(true); }}
                                        className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform shrink-0"
                                    >
                                        <Plus size={20} />
                                    </button>

                                    {activeTab === 'fridge' && (
                                        <div className="relative">
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                            >
                                                <option value="expiry">Expiry Date</option>
                                                <option value="created_at">Date Added</option>
                                                <option value="price">Price</option>
                                                <option value="name">Name</option>
                                            </select>
                                            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                        </div>
                                    )}
                                </div>

                                {/* History Filters or Category Filters */}
                                {activeTab === 'history' ? (
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {['all', 'consumed', 'waste'].map(filter => (
                                            <button
                                                key={filter}
                                                onClick={() => setHistoryFilter(filter)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${historyFilter === filter
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {filter}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        <button
                                            onClick={() => setFilterCategory('All')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-colors border ${filterCategory === 'All'
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            All
                                        </button>
                                        {Object.entries(CATEGORIES).map(([key, { icon }]) => (
                                            <button
                                                key={key}
                                                onClick={() => setFilterCategory(key)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-colors border ${filterCategory === key
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <span className="mr-1">{icon}</span> {key}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </header>
                )}
                <main className="max-w-md mx-auto p-6 pb-28 space-y-8">
                    {activeTab === 'home' && (
                        <div className="space-y-6">
                            {/* Welcome */}
                            <div className="flex justify-between items-center px-2">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tighter text-slate-800">{t('home.welcome')}</h2>
                                    <p className="text-slate-400 font-bold text-sm">{t('settings.account')}</p>
                                </div>
                            </div>

                            {/* Stats Filter Toggle */}
                            <div className="flex bg-white/50 backdrop-blur p-1 rounded-2xl border border-slate-200 self-start">
                                {[
                                    { id: 'week', label: t('home.stats.weekly') },
                                    { id: 'month', label: t('home.stats.monthly') },
                                    { id: 'all', label: t('home.stats.all_time') }
                                ].map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setStatsFilter(filter.id)}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statsFilter === filter.id
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            {/* Bento Box Grid */}
                            <div className="flex flex-col gap-4">
                                {/* Top: Total Value (Full Width) */}
                                <div className="w-full p-6 bg-emerald-500 text-white rounded-[2rem] shadow-xl shadow-emerald-200/50 flex flex-col justify-between h-40 relative overflow-hidden">
                                    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                                        <Refrigerator size={140} />
                                    </div>
                                    <p className="text-xs font-black uppercase opacity-80 tracking-widest">{t('home.stats.items_count')}</p>
                                    <div>
                                        <p className="text-5xl font-black tracking-tighter">{items.length}</p>
                                        <p className="text-emerald-100 font-bold text-xs mt-1">{t('common.items')}</p>
                                    </div>
                                </div>

                                {/* Middle: Split Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Wasted */}
                                    <div className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col justify-between h-auto min-h-[140px] hover-lift transition-all">
                                        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                                            <Trash2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400">{t('home.stats.waste_prevented')}</p>
                                            <p className="text-2xl font-black text-slate-800">${filteredTotalWasted.toFixed(2)}</p>
                                            <p className="text-[8px] font-bold text-red-400 mt-1">ALL TIME: ${totalWastedAllTime.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Savings/Consumed */}
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex flex-col justify-between h-auto min-h-[140px] hover-lift transition-all">
                                        <div className="w-10 h-10 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-sm">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-emerald-500">{t('home.stats.saved_money')}</p>
                                            <p className="text-2xl font-black text-emerald-700">${filteredTotalSavings.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Feed */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Bell size={14} /> {t('home.activity')}
                                </h3>
                                <div className="space-y-4">
                                    {activityLogs.length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">No recent activity.</p>
                                    ) : (
                                        activityLogs.map(log => (
                                            <div key={log.id} className="flex gap-3 items-start animate-in fade-in">
                                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${log.action_type === 'WASTE' ? 'bg-red-400' :
                                                    log.action_type === 'CONSUME' ? 'bg-emerald-400' : 'bg-blue-400'
                                                    }`} />
                                                <div>
                                                    <p className="text-sm text-slate-700 font-medium">
                                                        <span className="font-bold text-slate-900">{log.user_email?.split('@')[0]}</span>
                                                        {' '}{log.action_type === 'ADD' ? 'added' : log.action_type === 'WASTE' ? 'wasted' : log.action_type === 'CONSUME' ? 'consumed' : 'updated'}
                                                        {' '}<span className="font-bold">{log.item_name}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.details}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setIsModalOpen(true)} className="p-4 bg-slate-900 text-white rounded-[2rem] shadow-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
                                    <Camera size={28} />
                                    <span className="text-xs font-black uppercase">{t('common.scan')}</span>
                                </button>
                                <button onClick={() => setActiveTab('fridge')} className="p-4 bg-white border border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                                    <Refrigerator size={28} className="text-emerald-500" />
                                    <span className="text-xs font-black uppercase text-slate-600">{t('nav.fridge')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Language Switcher */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <List size={20} className="text-emerald-500" /> {t('settings.language')}
                                </h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { code: 'en', label: 'English' },
                                        { code: 'zh', label: '中文' },
                                        { code: 'ko', label: '한국어' },
                                        { code: 'de', label: 'Deutsch' }
                                    ].map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLanguage(lang.code)}
                                            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${language === lang.code
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Profile Card */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <User size={20} className="text-emerald-500" /> {t('settings.account')}
                                </h2>
                                <p className="text-slate-500 text-sm font-bold mb-4">{session?.user?.email}</p>
                                <button onClick={handleSignOut} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                                    <LogOut size={14} /> {t('settings.logout')}
                                </button>
                            </div>

                            {/* Share Fridge Card */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <Share2 size={20} className="text-emerald-500" /> SHARE FRIDGE
                                </h2>
                                <p className="text-slate-500 text-sm font-bold mb-4">Invite others to manage this fridge.</p>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm">
                                        {inviteCode || 'Generate Code'}
                                    </div>
                                    <button onClick={copyCode} className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
                                        <Copy size={16} />
                                    </button>
                                </div>

                                <button onClick={generateCode} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors">
                                    <Plus size={14} /> GENERATE NEW CODE
                                </button>
                                {inviteCodeExpiry && (
                                    <p className="text-xs text-slate-400 font-bold text-center mt-2">
                                        Expires: {new Date(inviteCodeExpiry).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            {/* Fridge Members */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-emerald-500" /> FRIDGE MEMBERS
                                </h2>
                                <p className="text-slate-500 text-sm font-bold mb-4">
                                    {fridgeMembers.length} {fridgeMembers.length === 1 ? 'person' : 'people'} sharing this fridge
                                </p>

                                <div className="space-y-2 mb-4">
                                    {fridgeMembers.map((member, index) => (
                                        <div key={member.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black text-sm">
                                                {member.email?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-700">{member.email || 'Unknown'}</p>
                                                {member.user_id === session?.user?.id && (
                                                    <p className="text-xs text-emerald-600 font-bold">You</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={leaveFridge}
                                        className="w-full py-3 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors border border-amber-200"
                                    >
                                        <LogOut size={14} /> LEAVE FRIDGE
                                    </button>
                                    <button
                                        onClick={deleteFridge}
                                        className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-colors border border-red-200"
                                    >
                                        <Trash2 size={14} /> DELETE FRIDGE PERMANENTLY
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'waste' && (
                        <div className="space-y-6">
                            {/* Summary Card (Mini) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Total Wasted</p>
                                    <p className="text-2xl font-black text-red-600">${filteredWasteItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items Count</p>
                                    <p className="text-2xl font-black text-slate-900">{filteredWasteItems.length}</p>
                                </div>
                            </div>

                            {filteredWasteItems.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <Trash2 className="w-12 h-12 mx-auto mb-4 stroke-1" />
                                    <p className="font-bold">No waste found</p>
                                    <p className="text-sm">Try adjusting your filters</p>
                                </div>
                            ) : (
                                Object.entries(groupItemsByDate(filteredWasteItems, 'wasted_at')).map(([dateLabel, groupItems]) => (
                                    groupItems.length > 0 && (
                                        <div key={dateLabel} className="animate-in fade-in slide-in-from-bottom-2">
                                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 pl-2">{dateLabel}</h3>
                                            <div className="space-y-3">
                                                {groupItems.map(item => (
                                                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${CATEGORIES[item.category]?.color || CATEGORIES.Other.color}`}>
                                                            {item.emoji || CATEGORIES[item.category]?.icon || '📦'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <p className="font-bold text-slate-800 text-sm truncate">
                                                                    {item.quantity > 1 && <span className="text-red-500 mr-1">x{item.quantity}</span>}
                                                                    {item.name}
                                                                </p>
                                                                <span className="font-bold text-slate-400 text-[10px]">${(item.price * (item.quantity || 1))?.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    Wasted: {new Date(item.wastedAt || item.wasted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Kebab Menu */}
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                                                className="p-2 text-slate-300 hover:text-slate-600 rounded-lg"
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {openMenuId === item.id && (
                                                                <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-20 min-w-[140px] flex flex-col gap-1 animate-in fade-in zoom-in-95 origin-top-right">
                                                                    <button onClick={() => { setEditingItem(item); setEditType('waste'); setOpenMenuId(null); }} className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                                                                        <Pencil size={14} /> Edit Details
                                                                    </button>
                                                                    {/* Future: Restore to Fridge */}
                                                                </div>
                                                            )}
                                                            {activeTab === 'waste' && openMenuId === item.id && (
                                                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'recipes' && (
                        <div className="flex flex-col h-[calc(100vh-180px)]">
                            {/* Chat Header */}
                            <div className="bg-white p-4 rounded-b-[2rem] shadow-sm border-b border-slate-100 flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center p-1">
                                        <ChefHat size={20} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-slate-800">{t('recipes.title')}</h2>
                                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${dailyRecipeCount >= 2 ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                            {dailyRecipeCount >= 2 ? t('recipes.offline') : t('recipes.online')}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-500">{dailyRecipeCount}/2 {t('nav.recipes')}</p>
                                </div>
                            </div>

                            {/* Chat Feed */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'assistant' ? 'bg-emerald-100 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                                            {msg.role === 'assistant' ? <Bot size={16} className="text-emerald-600" /> : <UserCircle2 size={16} className="text-slate-500" />}
                                        </div>

                                        {/* Bubble */}
                                        <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.role === 'assistant'
                                            ? 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                            : 'bg-emerald-500 text-white rounded-tr-none'}`}>
                                            {msg.isRecipe ? (
                                                <div className="prose prose-emerald prose-sm dark:prose-invert max-w-none">
                                                    <SimpleMarkdownRenderer content={msg.text} />
                                                </div>
                                            ) : (
                                                <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Typing Indicator */}
                                {isTyping && (
                                    <div className="flex gap-3 animate-in fade-in">
                                        <div className="w-8 h-8 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center">
                                            <Bot size={16} className="text-emerald-600" />
                                        </div>
                                        <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm h-12">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area (Fixed) */}
                            <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                                {/* Quick Replies (Only if not typing and limit not reached) */}
                                {!isTyping && dailyRecipeCount < 2 && (
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide px-2">
                                        <button onClick={() => generateRecipe('expiring')} className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm active:scale-95">
                                            Use Expiring ⏳
                                        </button>
                                        <button onClick={() => generateRecipe('surprise')} className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors shadow-sm active:scale-95">
                                            Surprise Me 🎲
                                        </button>
                                    </div>
                                )}

                                {/* Text Input */}
                                <form onSubmit={handleChatSubmit} className="flex gap-2 items-center bg-white p-2 rounded-[2rem] shadow-lg border border-slate-100">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={dailyRecipeCount >= 2 ? "Daily limit reached..." : "Ask for a specific recipe..."}
                                        disabled={dailyRecipeCount >= 2 || isTyping}
                                        className="flex-1 pl-4 py-2 bg-transparent text-sm font-bold text-slate-700 placeholder:text-slate-300 outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim() || dailyRecipeCount >= 2 || isTyping}
                                        className="p-2.5 bg-emerald-500 text-white rounded-full disabled:bg-slate-200 disabled:text-slate-400 transition-all hover:bg-emerald-600 active:scale-95"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fridge' && (
                        <div className="space-y-6">
                            {/* Quick Stats Summary - Fridge */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fridge.title')}</p>
                                    <p className="text-2xl font-black text-slate-900">${filteredItems.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0).toFixed(2)}</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{t('home.stats.expiring_soon')}</p>
                                    <p className="text-2xl font-black text-amber-600">{filteredItems.filter(i => {
                                        const days = Math.ceil((new Date(i.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                        return days <= 3 && days >= 0;
                                    }).length} <span className="text-xs font-bold opacity-60">{t('common.items')}</span></p>
                                </div>
                            </div>

                            {filteredItems.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <Refrigerator className="w-12 h-12 mx-auto mb-4 stroke-1" />
                                    <p className="font-bold">{t('fridge.empty')}</p>
                                    <p className="text-sm">{t('fridge.adjust_filters')}</p>
                                </div>
                            ) : (
                                Object.entries(groupItemsByDate(filteredItems)).map(([dateLabel, groupItems]) => (
                                    groupItems.length > 0 && (
                                        <div key={dateLabel} className="animate-in fade-in slide-in-from-bottom-2">
                                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 pl-2">{dateLabel}</h3>
                                            <div className="space-y-3">
                                                {groupItems.map(item => {
                                                    const isExpired = new Date(item.expiry) < new Date();
                                                    const daysLeft = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                                    return (
                                                        <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${CATEGORIES[item.category]?.color || CATEGORIES.Other.color}`}>
                                                                {item.emoji || CATEGORIES[item.category]?.icon || '📦'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="font-bold text-slate-800 text-sm truncate">
                                                                        {item.quantity > 1 && <span className="text-emerald-600 mr-1">x{item.quantity}</span>}
                                                                        {item.name}
                                                                    </p>
                                                                    <span className="font-bold text-slate-400 text-[10px]">${(item.price * (item.quantity || 1))?.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className={`text-[10px] font-bold ${isExpired ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                                        {isExpired ? 'Expired' : `${daysLeft} days left`}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Kebab Menu */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                                                    className="p-2 text-slate-300 hover:text-slate-600 rounded-lg"
                                                                >
                                                                    <MoreVertical size={16} />
                                                                </button>
                                                                {openMenuId === item.id && (
                                                                    <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-20 min-w-[140px] flex flex-col gap-1 animate-in fade-in zoom-in-95 origin-top-right">
                                                                        <button onClick={() => { setEditingItem(item); setEditType('fridge'); setOpenMenuId(null); }} className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                                                                            <Pencil size={14} /> {t('common.edit')}
                                                                        </button>
                                                                        <button onClick={() => { markConsumed(item.id); setOpenMenuId(null); }} className="flex items-center gap-2 p-3 hover:bg-emerald-50 rounded-lg text-xs font-bold text-emerald-600">
                                                                            <CheckCircle2 size={14} /> {t('common.consume')}
                                                                        </button>
                                                                        <button onClick={() => { markWasted(item.id); setOpenMenuId(null); }} className="flex items-center gap-2 p-3 hover:bg-red-50 rounded-lg text-xs font-bold text-red-500">
                                                                            <Trash2 size={14} /> {t('history.wasted')}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {/* Backdrop to close menu */}
                                                                {openMenuId === item.id && (
                                                                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>
                    )}

                    {/* Unified History Tab */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {Object.entries(historyGroups).map(([date, items]) => (
                                <div key={date}>
                                    <h3 className="sticky top-[140px] z-10 py-2 bg-slate-50/95 backdrop-blur text-xs font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">
                                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </h3>
                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div key={item.uniqueId} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group ${item.type === 'waste' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-emerald-400'}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{CATEGORIES[item.category]?.icon || '📦'}</span>
                                                    <div>
                                                        <p className="font-black text-slate-800">{item.name}</p>
                                                        <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                                                            <span>{item.quantity}x</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span>${item.price}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.uniqueId ? null : item.uniqueId); }}
                                                        className="p-2 text-slate-300 hover:text-slate-600 rounded-lg"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {openMenuId === item.uniqueId && (
                                                        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-20 min-w-[140px] flex flex-col gap-1 animate-in fade-in zoom-in-95 origin-top-right">
                                                            <button
                                                                onClick={() => { setEditingItem(item); setEditType(item.type); setOpenMenuId(null); }}
                                                                className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600"
                                                            >
                                                                <Pencil size={14} /> {t('common.edit')}
                                                            </button>
                                                            <button
                                                                onClick={() => { deleteHistoryItem(item.id, item.type); setOpenMenuId(null); }}
                                                                className="flex items-center gap-2 p-3 hover:bg-red-50 rounded-lg text-xs font-bold text-red-500"
                                                            >
                                                                <Trash2 size={14} /> {t('common.delete')}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {openMenuId === item.uniqueId && (
                                                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(historyGroups).length === 0 && (
                                <div className="text-center py-20 opacity-50">
                                    <History size={48} className="mx-auto mb-4 text-slate-300" />
                                    <p className="font-bold text-slate-400">{t('history.empty')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* FAB (Lifted for Bottom Nav) - Hidden on Recipes Tab */}
                {
                    activeTab !== 'recipes' && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
                        >
                            <Camera size={24} />
                        </button>
                    )
                }


                {/* Modal */}
                {
                    isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">

                                {/* Modal Header */}
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        {modalStep === 'upload' && <><Camera className="text-emerald-500" /> {t('common.scan')}</>}
                                        {modalStep === 'loading' && <><Loader2 className="animate-spin text-emerald-500" /> {t('common.loading')}</>}
                                        {modalStep === 'verify' && <><CheckCircle2 className="text-emerald-500" /> {t('common.save')}</>}
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
                                                <div key={item.id} className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Item Name</label>
                                                            <input
                                                                value={item.name}
                                                                onChange={(e) => updateDraft(item.id, 'name', e.target.value)}
                                                                className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none w-full focus:border-emerald-500 transition-colors"
                                                                placeholder="Item Name"
                                                            />
                                                        </div>
                                                        <button onClick={() => setDraftItems(prev => prev.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-red-500 p-2 mt-4 bg-white rounded-lg border border-slate-200 hover:border-red-200 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Price ($)</label>
                                                            <input type="number" value={item.price} onChange={(e) => updateDraft(item.id, 'price', parseFloat(e.target.value))}
                                                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Qty</label>
                                                            <input type="number" value={item.quantity || 1} onChange={(e) => updateDraft(item.id, 'quantity', parseInt(e.target.value))}
                                                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Expiry</label>
                                                            <input type="date" value={item.expiry} onChange={(e) => updateDraft(item.id, 'expiry', e.target.value)}
                                                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Category</label>
                                                        <select value={item.category} onChange={(e) => updateDraft(item.id, 'category', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors">
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
                                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                                                    <CheckCircle2 /> SAVE TO FRIDGE
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
                {isManualAddOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase">
                                    <Plus className="text-emerald-500" /> Add to {manualAddType}
                                </h2>
                                <button onClick={() => setIsManualAddOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleManualAddSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Item Name</label>
                                    <input name="name" required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-emerald-500 outline-none" placeholder="e.g. Milk" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Quantity</label>
                                        <input name="quantity" type="number" min="1" defaultValue="1" required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Price ($)</label>
                                        <input name="price" type="number" step="0.01" defaultValue="0.00" className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-emerald-500 outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                    <select name="category" className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-emerald-500 outline-none">
                                        {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>

                                {manualAddType === 'fridge' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Expiry Date</label>
                                        <input name="expiry" type="date" required className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-emerald-500 outline-none" />
                                    </div>
                                )}

                                <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-wide shadow-lg shadow-emerald-200 mt-4 active:scale-95 transition-all">
                                    Add Item
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Partial Waste Modal */}
                {
                    wastingItem && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setWastingItem(null)} />
                            <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                                        {wastingItem.emoji || '🗑️'}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800">How many wasted?</h3>
                                    <p className="text-slate-400 text-sm font-bold">You have {wastingItem.quantity} total.</p>
                                </div>

                                <div className="flex items-center justify-center gap-6 mb-8">
                                    <button
                                        onClick={() => setWasteAmount(prev => Math.max(1, prev - 1))}
                                        className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                                    >
                                        <ArrowUpDown className="rotate-90" size={20} />
                                    </button>
                                    <span className="text-4xl font-black text-slate-800 tabular-nums">{wasteAmount}</span>
                                    <button
                                        onClick={() => setWasteAmount(prev => Math.min(wastingItem.quantity, prev + 1))}
                                        className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => confirmWaste(wastingItem, wasteAmount)}
                                        className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-colors"
                                    >
                                        CONFIRM WASTE
                                    </button>
                                    <button
                                        onClick={() => setWastingItem(null)}
                                        className="w-full py-3 text-slate-400 font-bold text-xs hover:text-slate-600"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Edit Modal */}
                {
                    editingItem && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
                            <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <Pencil size={20} className="text-emerald-500" /> EDIT DETAILS
                                    </h3>
                                    <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Item Name</label>
                                        <input
                                            type="text"
                                            value={editingItem.name}
                                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Quantity</label>
                                            <input
                                                type="number"
                                                value={editingItem.quantity}
                                                onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Price ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingItem.price}
                                                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Category</label>
                                            <select
                                                value={editingItem.category}
                                                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                            >
                                                {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        {editType === 'fridge' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Expiry</label>
                                                <input
                                                    type="date"
                                                    value={editingItem.expiry}
                                                    onChange={(e) => setEditingItem({ ...editingItem, expiry: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleEditSave}
                                        className="w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-colors"
                                    >
                                        SAVE CHANGES
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bottom Navigation - Mobile Only */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-30 pb-safe-area-inset-bottom">
                    <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <Home size={24} className={activeTab === 'home' ? 'fill-emerald-100' : ''} />
                    </button>
                    <button onClick={() => setActiveTab('fridge')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'fridge' ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <Refrigerator size={24} className={activeTab === 'fridge' ? 'fill-emerald-100' : ''} />
                    </button>
                    <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'recipes' ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <ChefHat size={24} className={activeTab === 'recipes' ? 'fill-emerald-100' : ''} />
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <History size={activeTab === 'history' ? 24 : 22} strokeWidth={activeTab === 'history' ? 3 : 2} />
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <Settings size={24} className={activeTab === 'settings' ? 'fill-emerald-100' : ''} />
                    </button>
                </div>
            </div>
        </div>
    );
}
