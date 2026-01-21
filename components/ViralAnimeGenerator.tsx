
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { generateImage, generateConsistentStoryScript } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const JsonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const animeSpinBox = [
    { label: "Ghibli Forest Kitchen", icon: "🍱", prompt: "Rainy Day in the Forest House: Cooking Okonomiyaki & Making Scented Candles | Ghibli-Style ASMR. Focus on hand-drawn textures, steaming food, raindrops on window, and warm indoor lighting." },
    { label: "Neo-Tokyo Night", icon: "🍜", prompt: "Cyberpunk Tokyo Night: Eating Ramen at a hidden street stall. Neon reflections in puddles, cinematic lighting, 2D anime high quality. Focus on the satisfying steam and slurping visuals." },
    { label: "Kyoto Tea Time", icon: "🍵", prompt: "Traditional Kyoto Tea Ceremony: Making Matcha in a wooden garden house. Autumn leaves falling, sliding paper doors, quiet peaceful atmosphere, high-detail anime style." },
    { label: "Wizard Library", icon: "📜", prompt: "Witch's Library ASMR: Sorting ancient scrolls and brewing blue potions. Glowing magic particles, floating books, dark fantasy anime aesthetic, detailed dust motes in light beams." },
    { label: "Cozy Bedroom Rain", icon: "💤", prompt: "Cozy Lofi Bedroom: Studying while it rains outside. Shinkai-style clouds, warm desk lamp, cat sleeping on bed, rhythmic pencil scratching sounds visual, emotional anime." },
    { label: "Seaside Bakery", icon: "🍞", prompt: "Mediterranean Seaside Bakery: Baking fresh bread at sunrise. Blue ocean view through window, golden bread crust, flour dusting, vibrant summer anime vibes." }
];

interface AnimeSense {
    id: number;
    title: string;
    description: string;
    prompt: string;
    voiceover: string;
    imageUrl?: string;
    isLoading: boolean;
}

const ViralAnimeGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(animeSpinBox[0].prompt);
    const [senseCount, setSenseCount] = useState(8);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [scenes, setScenes] = useState<AnimeSense[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [displaySpins, setDisplaySpins] = useState(animeSpinBox);

    const handleShufflePresets = () => {
        const shuffled = [...animeSpinBox].sort(() => Math.random() - 0.5);
        setDisplaySpins(shuffled);
    };

    const handleArchitect = async () => {
        if (!masterPrompt.trim()) {
            setError("Please enter a concept.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setScenes([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = 'gemini-3-flash-preview';

            const systemInstruction = `
                You are a Viral Anime Content Architect. 
                Generate exactly ${senseCount} Senses (scenes) for a high-quality 2D Anime style video.
                
                STRICT VISUAL STYLE: 2D Anime, Cel-shaded, Hand-drawn look. 
                STRICT THEME: ASMR, Satisfying, High Detail.
                
                For each sense, provide:
                - title: Catchy name for the sense.
                - description: Internal action description.
                - prompt: A highly detailed 2D Anime video generation prompt.
                - voiceover: A short narration (max 20 words).
                
                Maintain character and Ghibli/Shinkai-inspired style consistency throughout.
            `;

            const response = await ai.models.generateContent({
                model,
                contents: masterPrompt,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.INTEGER },
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                prompt: { type: Type.STRING },
                                voiceover: { type: Type.STRING }
                            },
                            required: ["id", "title", "description", "prompt", "voiceover"]
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "[]");
            setScenes(result.map((s: any) => ({ ...s, isLoading: false })));
        } catch (err) {
            setError("Architecting failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenderScene = async (index: number) => {
        const scene = scenes[index];
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true } : s));
        try {
            const finalPrompt = `2D Anime Style, hand-drawn look, high quality. ${scene.prompt}. No text in image.`;
            const url = await generateImage(finalPrompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoading: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: false } : s));
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleClear = () => {
        setMasterPrompt('');
        setScenes([]);
        setError(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left: Settings */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/90 p-6 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform rotate-3">
                                <span className="text-2xl">🎨</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 uppercase tracking-tighter leading-none">
                                    Style Anime X
                                </h2>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">High-End Anime Production</p>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="p-4 bg-black/40 rounded-2xl border border-gray-800 mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">Past Prompt Spins Box</label>
                                <button onClick={handleShufflePresets} className="p-1 hover:rotate-180 transition-transform duration-500 text-gray-600 hover:text-indigo-400"><RefreshIcon /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {displaySpins.map((opt) => (
                                    <button 
                                        key={opt.label}
                                        onClick={() => { setMasterPrompt(opt.prompt); setSenseCount(opt.count); }}
                                        className={`p-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border shadow-sm ${masterPrompt === opt.prompt ? 'bg-indigo-900/40 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-indigo-500 hover:text-gray-300'}`}
                                    >
                                        <span className="text-sm">{opt.icon}</span> 
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-[#0f172a] rounded-2xl border border-gray-800 shadow-inner">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Anime Production Concept</label>
                                <textarea 
                                    value={masterPrompt}
                                    onChange={(e) => setMasterPrompt(e.target.value)}
                                    placeholder="Enter your anime scene idea..."
                                    className="w-full bg-transparent border-none text-white h-32 resize-none text-xs focus:ring-0 outline-none placeholder-gray-800 leading-relaxed custom-scrollbar"
                                />
                            </div>

                            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={noVoiceover} 
                                        onChange={e => setNoVoiceover(e.target.checked)}
                                        className="w-5 h-5 appearance-none border border-gray-700 rounded bg-black checked:bg-indigo-600 transition-all cursor-pointer relative"
                                    />
                                    {noVoiceover && <span className="absolute ml-1.5 text-[10px] pointer-events-none">✓</span>}
                                    <span className="text-xs font-bold text-gray-300">No Voiceover | គ្មានសំឡេង</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 px-2">Number of Senses (1-50)</label>
                                <input 
                                    type="number" 
                                    min="1" max="50" 
                                    value={senseCount}
                                    onChange={e => setSenseCount(parseInt(e.target.value) || 1)}
                                    className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl p-4 text-white font-black text-center text-xl focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <button 
                                onClick={handleArchitect}
                                disabled={isLoading || !masterPrompt}
                                className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-3xl shadow-2xl transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                            >
                                {isLoading ? <Spinner className="h-6 w-6" /> : <span className="text-xl">🚀</span>} 
                                {isLoading ? 'Directing...' : 'Get Sense (Architect)'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Production Canvas */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-[700px]">
                    <div className="bg-[#111827]/90 p-8 rounded-[3rem] border border-gray-800 shadow-2xl flex flex-col h-full backdrop-blur-md">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Production Canvas</h3>
                            <div className="flex gap-2">
                                <button onClick={handleClear} className="p-2.5 bg-gray-900 rounded-xl text-gray-500 hover:text-red-500 transition border border-gray-700"><TrashIcon /></button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6">
                            {scenes.length > 0 ? (
                                scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-gray-800/20 rounded-[2rem] border border-gray-700/50 p-6 group hover:border-indigo-500/30 transition-all shadow-xl">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Visual Slot */}
                                            <div className="w-full md:w-64 aspect-video md:aspect-square bg-black rounded-2xl overflow-hidden relative border border-gray-700 shrink-0 flex items-center justify-center">
                                                {scene.imageUrl ? (
                                                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Anime Visual" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        {scene.isLoading ? (
                                                            <Spinner className="h-8 w-8 text-indigo-500 m-0" />
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleRenderScene(idx)}
                                                                className="flex flex-col items-center gap-2 text-gray-600 hover:text-indigo-400 transition"
                                                            >
                                                                <span className="text-2xl">🖼️</span>
                                                                <span className="text-[9px] font-black uppercase">Render Art</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase shadow-lg">PART {scene.id}</div>
                                            </div>

                                            {/* Data */}
                                            <div className="flex-grow flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between mb-3">
                                                        <h4 className="text-lg font-black text-white uppercase tracking-tight">{scene.title}</h4>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleCopy(scene.prompt, `p-${idx}`)}
                                                                className={`p-2 rounded-lg bg-gray-900 border border-gray-700 transition ${copyStatus === `p-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
                                                                title="Copy Image Prompt"
                                                            >
                                                                {copyStatus === `p-${idx}` ? '✓' : <CopyIcon />}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCopy(JSON.stringify(scene, null, 2), `j-${idx}`)}
                                                                className={`p-2 rounded-lg bg-gray-900 border border-gray-700 transition ${copyStatus === `j-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
                                                                title="Copy JSON Data"
                                                            >
                                                                {copyStatus === `j-${idx}` ? '✓' : <JsonIcon />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-300 text-xs italic leading-relaxed border-l-2 border-indigo-500 pl-3 py-1 mb-4">
                                                        "{scene.description}"
                                                    </p>
                                                </div>

                                                {!noVoiceover && (
                                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">Narration:</span>
                                                        <p className="text-gray-400 text-xs font-serif italic">{scene.voiceover}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 select-none">
                                    <span className="text-9xl mb-4">🎬</span>
                                    <p className="text-2xl font-black uppercase tracking-[0.5em]">Waiting for Directives</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-950 border border-red-500 text-red-200 rounded-2xl shadow-2xl z-[100] animate-shake">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ViralAnimeGenerator;
