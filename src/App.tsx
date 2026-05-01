import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Shield, Zap, Sparkles, Swords, Dice1, UserPlus, Copy, LogOut, Skull, Maximize, Minimize, Flame, FlaskConical, Trophy, RotateCcw } from 'lucide-react';

// --- Firebase Initialization ---
const userFirebaseConfig = {
    apiKey: "AIzaSyAM_rP5k7PAuBq8_Xkin23X9NYW5qolJsM",
    authDomain: "ludo-14af4.firebaseapp.com",
    projectId: "ludo-14af4",
    // ADD OR VERIFY THIS LINE MATCHES YOUR LOCATION:
    databaseURL: "https://ludo-14af4-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "ludo-14af4.firebasestorage.app",
    messagingSenderId: "1097419329945",
    appId: "1:1097419329945:web:9a614fafeabf3239ea0308",
    measurementId: "G-J9KFD9VB38"
  };

const isCanvasEnvironment = typeof __firebase_config !== 'undefined';
const firebaseConfig = isCanvasEnvironment ? JSON.parse(__firebase_config) : userFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : "snakes-and-sorcery-prod";

// --- Global Styles ---
const GlobalStyles = () => (
    <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .special-bless { box-shadow: inset 0 0 25px rgba(251,191,36,0.6); }
        .special-curse { box-shadow: inset 0 0 25px rgba(168,85,247,0.6); }
        .special-card  { box-shadow: inset 0 0 25px rgba(59,130,246,0.6); }
    `}} />
);

// --- Game Constants ---
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const EMOJIS = ['🦁', '🦊', '🐉', '🦄', '🐼', '🐸', '🐙', '🚀', '🐱', '🐶', '🐰', '🐻'];

const CLASSES = {
    knight: { id: 'knight', name: 'Knight', desc: 'Immune to first Snake/Curse. Blessings give you +2 instead of +1.', icon: Shield },
    rogue: { id: 'rogue', name: 'Rogue', desc: 'Adds +1 to all your dice rolls.', icon: Zap },
    mage: { id: 'mage', name: 'Mage', desc: 'Starts with 1 exclusive powerful Spell Card. Draws from a special pool.', icon: Sparkles },
    warlock: { id: 'warlock', name: 'Warlock', desc: "Blessings don't help you. You heavily curse (-2) an opponent instead.", icon: Skull },
    berserker: { id: 'berserker', name: 'Berserker', desc: 'Relentless: 1s become 2s. If an opponent hits you with a spell, you gain +2 to your next roll.', icon: Flame },
    alchemist: { id: 'alchemist', name: 'Alchemist', desc: 'Brewmaster: Landing on a Card tile grants you +1 extra card.', icon: FlaskConical }
};

const CARDS = {
    sprint: { id: 'sprint', name: 'Sprint', desc: 'Move forward 3 spaces.' },
    sabotage: { id: 'sabotage', name: 'Sabotage', desc: 'All opponents move back 2 spaces.' },
    shield: { id: 'shield', name: 'Magic Shield', desc: 'Become immune to the next snake or curse.' },
    teleport: { id: 'teleport', name: 'Teleport', desc: 'Move forward 5 spaces instantly.' },
    swap: { id: 'swap', name: 'Illusion Swap', desc: 'Swap places with a random opponent.' },
    thief: { id: 'thief', name: 'Thief', desc: 'Steal a random card from an opponent.' },
    gust: { id: 'gust', name: 'Wind Gust', desc: 'Blow all opponents back 1 space.' }
};

const MAGE_CARDS = {
    meteor: { id: 'meteor', name: 'Meteor Strike', desc: 'All opponents move back 4 spaces.' },
    timewarp: { id: 'timewarp', name: 'Time Warp', desc: 'Gain +3 to your next 2 rolls.' },
    levitate: { id: 'levitate', name: 'Levitate', desc: 'Move forward 7 spaces instantly.' }
};

const getRandomCard = (playerClass) => {
    let keys = Object.keys(CARDS);
    if (playerClass === 'mage') {
        keys = [...keys, ...Object.keys(MAGE_CARDS)];
    }
    return keys[Math.floor(Math.random() * keys.length)];
};

const getRandomMageCard = () => {
    const keys = Object.keys(MAGE_CARDS);
    return keys[Math.floor(Math.random() * keys.length)];
};

const FIXED_SNAKES_LADDERS = {
    16: { type: 'snake', to: 6 }, 47: { type: 'snake', to: 26 },
    49: { type: 'snake', to: 11 }, 56: { type: 'snake', to: 53 },
    62: { type: 'snake', to: 19 }, 64: { type: 'snake', to: 60 },
    87: { type: 'snake', to: 24 }, 93: { type: 'snake', to: 73 },
    95: { type: 'snake', to: 75 }, 98: { type: 'snake', to: 78 },
    2: { type: 'ladder', to: 38 }, 4: { type: 'ladder', to: 14 },
    9: { type: 'ladder', to: 31 }, 21: { type: 'ladder', to: 42 },
    28: { type: 'ladder', to: 84 }, 36: { type: 'ladder', to: 44 },
    51: { type: 'ladder', to: 67 }, 71: { type: 'ladder', to: 91 },
    80: { type: 'ladder', to: 100 }
};

const DEFAULT_BOARD_CONFIG = { curses: 4, blessings: 4, cards: 18 };

const generateBoardSpecials = (config) => {
    const specials = { ...FIXED_SNAKES_LADDERS };
    const available = Array.from({length: 98}, (_, i) => i + 2).filter(num => !specials[num]);

    const pullRandom = () => {
        if (available.length === 0) return null;
        const idx = Math.floor(Math.random() * available.length);
        return available.splice(idx, 1)[0];
    };

    for(let i=0; i<config.curses; i++) { const start = pullRandom(); if(start) specials[start] = { type: 'curse' }; }
    for(let i=0; i<config.blessings; i++) { const start = pullRandom(); if(start) specials[start] = { type: 'bless' }; }
    for(let i=0; i<config.cards; i++) { const start = pullRandom(); if(start) specials[start] = { type: 'card', val: Math.random() > 0.7 ? 2 : 1 }; }

    return specials;
};

const getBoardCells = () => {
    let cells = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const y = 9 - row;
            let num = y % 2 === 0 ? (y * 10 + col + 1) : (y * 10 + (9 - col) + 1);
            cells.push(num);
        }
    }
    return cells;
};

const findFace = (rx, ry, rz) => {
    const radX = rx * Math.PI / 180; const radY = ry * Math.PI / 180; const radZ = rz * Math.PI / 180;
    const cx = Math.cos(radX), sx = Math.sin(radX);
    const cy = Math.cos(radY), sy = Math.sin(radY);
    const cz = Math.cos(radZ), sz = Math.sin(radZ);

    let bestFace = 1;
    let maxZ = -Infinity;

    const normals = [
        {f: 1, x: 0, y: 0, z: 1}, {f: 2, x: -1, y: 0, z: 0}, {f: 3, x: 0, y: 0, z: -1},
        {f: 4, x: 1, y: 0, z: 0}, {f: 5, x: 0, y: -1, z: 0}, {f: 6, x: 0, y: 1, z: 0}
    ];

    for (let n of normals) {
        let x1 = n.x * cz - n.y * sz; let y1 = n.x * sz + n.y * cz; let z1 = n.z;
        let x2 = x1 * cy + z1 * sy; let y2 = y1; let z2 = -x1 * sy + z1 * cy;
        let z3 = y2 * sx + z2 * cx;
        if (z3 > maxZ) { maxZ = z3; bestFace = n.f; }
    }
    return bestFace;
};

// --- Timeout Helper for Firebase Connections ---
const withTimeout = (promise, ms, customErrorMsg) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(customErrorMsg)), ms))
    ]);
};

// --- Main Application Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null); 
    
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) {
                console.error("Auth Error", err);
                setAuthError(err.message);
                setLoading(false);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
                setAuthError(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !roomId) return;
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
        
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                setRoomData(docSnap.data());
            } else {
                setRoomId(null);
                setRoomData(null);
            }
        }, (err) => {
            console.error("Firestore Listen Error:", err);
            if(err.code === 'permission-denied') setAuthError("Firestore Permission Denied. Is Test Mode enabled?");
        });

        return () => unsubscribe();
    }, [user, roomId]);

    // Show a massive error screen if Firebase fails, preventing the silent button freeze
    if (authError) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="bg-red-900/40 border-2 border-red-500/50 p-8 rounded-2xl max-w-lg shadow-2xl">
                    <Skull size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2 text-red-300">Firebase Connection Failed</h2>
                    <p className="text-slate-300 text-sm mb-6 bg-black/30 p-3 rounded font-mono break-words">{authError}</p>
                    <div className="text-left text-sm text-slate-300 space-y-2">
                        <p><strong>To fix this, check your settings:</strong></p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><b>Disable your browser's AdBlocker or Privacy Shield (like Opera GX's Shield) for this website.</b></li>
                            <li>Go to Firebase Console &gt; Authentication &gt; Authorized Domains and ensure your URL (e.g. <b>crostiam.github.io</b>) is added.</li>
                            <li>Ensure <b>Firestore Database</b> is actually created and Test Mode is enabled.</li>
                        </ul>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors border border-slate-600">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold animate-pulse">Summoning Magic...</div>;
    }

    if (!roomId || !roomData) {
        return <LobbyScreen user={user} setRoomId={setRoomId} />;
    }

    return (
        <>
            <GlobalStyles />
            <GameRoom user={user} roomId={roomId} setRoomId={setRoomId} roomData={roomData} />
        </>
    );
}

// --- Lobby & Setup Screen ---
function LobbyScreen({ user, setRoomId }) {
    const [name, setName] = useState('');
    const [selectedClass, setSelectedClass] = useState('knight');
    const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [boardConfig, setBoardConfig] = useState(DEFAULT_BOARD_CONFIG);

    const handleCreate = async () => {
        if (!name.trim()) return setError("Please enter a name");
        if (!user) return setError("Not connected to database!");
        
        setIsProcessing(true);
        setError('');
        
        try {
            const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
            const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', newRoomId);
            
            // Wrapped in a timeout so it unfreezes and throws an error if an AdBlocker kills the connection
            await withTimeout(
                setDoc(roomRef, {
                    status: 'waiting',
                    turnIndex: 0,
                    winner: null,
                    boardSpecials: generateBoardSpecials(boardConfig),
                    logs: ["Room created. Waiting for players..."],
                    players: [{
                        id: user.uid,
                        name: name.trim(),
                        class: selectedClass,
                        emoji: selectedEmoji,
                        color: COLORS[0],
                        position: 1,
                        cards: [],
                        hasShield: false,
                        usedKnightCurse: false,
                        usedKnightSnake: false,
                        diceModifier: null
                    }]
                }),
                5000,
                "Connection timed out. Your browser's AdBlocker/Shield is blocking the game's database! Please turn it off for this website."
            );
            
            setRoomId(newRoomId);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleJoin = async () => {
        if (!name.trim()) return setError("Please enter a name");
        if (!roomCodeInput.trim()) return setError("Enter a room code");
        if (!user) return setError("Not connected to database!");
        
        setIsProcessing(true);
        setError('');

        try {
            const code = roomCodeInput.trim().toUpperCase();
            const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', code);
            
            // Wrapped in a timeout
            const snap = await withTimeout(
                getDoc(roomRef),
                5000,
                "Connection timed out. Your browser's AdBlocker/Shield is blocking the game's database! Please turn it off for this website."
            );

            if (snap.exists()) {
                const data = snap.data();
                if (data.status !== 'waiting' && !data.players.find(p => p.id === user.uid)) {
                    setError("Game already in progress!");
                    setIsProcessing(false);
                    return;
                }
                if (!data.players.find(p => p.id === user.uid)) {
                    const newPlayer = {
                        id: user.uid,
                        name: name.trim(),
                        class: selectedClass,
                        emoji: selectedEmoji,
                        color: COLORS[data.players.length % COLORS.length],
                        position: 1,
                        cards: [],
                        hasShield: false,
                        usedKnightCurse: false,
                        usedKnightSnake: false,
                        diceModifier: null
                    };
                    await withTimeout(
                        updateDoc(roomRef, { players: [...data.players, newPlayer] }),
                        5000,
                        "Connection timed out. Your browser's AdBlocker/Shield is blocking the game's database! Please turn it off for this website."
                    );
                }
                setRoomId(code);
            } else {
                setError("Room not found!");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-indigo-500/30">
                <div className="flex justify-center mb-4 text-indigo-400">
                    <Swords size={48} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                </div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400 mb-8 text-center">
                    Snakes & Sorcery
                </h1>

                {/* Modals for Rules and Settings */}
                {showRules && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-[80vh]">
                            <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2"><Swords /> Game Rules</h2>
                            <div className="text-slate-300 space-y-3 text-sm">
                                <p><strong>Goal:</strong> Be the first to reach space 100!</p>
                                <p><strong>Movement:</strong> Open the Dice Tray and grab the dice, pulling it back like a slingshot to throw it. The result determines your roll. Then drag your avatar to the highlighted space.</p>
                                <p><strong>Special Tiles:</strong></p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><span className="text-green-400 font-bold">🪜 Ladders:</span> Instantly climb up to a higher space.</li>
                                    <li><span className="text-red-400 font-bold">🐍 Snakes:</span> Slide down to a lower space.</li>
                                    <li><span className="text-amber-400 font-bold">✨ Blessings:</span> Gain a +1 bonus to your next 2 rolls.</li>
                                    <li><span className="text-purple-400 font-bold">💀 Curses:</span> Suffer a -1 penalty (or -2 from Warlocks) to your next 2 rolls & discard 1 spell card.</li>
                                    <li><span className="text-blue-400 font-bold">🃏 Cards:</span> Land here to draw powerful magical spell cards!</li>
                                </ul>
                                <p className="pt-2"><strong>Classes:</strong> Each hero has a unique passive ability (e.g., Rogues get +1 to all rolls, Knights resist the first curse).</p>
                            </div>
                            <button onClick={() => setShowRules(false)} className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Board Settings</h2>
                            <div className="space-y-4">
                                {Object.keys(boardConfig).map(key => (
                                    <div key={key} className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-300 capitalize">{key}</label>
                                        <input 
                                            type="number" 
                                            min="0" max="25"
                                            value={boardConfig[key]}
                                            onChange={(e) => setBoardConfig({...boardConfig, [key]: Math.min(25, Math.max(0, parseInt(e.target.value) || 0))})}
                                            className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-center font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-4 italic">Note: Only the host's settings are used when generating the board.</p>
                            <button onClick={() => setShowSettings(false)} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl transition-colors">Save Settings</button>
                        </div>
                    </div>
                )}

                {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm font-semibold">{error}</div>}

                <div className="flex justify-center gap-6 mb-6">
                    <button onClick={() => setShowRules(true)} className="text-sm font-bold text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/50 underline-offset-4 transition-colors">Rules 📜</button>
                    <button onClick={() => setShowSettings(true)} className="text-sm font-bold text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/50 underline-offset-4 transition-colors">Board Settings ⚙️</button>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Your Hero Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={12}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                        placeholder="e.g. Arthur"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Choose Avatar</label>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => setSelectedEmoji(e)} 
                                className={`w-10 h-10 flex items-center justify-center text-xl rounded-full border-2 transition-all shadow-sm ${selectedEmoji === e ? 'border-indigo-500 bg-indigo-500/20 scale-110 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/80'}`}>
                                {e}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Select Class</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 h-48 overflow-y-auto pr-2 hide-scrollbar">
                        {Object.values(CLASSES).map(cls => {
                            const Icon = cls.icon;
                            const isSelected = selectedClass === cls.id;
                            return (
                                <button key={cls.id} onClick={() => setSelectedClass(cls.id)} 
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all shadow-md h-full ${isSelected ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/80'}`}>
                                    <Icon className={`w-6 h-6 mb-2 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                                    <span className={`text-sm font-bold shrink-0 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{cls.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-sm text-indigo-300/80 mt-4 h-10 text-center italic font-medium">{CLASSES[selectedClass].desc}</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleCreate} disabled={isProcessing} className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                        Create Room
                    </button>
                    <div className="flex-1 flex gap-2">
                        <input type="text" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} maxLength={4}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-3 text-center uppercase tracking-widest font-mono text-lg focus:outline-none focus:border-indigo-500 shadow-inner"
                            placeholder="CODE"
                        />
                        <button onClick={handleJoin} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                            Join
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Visual Board Utilities ---
const getCellCoords = (num) => {
    let i = num - 1;
    let row = 9 - Math.floor(i / 10);
    let col = i % 10;
    if ((9 - row) % 2 !== 0) col = 9 - col;
    return { x: col * 10 + 5, y: row * 10 + 5 };
};

const BoardOverlay = ({ specials }) => (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
        {Object.entries(specials || {}).map(([start, data]) => {
            if (!data.to) return null;
            const p1 = getCellCoords(parseInt(start));
            const p2 = getCellCoords(data.to);
            if (data.type === 'ladder') {
                return (
                    <g key={`ladder-${start}`}>
                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#15803d" strokeWidth="3" opacity="0.3" strokeLinecap="round" />
                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#86efac" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.5" strokeLinecap="round" />
                    </g>
                );
            } else if (data.type === 'snake') {
                const mx = (p1.x + p2.x) / 2 + (p1.x < p2.x ? 6 : -6);
                const my = (p1.y + p2.y) / 2;
                return (
                    <path key={`snake-${start}`} d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                );
            }
            return null;
        })}
    </svg>
);

// --- Main Game Room ---
function GameRoom({ user, roomId, setRoomId, roomData }) {
    const [toast, setToast] = useState('');
    const diceRef = useRef(null);
    const shadowRef = useRef(null);
    const [dragState, setDragState] = useState({ isDragging: false, clientX: 0, clientY: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [diceWindowOpen, setDiceWindowOpen] = useState(false);
    const [diceGrab, setDiceGrab] = useState({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
    
    const myPlayerIndex = roomData.players.findIndex(p => p.id === user.uid);
    const myPlayer = roomData.players[myPlayerIndex];
    const isMyTurn = roomData.turnIndex === myPlayerIndex && roomData.status === 'playing';
    const amIHost = myPlayerIndex === 0;

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const toggleFullscreen = () => {
        try {
            if (!document.fullscreenElement) {
                const req = document.documentElement.requestFullscreen();
                if (req && req.catch) {
                    req.catch(err => {
                        console.error("Fullscreen blocked by environment:", err);
                        showToast("Fullscreen is restricted in this preview window.");
                    });
                }
            } else {
                const req = document.exitFullscreen();
                if (req && req.catch) {
                    req.catch(err => console.error(err));
                }
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
            showToast("Fullscreen is restricted in this preview window.");
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // --- Automatic UI State Handling for the Math Overlay ---
    useEffect(() => {
        if (roomData?.status === 'waiting_for_move') {
            setDiceWindowOpen(true);
            
            if (diceRef.current) {
                const targetRotations = {
                    1: { x: 0, y: 0 }, 2: { x: 0, y: -90 }, 3: { x: 0, y: 180 },
                    4: { x: 0, y: 90 }, 5: { x: -90, y: 0 }, 6: { x: 90, y: 0 },
                };
                const tRot = targetRotations[roomData.diceBase] || {x:0, y:0};
                diceRef.current.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                diceRef.current.style.transform = `translate3d(0px, 160px, 0px) rotateX(${tRot.x}deg) rotateY(${tRot.y}deg) rotateZ(0deg)`;
            }
            if (shadowRef.current) {
                shadowRef.current.style.transition = 'all 0.5s ease';
                shadowRef.current.style.transform = `translateX(-50%) translateX(0px) scale(0.2)`;
                shadowRef.current.style.opacity = 0.7;
            }

            const timer = setTimeout(() => {
                setDiceWindowOpen(false);
            }, 3500);
            return () => clearTimeout(timer);
            
        } else if (roomData?.status === 'evaluating_tile' || roomData?.status === 'finished') {
            setDiceWindowOpen(false);
        }
    }, [roomData?.status, roomData?.diceBase]);

    // --- 3D Custom Physics Engine for Dice Throw ---
    useEffect(() => {
        let frameId;
        
        if (roomData?.status === 'rolling' && roomData.physicsSeed) {
            setDiceWindowOpen(true);
            if (diceRef.current) diceRef.current.style.transition = 'none';
            if (shadowRef.current) shadowRef.current.style.transition = 'none';
            
            let pos = { ...roomData.physicsSeed.pos };
            let vel = { ...roomData.physicsSeed.vel };
            let rot = { ...roomData.physicsSeed.rot };
            let rotVel = { ...roomData.physicsSeed.rotVel };
            
            const floorY = 160;     
            const ceilingY = -300;  
            const gravity = 1.2;
            const bounce = -0.6;
            
            let state = 'flying';
            
            const targetRotations = {
                1: { x: 0, y: 0 }, 2: { x: 0, y: -90 }, 3: { x: 0, y: 180 },
                4: { x: 0, y: 90 }, 5: { x: -90, y: 0 }, 6: { x: 90, y: 0 },
            };
            const tRot = targetRotations[roomData.diceBase] || {x:0, y:0};

            const getNearestAngle = (current, target) => {
                let currMod = current % 360;
                if (currMod < 0) currMod += 360;
                let diff = target - currMod;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                return current + diff;
            };

            let settlingProgress = 0;
            let startSettleRot = {x:0, y:0, z:0};
            let targetSettleRot = {x:0, y:0, z:0};

            const updatePhysics = () => {
                if (state === 'flying' || state === 'bouncing') {
                    vel.y += gravity; pos.x += vel.x; pos.y += vel.y;
                    rot.x += rotVel.x; rot.y += rotVel.y; rot.z += rotVel.z;
                    const wallX = 130; 

                    if (pos.x > wallX) { pos.x = wallX; vel.x *= bounce; rotVel.y *= 0.8; rotVel.z *= 0.8; } 
                    else if (pos.x < -wallX) { pos.x = -wallX; vel.x *= bounce; rotVel.y *= 0.8; rotVel.z *= 0.8; }
                    if (pos.y < ceilingY) { pos.y = ceilingY; vel.y *= bounce; }
                    
                    if (pos.y > floorY) {
                        pos.y = floorY; vel.y *= bounce; vel.x *= 0.85; 
                        rotVel.x *= 0.75; rotVel.y *= 0.75; rotVel.z *= 0.75;

                        if (Math.abs(vel.y) < 4 && Math.abs(pos.y - floorY) < 5) {
                            state = 'settling';
                            startSettleRot = { ...rot };
                            targetSettleRot = {
                                x: getNearestAngle(rot.x, tRot.x),
                                y: getNearestAngle(rot.y, tRot.y),
                                z: getNearestAngle(rot.z, 0)
                            };
                        }
                    }
                } else if (state === 'settling') {
                    settlingProgress += 0.04; 
                    if (settlingProgress >= 1) {
                        settlingProgress = 1;
                        state = 'finished';
                        
                        if (roomData.turnIndex === myPlayerIndex) {
                            setTimeout(async () => {
                                const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
                                await updateDoc(roomRef, { status: 'waiting_for_move' });
                            }, 500); 
                        }
                    }
                    
                    let ease = 1 - Math.pow(1 - settlingProgress, 3);
                    rot.x = startSettleRot.x + (targetSettleRot.x - startSettleRot.x) * ease;
                    rot.y = startSettleRot.y + (targetSettleRot.y - startSettleRot.y) * ease;
                    rot.z = startSettleRot.z + (targetSettleRot.z - startSettleRot.z) * ease;
                }
                
                if (diceRef.current) {
                    diceRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0px) rotateX(${rot.x}deg) rotateY(${rot.y}deg) rotateZ(${rot.z}deg)`;
                }
                if (shadowRef.current) {
                    let heightAboveFloor = Math.max(0, floorY - pos.y);
                    let scale = Math.max(0.2, 1 - heightAboveFloor / 400);
                    let opacity = Math.max(0, 0.7 - heightAboveFloor / 500);
                    shadowRef.current.style.transform = `translateX(-50%) translateX(${pos.x}px) scale(${scale})`;
                    shadowRef.current.style.opacity = opacity;
                }
                
                if (state !== 'finished') {
                    frameId = requestAnimationFrame(updatePhysics);
                }
            };
            
            frameId = requestAnimationFrame(updatePhysics);
        }
        
        return () => {
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [roomData?.status, roomData?.physicsSeed, roomData?.diceBase, myPlayerIndex, roomId]);

    const handleDicePointerDown = (e) => {
        if (!isMyTurn || roomData.status !== 'playing') return;
        e.stopPropagation();
        setDiceGrab({ active: true, startX: e.clientX, startY: e.clientY, offsetX: 0, offsetY: 0 });
    };

    const handleOverlayPointerMove = (e) => {
        if (!diceGrab.active) return;
        setDiceGrab(prev => ({ ...prev, offsetX: e.clientX - prev.startX, offsetY: e.clientY - prev.startY }));
    };

    const handleOverlayPointerUp = () => {
        if (!diceGrab.active) return;
        const dist = Math.sqrt(diceGrab.offsetX**2 + diceGrab.offsetY**2);
        if (dist > 30) {
            triggerRoll(diceGrab.offsetY, diceGrab.offsetX);
        }
        setDiceGrab({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 }); 
    };

    const applySpecialTile = (playerIdx, dataRef) => {
        let p = dataRef.players[playerIdx];
        let requiresTargeting = false;
        let resolving = true;

        while (resolving && p.position < 100) {
            let tile = dataRef.boardSpecials ? dataRef.boardSpecials[p.position] : null;

            if (!tile) { resolving = false; break; }

            if (tile.type === 'snake') {
                if (p.class === 'knight' && !p.usedKnightSnake) {
                    dataRef.logs.push(`🛡️ ${p.name} (Knight) passively resisted the Snake!`);
                    p.usedKnightSnake = true; resolving = false;
                } else if (p.hasShield) {
                    dataRef.logs.push(`🛡️ ${p.name} blocked the Snake with a Magic Shield!`);
                    p.hasShield = false; resolving = false;
                } else {
                    dataRef.logs.push(`🐍 Oh no! ${p.name} slid down a Snake to ${tile.to}.`);
                    p.position = tile.to;
                }
            } else if (tile.type === 'ladder') {
                dataRef.logs.push(`🪜 Nice! ${p.name} climbed a Ladder to ${tile.to}.`);
                p.position = tile.to;
            } else if (tile.type === 'curse') {
                if (p.class === 'knight' && !p.usedKnightCurse) {
                    dataRef.logs.push(`🛡️ ${p.name} (Knight) passively resisted the Curse!`);
                    p.usedKnightCurse = true;
                } else if (p.hasShield) {
                    dataRef.logs.push(`🛡️ ${p.name} blocked the Curse with a Magic Shield!`);
                    p.hasShield = false;
                } else {
                    p.diceModifier = { val: -1, rollsLeft: 2 };
                    let lostCardMsg = "";
                    if (p.cards.length > 0) {
                        const dropped = p.cards.splice(Math.floor(Math.random() * p.cards.length), 1)[0];
                        const droppedName = CARDS[dropped]?.name || MAGE_CARDS[dropped]?.name;
                        lostCardMsg = ` and lost their ${droppedName} card`;
                    }
                    dataRef.logs.push(`💀 ${p.name} was cursed! -1 to next 2 rolls${lostCardMsg}.`);
                }
                resolving = false;
            } else if (tile.type === 'bless') {
                if (p.class === 'warlock') {
                    dataRef.logs.push(`🔮 ${p.name} (Warlock) corrupted a Blessing! Preparing to curse...`);
                    requiresTargeting = true;
                    dataRef.targetingAction = { type: 'warlock_bless', sourceIdx: playerIdx };
                } else {
                    const buffVal = p.class === 'knight' ? 2 : 1;
                    p.diceModifier = { val: buffVal, rollsLeft: 2 };
                    dataRef.logs.push(`✨ ${p.name} was blessed! +${buffVal} to next 2 rolls.`);
                }
                resolving = false;
            } else if (tile.type === 'card') {
                let cardsToDraw = tile.val;
                if (p.class === 'alchemist') { cardsToDraw += 1; dataRef.logs.push(`🧪 ${p.name} (Alchemist) brewed an extra card!`); }
                dataRef.logs.push(`🃏 ${p.name} found ${cardsToDraw} Spell Card(s)!`);
                for(let i=0; i<cardsToDraw; i++) p.cards.push(getRandomCard(p.class));
                resolving = false;
            }
        }

        if (p.position >= 100) {
            p.position = 100; dataRef.status = 'finished'; dataRef.winner = p.name;
            dataRef.logs.push(`🏆 ${p.name} REACHED 100 AND WON!`);
        }
        return { newData: dataRef, requiresTargeting };
    };

    const finalizeTurnProgression = async (resolvedData, requiresTargeting, roomRef) => {
        if (requiresTargeting) {
            if (resolvedData.players.length === 1) {
                resolvedData.logs.push(`💀 ${resolvedData.players[myPlayerIndex].name} has no one to curse! Blessing wasted.`);
                resolvedData.status = 'playing';
                resolvedData.turnIndex = (resolvedData.turnIndex + 1) % resolvedData.players.length;
            } else {
                resolvedData.status = 'targeting';
            }
        } else if (resolvedData.status !== 'finished') {
            resolvedData.status = 'playing';
            resolvedData.turnIndex = (resolvedData.turnIndex + 1) % resolvedData.players.length;
        }
        
        resolvedData.logs = resolvedData.logs.slice(-10);
        await updateDoc(roomRef, resolvedData);
    };

    const startGame = async () => {
        let roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
        let freshPlayers = roomData.players.map(p => {
            let initialCards = [];
            if (p.class === 'mage') { initialCards.push(getRandomMageCard()); }
            return { ...p, cards: initialCards, position: 1, hasShield: false, usedKnightCurse: false, usedKnightSnake: false, diceModifier: null };
        });
        await updateDoc(roomRef, { status: 'playing', players: freshPlayers, turnIndex: 0, winner: null, logs: ["The game begins!"] });
    };

    const triggerRoll = async (offsetY, offsetX) => {
        if (!isMyTurn || roomData.status === 'rolling' || roomData.status === 'targeting') return;
        
        const launchVelY = Math.max(-75, Math.min(-25, -Math.abs(offsetY) * 0.4));
        const launchVelX = offsetX ? Math.max(-25, Math.min(25, -offsetX * 0.15)) : (Math.random() - 0.5) * 15;
        
        let pos = { x: offsetX ? offsetX * 0.2 : 0, y: offsetY ? offsetY * 0.2 : 0, z: 0 };
        let vel = { x: launchVelX, y: launchVelY, z: 0 };
        let rot = { x: Math.random() * 360, y: Math.random() * 360, z: Math.random() * 360 };
        let rotVel = { 
            x: (Math.random() - 0.5) * 50 + 25 * Math.sign(Math.random() - 0.5), 
            y: (Math.random() - 0.5) * 50 + 25 * Math.sign(Math.random() - 0.5), 
            z: (Math.random() - 0.5) * 30 
        };
        
        const physicsSeed = { pos: {...pos}, vel: {...vel}, rot: {...rot}, rotVel: {...rotVel} };

        const floorY = 160; const ceilingY = -300; const gravity = 1.2; const bounce = -0.6;
        let simPos = {...pos}, simVel = {...vel}, simRot = {...rot};
        let loops = 0;
        
        while(loops < 600) {
            loops++;
            simVel.y += gravity; simPos.x += simVel.x; simPos.y += simVel.y;
            simRot.x += rotVel.x; simRot.y += rotVel.y; simRot.z += rotVel.z;
            const wallX = 130; 

            if (simPos.x > wallX) { simPos.x = wallX; simVel.x *= bounce; rotVel.y *= 0.8; rotVel.z *= 0.8; } 
            else if (simPos.x < -wallX) { simPos.x = -wallX; simVel.x *= bounce; rotVel.y *= 0.8; rotVel.z *= 0.8; }
            if (simPos.y < ceilingY) { simPos.y = ceilingY; simVel.y *= bounce; }
            if (simPos.y > floorY) {
                simPos.y = floorY; simVel.y *= bounce; simVel.x *= 0.85;
                rotVel.x *= 0.75; rotVel.y *= 0.75; rotVel.z *= 0.75;
                if (Math.abs(simVel.y) < 4 && Math.abs(simPos.y - floorY) < 5) break;
            }
        }

        const baseRoll = findFace(simRot.x, simRot.y, simRot.z);

        let p = roomData.players[myPlayerIndex];
        let actualRoll = baseRoll;
        
        if (p.class === 'berserker' && actualRoll === 1) actualRoll = 2; 
        if (p.class === 'rogue') actualRoll += 1;
        if (p.diceModifier && p.diceModifier.rollsLeft > 0) actualRoll += p.diceModifier.val;
        
        actualRoll = Math.max(1, actualRoll);

        let roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
        await updateDoc(roomRef, { 
            status: 'rolling', diceBase: baseRoll, diceActual: actualRoll, physicsSeed: physicsSeed 
        });
    };

    const activePlayer = roomData.players[roomData.turnIndex];
    const expectedTarget = Math.min(100, (activePlayer?.position || 1) + (roomData.diceActual || 0));

    const handlePointerDown = (e, playerIdx) => {
        if (roomData.status !== 'waiting_for_move' || playerIdx !== myPlayerIndex) return;
        e.target.setPointerCapture(e.pointerId);
        setDragState({ isDragging: true, clientX: e.clientX, clientY: e.clientY });
    };

    const handlePointerMove = (e) => {
        if (!dragState.isDragging) return;
        setDragState({ isDragging: true, clientX: e.clientX, clientY: e.clientY });
    };

    const handlePointerUp = async (e) => {
        if (!dragState.isDragging) return;
        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
        setDragState({ isDragging: false, clientX: 0, clientY: 0 });

        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const cell = elements.find(el => el?.hasAttribute?.('data-cell'));
        const cellId = cell?.getAttribute('data-cell');

        if (cellId && parseInt(cellId) === expectedTarget) {
            const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
            const snap = await getDoc(roomRef);
            if (!snap.exists()) return;

            let freshData = snap.data();
            let p = freshData.players[myPlayerIndex];
            
            let rollLog = `🎲 ${p.name} rolled a ${roomData.diceBase}`;
            if (p.class === 'berserker' && roomData.diceBase === 1) rollLog = `🎲 ${p.name} threw a 1, but Berserkers force a 2`;
            if (p.class === 'rogue') rollLog += ' + 1 (Rogue)';
            if (p.diceModifier && p.diceModifier.rollsLeft > 0) rollLog += ` ${p.diceModifier.val > 0 ? '+' : '-'} ${Math.abs(p.diceModifier.val)} (Buff/Debuff)`;
            rollLog += ` = ${roomData.diceActual}!`;
            
            freshData.logs.push(rollLog);

            if (p.diceModifier && p.diceModifier.rollsLeft > 0) {
                p.diceModifier.rollsLeft -= 1;
                if(p.diceModifier.rollsLeft <= 0) p.diceModifier = null;
            }

            p.position = expectedTarget;
            freshData.status = 'evaluating_tile';
            freshData.logs = freshData.logs.slice(-10);
            await updateDoc(roomRef, freshData);

            setTimeout(async () => {
                const snap2 = await getDoc(roomRef);
                if (!snap2.exists()) return;
                let data2 = snap2.data();
                
                let { newData: resolvedData, requiresTargeting } = applySpecialTile(myPlayerIndex, data2);
                await finalizeTurnProgression(resolvedData, requiresTargeting, roomRef);
            }, 1200);
        } else {
            showToast(`Drag your piece to space ${expectedTarget}!`);
        }
    };

    const playCard = async (cardId) => {
        if (!isMyTurn) return;
        let roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
        let newData = JSON.parse(JSON.stringify(roomData));
        let p = newData.players[myPlayerIndex];
        
        const cIdx = p.cards.indexOf(cardId);
        if (cIdx > -1) p.cards.splice(cIdx, 1);

        const cardDetails = CARDS[cardId] || MAGE_CARDS[cardId];
        newData.logs.push(`🔥 ${p.name} played ${cardDetails.name}!`);

        if (cardId === 'sprint' || cardId === 'teleport' || cardId === 'levitate') {
            const moveVal = cardId === 'sprint' ? 3 : (cardId === 'teleport' ? 5 : 7);
            p.position = Math.min(100, p.position + moveVal);
            newData.status = 'evaluating_tile';
            newData.logs = newData.logs.slice(-10);
            await updateDoc(roomRef, newData);
            
            setTimeout(async () => {
                const snap2 = await getDoc(roomRef);
                if (!snap2.exists()) return;
                let data2 = snap2.data();
                
                let { newData: resolvedData, requiresTargeting } = applySpecialTile(myPlayerIndex, data2);
                await finalizeTurnProgression(resolvedData, requiresTargeting, roomRef);
            }, 1200);
            return;
        } 
        
        if (cardId === 'sabotage' || cardId === 'meteor' || cardId === 'gust') {
            const pushBack = cardId === 'sabotage' ? 2 : (cardId === 'meteor' ? 4 : 1);
            newData.players.forEach((opp, i) => {
                if (i !== myPlayerIndex) {
                    opp.position = Math.max(1, opp.position - pushBack);
                    if (opp.class === 'berserker') {
                        opp.diceModifier = { val: 2, rollsLeft: 1 };
                        newData.logs.push(`🔥 ${opp.name} (Berserker) enraged by spell! +2 to next roll.`);
                    }
                }
            });
            if (cardId === 'gust') newData.logs.push(`💨 A wind gust pushed all opponents back 1 space!`);
            if (cardId === 'meteor') newData.logs.push(`☄️ A massive meteor struck! Opponents pushed back 4 spaces!`);
        } else if (cardId === 'shield') {
            p.hasShield = true;
        } else if (cardId === 'swap') {
            let opps = newData.players.map((opp, i) => ({opp, i})).filter(x => x.i !== myPlayerIndex);
            if(opps.length > 0) {
                let randomOpp = opps[Math.floor(Math.random() * opps.length)];
                let tempPos = p.position;
                p.position = randomOpp.o.position;
                randomOpp.o.position = tempPos;
                newData.logs.push(`🌀 ${p.name} swapped places with ${randomOpp.o.name}!`);
                if (randomOpp.o.class === 'berserker') {
                    randomOpp.o.diceModifier = { val: 2, rollsLeft: 1 };
                    newData.logs.push(`🔥 ${randomOpp.o.name} (Berserker) enraged by swap! +2 to next roll.`);
                }
            }
        } else if (cardId === 'thief') {
            let oppsWithCards = newData.players.map((opp, i) => ({opp, i})).filter(x => x.i !== myPlayerIndex && x.opp.cards.length > 0);
            if(oppsWithCards.length > 0) {
                let randomOpp = oppsWithCards[Math.floor(Math.random() * oppsWithCards.length)];
                let stolen = randomOpp.opp.cards.splice(Math.floor(Math.random() * randomOpp.opp.cards.length), 1)[0];
                p.cards.push(stolen);
                const stolenName = CARDS[stolen]?.name || MAGE_CARDS[stolen]?.name;
                newData.logs.push(`🦹 ${p.name} stole ${stolenName} from ${randomOpp.opp.name}!`);
                if (randomOpp.opp.class === 'berserker') {
                    randomOpp.opp.diceModifier = { val: 2, rollsLeft: 1 };
                    newData.logs.push(`🔥 ${randomOpp.opp.name} (Berserker) enraged by thief! +2 to next roll.`);
                }
            } else {
                 newData.logs.push(`🦹 ${p.name} tried to steal, but nobody had any cards!`);
            }
        } else if (cardId === 'timewarp') {
            p.diceModifier = { val: 3, rollsLeft: 2 };
            newData.logs.push(`⏳ ${p.name} warped time! +3 to next 2 rolls.`);
        }

        await finalizeTurnProgression(newData, false, roomRef);
    };

    const submitTarget = async (targetIdx) => {
        let roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'snakes_rooms', roomId);
        let newData = JSON.parse(JSON.stringify(roomData));
        const action = newData.targetingAction;
        const target = newData.players[targetIdx];
        const source = newData.players[action.sourceIdx];
        
        if (target.hasShield) {
            newData.logs.push(`🛡️ ${target.name} blocked the Warlock's curse with a Shield!`);
            target.hasShield = false;
        } else {
            target.diceModifier = { val: -2, rollsLeft: 2 };
            let lostCardMsg = "";
            if (target.cards.length > 0) {
                const dropped = target.cards.splice(Math.floor(Math.random() * target.cards.length), 1)[0];
                const droppedName = CARDS[dropped]?.name || MAGE_CARDS[dropped]?.name;
                lostCardMsg = ` and lost their ${droppedName} card`;
            }
            newData.logs.push(`💀 ${source.name} severely cursed ${target.name}! -2 to their next 2 rolls${lostCardMsg}.`);
        }
        
        newData.status = 'playing';
        newData.targetingAction = null;
        newData.turnIndex = (newData.turnIndex + 1) % newData.players.length;
        
        await updateDoc(roomRef, newData);
    };

    const renderCell = (num) => {
        const special = roomData.boardSpecials ? roomData.boardSpecials[num] : null;
        
        let i = num - 1; let row = 9 - Math.floor(i / 10); let col = i % 10;
        let isDark = (row % 2 === 0) ? (col % 2 === 0) : (col % 2 !== 0);
        
        let bg = isDark ? 'bg-slate-800/80' : 'bg-slate-700/80';
        let specialIcon = null;
        let borderClasses = 'border border-slate-700/30';
        
        if (special) {
            if (special.type === 'snake') { bg = 'bg-slate-900/90'; borderClasses = 'border border-red-500/30'; specialIcon = '🐍'; }
            if (special.type === 'ladder') { bg = 'bg-slate-900/90'; borderClasses = 'border border-green-500/30'; specialIcon = '🪜'; }
            if (special.type === 'curse') { bg = 'bg-purple-900/90 special-curse ring-2 ring-purple-500 z-10'; borderClasses = 'border-none'; specialIcon = '💀'; }
            if (special.type === 'bless') { bg = 'bg-amber-900/90 special-bless ring-2 ring-amber-500 z-10'; borderClasses = 'border-none'; specialIcon = '✨'; }
            if (special.type === 'card') { bg = 'bg-blue-900/90 special-card ring-2 ring-blue-500 z-10'; borderClasses = 'border-none'; specialIcon = '🃏'; }
        }

        return (
            <div key={num} data-cell={num} className={`relative flex flex-col items-center justify-center ${bg} overflow-hidden shadow-inner ${borderClasses} transition-all ${roomData.status === 'waiting_for_move' && num === expectedTarget ? 'ring-4 ring-emerald-400 bg-emerald-900/50 z-20 animate-pulse' : ''}`}>
                {specialIcon && <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl opacity-30 pointer-events-none drop-shadow-2xl grayscale-0 transform scale-110">{specialIcon}</div>}
                <span className={`absolute top-1 left-1.5 text-[10px] sm:text-xs font-black z-10 drop-shadow-md ${special ? 'text-white' : 'text-slate-500'}`}>{num}</span>
                
                {special && <div className="absolute bottom-1 w-full text-center text-[9px] sm:text-[11px] font-black opacity-90 pointer-events-none z-10 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-tight">
                    {special.type === 'snake' || special.type === 'ladder' ? `To ${special.to}` : 
                     special.type === 'curse' ? `-1 Roll & Discard` :
                     special.type === 'bless' ? `+1 to Rolls` : `+${special.val} Card`}
                </div>}
            </div>
        );
    };

    const PlayerTokensOverlay = () => (
        <div className="absolute inset-0 pointer-events-none z-30">
            {roomData.players.map((p, idx) => {
                let i = p.position - 1; let row = 9 - Math.floor(i / 10); let col = i % 10;
                if ((9 - row) % 2 !== 0) col = 9 - col;

                const offsetXPx = [0, -8, 8, -8, 8, 0, 0][idx] || 0;
                const offsetYPx = [0, -8, -8, 8, 8, 12, -12][idx] || 0;

                const isMe = idx === myPlayerIndex;
                const isMyTurnActive = roomData.turnIndex === idx;
                const isDraggable = roomData.status === 'waiting_for_move' && isMe && isMyTurnActive;
                const isDraggingThis = isDraggable && dragState.isDragging;

                let style = { 
                    backgroundColor: p.color, touchAction: 'none',
                    top: `calc(${row * 10}% + 5% + ${offsetYPx}px)`, left: `calc(${col * 10}% + 5% + ${offsetXPx}px)`,
                    transform: 'translate(-50%, -50%)', transition: 'top 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'
                };

                if (isDraggingThis) {
                    style = { ...style, position: 'fixed', left: dragState.clientX + 'px', top: dragState.clientY + 'px', transform: 'translate(-50%, -50%) scale(1.5)', transition: 'none', zIndex: 9999, pointerEvents: 'none' };
                }

                return (
                    <div key={p.id} 
                         className={`absolute w-5 h-5 sm:w-7 sm:h-7 rounded-full shadow-[0_5px_10px_rgba(0,0,0,0.9)] flex items-center justify-center text-[11px] sm:text-sm text-white font-black border-2 border-white/50 z-40 pointer-events-auto ${isDraggable && !isDraggingThis ? 'cursor-grab animate-bounce ring-4 ring-white' : ''} ${isDraggingThis ? 'cursor-grabbing' : ''}`}
                         style={style}
                         onPointerDown={isDraggable ? (e) => handlePointerDown(e, idx) : undefined}
                         >
                        {p.emoji || p.name.charAt(0).toUpperCase()}
                        {p.hasShield && <div className="absolute -top-1.5 -right-1.5 bg-blue-500 rounded-full p-[1px] shadow-lg"><Shield size={10} className="text-white"/></div>}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-indigo-500/30 select-none">
            {toast && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 px-5 py-2 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)] z-50 text-sm font-bold animate-pulse border border-indigo-400">{toast}</div>}
            
            {dragState.isDragging && (
                <div className="fixed inset-0 z-[9998] cursor-grabbing touch-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} />
            )}

            <header className="bg-slate-900 border-b border-slate-800 p-2 sm:p-3 flex justify-between items-center shrink-0 z-20 shadow-md">
                <div className="flex items-center gap-2">
                    <Swords className="text-indigo-400 w-5 h-5 sm:w-6 sm:h-6" />
                    <h1 className="text-lg sm:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400 hidden sm:block">Snakes & Sorcery</h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-1 sm:p-2 bg-slate-800 rounded border border-slate-700 transition-colors hidden sm:block">
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                    <div className="flex items-center bg-slate-800/80 rounded-lg px-2 py-1 sm:px-3 border border-slate-700 shadow-inner">
                        <span className="text-xs sm:text-sm text-slate-400 mr-2">Room:</span>
                        <span className="font-mono font-bold tracking-widest text-sm sm:text-base text-indigo-300">{roomId}</span>
                        <button onClick={() => { navigator.clipboard.writeText(roomId); showToast("Copied!"); }} className="ml-2 text-slate-400 hover:text-white p-1 transition-colors">
                            <Copy size={14} />
                        </button>
                    </div>
                    <button onClick={() => setRoomId(null)} className="text-slate-400 hover:text-red-400 p-1 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {roomData.status === 'waiting' ? (
                <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 to-indigo-950/20">
                    <div className="max-w-md w-full bg-slate-800/90 backdrop-blur p-6 sm:p-8 rounded-2xl border border-indigo-500/30 shadow-2xl text-center">
                        <h2 className="text-2xl font-bold mb-2">Lobby Waiting Room</h2>
                        <p className="text-slate-400 mb-6 text-sm">Share code <strong className="text-white bg-slate-900 px-2 py-1 rounded font-mono mx-1 shadow-inner border border-slate-700">{roomId}</strong> to invite friends.</p>
                        
                        <div className="space-y-3 mb-8">
                            {roomData.players.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700 shadow-sm">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white/10" style={{ backgroundColor: p.color }}>
                                        {p.emoji || p.name.charAt(0)}
                                    </div>
                                    <span className="font-semibold flex-1 text-left">{p.name} {p.id === user.uid && <span className="text-indigo-400 text-xs ml-1">(You)</span>}</span>
                                    <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-xs border border-slate-600 text-slate-300">
                                        {CLASSES[p.class] && React.createElement(CLASSES[p.class].icon, { size: 12 })}
                                        <span className="capitalize">{p.class}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {amIHost ? (
                            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:-translate-y-0.5">
                                Start Game
                            </button>
                        ) : (
                            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-400 italic text-sm animate-pulse">
                                Waiting for the host to start...
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col md:flex-row gap-4 overflow-hidden">
                    <div className="w-full md:w-2/3 h-[50vh] md:h-full flex items-center justify-center relative">
                        <div className="w-full max-h-full aspect-square bg-slate-900 rounded-2xl border-[6px] border-slate-800 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
                            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                                {getBoardCells().map(num => renderCell(num))}
                            </div>
                            <BoardOverlay specials={roomData.boardSpecials} />
                            <PlayerTokensOverlay />
                        </div>
                    </div>

                    <div className="w-full md:w-1/3 flex flex-col gap-3 md:gap-4 overflow-y-auto h-[40vh] md:h-full pb-2 hide-scrollbar">
                        <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-5 shadow-xl shrink-0 relative overflow-hidden flex flex-col items-center">
                            {isMyTurn && roomData.status === 'playing' && <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none"></div>}
                            
                            <div className="w-full flex items-center justify-between mb-4 z-10">
                                <div className="font-bold text-lg">
                                    {roomData.status === 'finished' ? <span className="text-yellow-400">Game Over!</span> :
                                     isMyTurn ? <span className="text-emerald-400 drop-shadow-md">It's your turn!</span> : 
                                     <span className="text-slate-400">{roomData.players[roomData.turnIndex]?.name}'s turn...</span>}
                                </div>
                            </div>

                            <div className="w-full z-10">
                                {roomData.status === 'finished' ? (
                                    <div className="text-center py-2">
                                        <h2 className="text-3xl font-black text-yellow-400 mb-4 animate-bounce drop-shadow-lg">🏆 {roomData.winner} WINS!</h2>
                                        {amIHost && <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold w-full shadow-lg">Play Again</button>}
                                    </div>
                                ) : roomData.status === 'targeting' ? (
                                    roomData.targetingAction?.sourceIdx === myPlayerIndex ? (
                                        <div className="p-4 bg-purple-900/80 border border-purple-400 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse">
                                            <h3 className="font-bold text-white mb-3 text-center text-sm">Choose opponent to curse:</h3>
                                            <div className="flex flex-col gap-2">
                                                {roomData.players.map((p, i) => i !== myPlayerIndex && (
                                                    <button key={i} onClick={() => submitTarget(i)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
                                                        Curse {p.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-purple-900/40 border border-purple-500/30 rounded-xl text-center text-purple-300 text-sm">
                                            <Skull className="mx-auto mb-2 opacity-50 animate-pulse" />
                                            Waiting for {roomData.players[roomData.targetingAction?.sourceIdx]?.name} to choose a victim...
                                        </div>
                                    )
                                ) : (
                                    <button onClick={() => setDiceWindowOpen(true)} disabled={!isMyTurn || roomData.status === 'rolling' || roomData.status === 'evaluating_tile' || roomData.status === 'waiting_for_move'}
                                        className={`w-full py-3 md:py-4 rounded-xl font-black text-lg md:text-xl flex items-center justify-center gap-2 shadow-lg transition-all 
                                            ${isMyTurn && roomData.status === 'playing' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white hover:scale-[1.02] active:scale-[0.98]' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'}`}>
                                        <Dice1 className={`${roomData.status === 'rolling' ? 'animate-spin' : ''}`} />
                                        {roomData.status === 'rolling' ? 'Rolling...' : roomData.status === 'waiting_for_move' ? (isMyTurn ? 'Drag your piece!' : 'Waiting for move...') : roomData.status === 'evaluating_tile' ? 'Moving...' : isMyTurn ? 'Open Dice Tray' : 'Wait...'}
                                    </button>
                                )}
                            </div>

                            {myPlayer?.cards.length > 0 && roomData.status === 'playing' && (
                                <div className="mt-4 w-full z-10">
                                    <div className="text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-wider flex items-center gap-1"><Sparkles size={12}/> Your Spell Cards</div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        {myPlayer.cards.map((cardId, idx) => {
                                            const card = CARDS[cardId] || MAGE_CARDS[cardId];
                                            return (
                                                <div key={idx} className="w-28 bg-gradient-to-b from-indigo-900 to-slate-900 border border-indigo-500/50 rounded-lg p-2 flex flex-col justify-between shrink-0 shadow-md">
                                                    <div>
                                                        <div className="font-bold text-indigo-100 text-xs">{card.name}</div>
                                                        <div className="text-[9px] text-indigo-300/80 mt-1 leading-tight">{card.desc}</div>
                                                    </div>
                                                    <button disabled={!isMyTurn} onClick={() => playCard(cardId)}
                                                        className="mt-2 w-full bg-indigo-500/80 hover:bg-indigo-400 text-white text-[10px] font-bold py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                        Play Card
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-4 shadow-xl flex-1 overflow-hidden flex flex-col min-h-[150px]">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-300 shrink-0 uppercase tracking-wider">
                                <UserPlus size={14} className="text-indigo-400" /> Live Standings
                            </h3>
                            <div className="space-y-2 overflow-y-auto flex-1 pr-1 hide-scrollbar">
                                {roomData.players.map((p, i) => {
                                    const active = roomData.turnIndex === i && roomData.status !== 'finished';
                                    return (
                                        <div key={i} className={`p-2.5 rounded-xl border text-sm flex items-center justify-between transition-all
                                            ${active ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-900/60 border-slate-700/50'}`}>
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-5 h-5 rounded-full shrink-0 shadow-inner border border-white/20 flex items-center justify-center text-[11px]" style={{ backgroundColor: p.color }}>
                                                    {p.emoji || ""}
                                                </div>
                                                <span className={`font-semibold truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                                                    {p.name}
                                                    {p.diceModifier?.rollsLeft > 0 && (
                                                        <span className={`text-[10px] ml-1.5 font-bold px-1.5 py-0.5 rounded-sm ${p.diceModifier.val > 0 ? 'bg-amber-900/50 text-amber-400 border border-amber-500/50' : 'bg-purple-900/50 text-purple-400 border border-purple-500/50'}`}>
                                                            {p.diceModifier.val > 0 ? '+' : ''}{p.diceModifier.val}
                                                        </span>
                                                    )}
                                                </span>
                                                {p.hasShield && <Shield size={12} className="text-blue-400 shrink-0 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                                <div className="text-[10px] flex items-center gap-1 text-indigo-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded-md border border-slate-800">
                                                    <Sparkles size={10} /> {p.cards.length}
                                                </div>
                                                <span className="font-mono font-black bg-slate-950 px-2 py-0.5 rounded-md border border-slate-700 text-emerald-400 w-10 text-center shadow-inner">
                                                    {p.position}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 h-32 md:h-40 shrink-0 overflow-y-auto hide-scrollbar flex flex-col justify-end shadow-inner relative">
                            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-950/80 to-transparent pointer-events-none"></div>
                            {roomData.logs.map((log, i) => (
                                <div key={i} className="text-[11px] sm:text-xs text-slate-400 border-b border-slate-800/50 py-1.5 last:border-0 last:text-white last:font-semibold break-words">
                                    {log}
                                </div>
                            ))}
                        </div>

                    </div>
                </main>
            )}

            <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 touch-none transition-opacity duration-300 overflow-hidden ${diceWindowOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                 onPointerMove={handleOverlayPointerMove} onPointerUp={handleOverlayPointerUp} onPointerCancel={handleOverlayPointerUp}>
                <div className="absolute inset-0 bg-slate-900 z-0">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(0deg, transparent 19px, #1e293b 20px), linear-gradient(90deg, transparent 39px, #1e293b 40px)', backgroundSize: '40px 20px' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/80"></div>
                </div>

                <div className="absolute top-1/2 left-[-1000px] right-[-1000px] h-[1000px] bg-gradient-to-b from-emerald-900 to-slate-950 border-t-[16px] border-amber-900 shadow-[inset_0_40px_100px_rgba(0,0,0,1)]" 
                     style={{ transform: 'perspective(1000px) rotateX(60deg)', transformOrigin: 'top', marginTop: '30px', zIndex: 1 }}>
                     <div className="w-full h-full opacity-40 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)]"></div>
                     <div className="absolute top-[-16px] left-0 right-0 h-[16px] bg-amber-800 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)' }}></div>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-indigo-400 absolute top-20 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] text-center w-full px-4 z-20 pointer-events-none flex flex-col items-center gap-4">
                    {roomData?.status === 'waiting_for_move' ? null : (<span>{roomData?.status === 'rolling' ? `${activePlayer?.name} is throwing...` : 'Grab & Pull the Dice to Throw!'}</span>)}
                    {roomData?.status !== 'rolling' && roomData?.status !== 'waiting_for_move' && isMyTurn && (
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); triggerRoll(-100, (Math.random() - 0.5) * 30); }} className={`bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-6 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-transform active:scale-95 border border-indigo-400 ${diceWindowOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                            Quick Throw ⚡
                        </button>
                    )}
                </div>

                <div className="relative perspective-1000 w-32 h-32 flex items-center justify-center z-20" style={{ transform: roomData?.status === 'rolling' || roomData?.status === 'waiting_for_move' ? 'none' : `translate3d(${diceGrab.offsetX}px, ${diceGrab.offsetY}px, 0)`, transition: diceGrab.active ? 'none' : 'transform 0.3s ease-out' }}>
                    <div ref={diceRef} className="preserve-3d w-full h-full absolute" style={{ transform: 'rotateX(-20deg) rotateY(-20deg)', cursor: (isMyTurn && roomData?.status === 'playing') ? (diceGrab.active ? 'grabbing' : 'grab') : 'default', pointerEvents: (diceWindowOpen && isMyTurn && roomData?.status === 'playing') ? 'auto' : 'none' }} onPointerDown={handleDicePointerDown}>
                        {[1, 2, 3, 4, 5, 6].map((face, i) => {
                            const transforms = ['rotateY(0deg)', 'rotateY(-90deg)', 'rotateY(180deg)', 'rotateY(90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
                            return (<div key={i} className="absolute w-full h-full bg-slate-800 border-4 border-indigo-500 shadow-[inset_0_0_30px_rgba(99,102,241,0.6)] rounded-2xl flex items-center justify-center text-6xl font-black text-white" style={{ transform: `${transforms[i]} translateZ(64px)` }}>{face}</div>);
                        })}
                    </div>
                </div>
                
                <div ref={shadowRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/80 blur-md rounded-[100%] z-[10] opacity-0 pointer-events-none transition-opacity duration-300" style={{ marginTop: '190px' }}></div>

                {roomData?.status === 'waiting_for_move' && (
                    <div className={`absolute inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] rounded-xl ${diceWindowOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                        <div className="bg-slate-900/95 border-2 border-indigo-500 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(99,102,241,0.4)] transition-all transform animate-in zoom-in duration-300 relative">
                            <button onClick={() => setDiceWindowOpen(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white bg-slate-800/80 p-1.5 rounded-full border border-slate-700 transition-colors z-40"><LogOut size={16} /></button>
                            <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">{activePlayer?.name}'s Final Roll</div>
                            <div className="text-7xl font-black text-white drop-shadow-lg">{roomData.diceActual}</div>
                            {roomData.diceBase !== roomData.diceActual && (
                                <div className="text-xs sm:text-sm font-bold text-amber-400 bg-amber-900/30 px-4 py-2 rounded-lg border border-amber-500/30 mt-3 shadow-inner">
                                    Physical Roll: {roomData.diceBase} <br className="sm:hidden" />
                                    <span className="hidden sm:inline"> | </span> 
                                    Modifiers: {roomData.diceActual > roomData.diceBase ? '+' : '-'}{Math.abs(roomData.diceActual - roomData.diceBase)}
                                </div>
                            )}
                            {isMyTurn ? (
                                <div className="mt-4 text-emerald-400 font-bold animate-pulse text-sm flex flex-col items-center">
                                    <span>👇 Drag your piece to space {expectedTarget}</span>
                                    <button onClick={() => setDiceWindowOpen(false)} className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-bold shadow-md transition-transform active:scale-95">Close & Move</button>
                                </div>
                            ) : (
                                <div className="mt-4 text-slate-400 font-bold text-sm animate-pulse">Closing automatically...</div>
                            )}
                        </div>
                    </div>
                )}

                {roomData?.status === 'playing' && isMyTurn && (
                    <div className="absolute bottom-20 animate-pulse text-slate-400 flex flex-col items-center pointer-events-none z-20">
                        <div className="w-1.5 h-20 bg-gradient-to-t from-transparent via-indigo-500 to-indigo-400 rounded-full mb-3"></div>
                        <span className="font-bold tracking-widest uppercase">Pull Down</span>
                    </div>
                )}
                
                {roomData?.status === 'playing' && isMyTurn && (
                    <button onClick={(e) => { e.stopPropagation(); setDiceWindowOpen(false); }} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800/80 p-3 rounded-full border border-slate-700 transition-colors z-30">
                        <LogOut size={24} />
                    </button>
                )}
            </div>
            
        </div>
    );
}