
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { generateImage } from '../services/geminiService.ts';
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

const forestPresets = [
    { label: "Life Saver Build", icon: "👵", prompt: "Building a House in the Forest (ASMR) – A Kind Man saves an old woman's life by building her a modern home. Emotional storytelling, 100% Realistic, cinematic forest atmosphere, satisfying construction steps." },
    { label: "Abandoned Restoration", icon: "🪵", prompt: "Forest Restoration ASMR: Transforming an abandoned, broken wooden hut into a luxury forest villa. Focus on wood cleaning, fresh painting, and modern interior integration. 100% Realistic 8k." },
    { label: "Bamboo Architecture", icon: "🎋", prompt: "Sustainable Bamboo Build: Constructing a professional geometric bamboo house in a tropical forest. Intricate rope tying, cutting bamboo, satisfying textures, high-fidelity nature cinematography." },
    { label: "Winter Forest Shelter", icon: "❄️", prompt: "Winter Survival Build: Constructing a warm, cozy cabin during a blizzard. Focus on the contrast between the cold snow outside and the warm fire and wood inside. Realistic ASMR photography." }
];

interface ForestScene {
    id: number;
    title: string;
    description: string;
    prompt: string;
    asmrSounds: string;
    imageUrl?: string;
    isLoading: boolean;
}

const ForestHouseASMRGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(forestPresets[0].prompt);
    const [senseCount, setSenseCount] = useState(12);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [scenes, setScenes] = useState<ForestScene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [displaySpins, setDisplaySpins] = useState(forestPresets);

    const handleShufflePresets = () => {
        const shuffled = [...forestPresets].sort(() => Math.random() - 0.5);
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
                You are a Forest Build Content Architect. 
                Generate exactly ${senseCount} Senses (scenes) for a viral ASMR construction video.
                
                STRICT VISUAL STYLE: 100% Realistic, Professional Cinematic Nature Photography, 8K detail.
                THEME: Survival, Kindness, Satisfaction, Transformation.
                
                For each sense, provide:
                - title: Short title of the construction phase.
                - description: The narrative action (what is being built/fixed).
                - prompt: A highly detailed 100% Realistic video generation prompt for high-end AI models.
                - asmrSounds: A description of the satisfying environmental sounds for this scene.
                
                Maintain building and character consistency throughout all ${senseCount} scenes.
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
                                asmrSounds: { type: Type.STRING }
                            },
                            required: ["id", "title", "description", "prompt", "asmrSounds"]
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "[]");
            setScenes(result.map((s: any) => ({ ...s, isLoading: false })));
        } catch (err) {
            setError("Architecting failed. Check your API key.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenderScene = async (index: number) => {
        const scene = scenes[index];
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true } : s));
        try {
            const finalPrompt = `100% Realistic photorealistic cinematic forest photography, high-end construction detail, 8k. Action: ${scene.prompt}. No text in image. Natural sunlight.`;
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
                
                {/* Left Panel: Settings */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/90 p-6 rounded-[2.5rem] border border-green-500/20 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-800 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 transform rotate-2">
                                <span className="text-2xl">🌲</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 uppercase tracking-tighter leading-none">
                                    Forest Build X
                                </h2>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">ASMR Production Studio</p>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="p-4 bg-black/40 rounded-2xl border border-gray-800 mb-6 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-[10px] font-black text-green-500 uppercase tracking-widest">Past Prompt Spins Box</label>
                                <button onClick={handleShufflePresets} className="p-1 hover:rotate-180 transition-transform duration-500 text-gray-600 hover:text-green-500"><RefreshIcon /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {displaySpins.map((opt) => (
                                    <button 
                                        key={opt.label}
                                        onClick={() => { setMasterPrompt(opt.prompt); }}
                                        className={`p-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border shadow-sm ${masterPrompt === opt.prompt ? 'bg-green-900/40 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-green-500 hover:text-gray-300'}`}
                                    >
                                        <span className="text-sm">{opt.icon}</span> 
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-[#0f172a] rounded-2xl border border-gray-800 shadow-inner">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Build Concept & Story</label>
                                <textarea 
                                    value={masterPrompt}
                                    onChange={(e) => setMasterPrompt(e.target.value)}
                                    placeholder="Enter your build mission and narrative..."
                                    className="w-full bg-transparent border-none text-white h-32 resize-none text-xs focus:ring-0 outline-none placeholder-gray-800 leading-relaxed custom-scrollbar font-medium"
                                />
                            </div>

                            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={noVoiceover} 
                                            onChange={e => setNoVoiceover(e.target.checked)}
                                            className="w-5 h-5 appearance-none border border-gray-700 rounded bg-black checked:bg-green-600 transition-all cursor-pointer relative"
                                        />
                                        {noVoiceover && <span className="absolute top-0.5 left-1 text-[10px] pointer-events-none">✓</span>}
                                    </div>
                                    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition">No Voiceover (ASMR Only)</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 px-2">Number of Senses (1-100)</label>
                                <input 
                                    type="number" 
                                    min="1" max="100" 
                                    value={senseCount}
                                    onChange={e => setSenseCount(parseInt(e.target.value) || 1)}
                                    className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl p-4 text-white font-black text-center text-xl focus:ring-1 focus:ring-green-500 transition-shadow shadow-inner"
                                />
                            </div>

                            <button 
                                onClick={handleArchitect}
                                disabled={isLoading || !masterPrompt}
                                className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-black rounded-3xl shadow-2xl transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm border-t border-white/10"
                            >
                                {isLoading ? <Spinner className="h-6 w-6" /> : <span className="text-xl">🛠️</span>} 
                                {isLoading ? 'Drafting...' : 'Get Sense (Architect)'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Production Canvas */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-[700px]">
                    <div className="bg-[#111827]/90 p-8 rounded-[3rem] border border-gray-800 shadow-2xl flex flex-col h-full backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Forest Build Storyboard</h3>
                                {scenes.length > 0 && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{scenes.length} Senses Architected</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleClear} className="p-2.5 bg-gray-900 rounded-xl text-gray-500 hover:text-red-500 transition border border-gray-700 shadow-lg"><TrashIcon /></button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6 relative z-10 pb-20">
                            {scenes.length > 0 ? (
                                scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-gray-800/20 rounded-[2.5rem] border border-gray-700/50 p-6 group hover:border-green-500/30 transition-all shadow-xl">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Visual Slot */}
                                            <div className="w-full md:w-64 aspect-video md:aspect-square bg-black rounded-[1.5rem] overflow-hidden relative border border-gray-700 shrink-0 flex items-center justify-center shadow-inner">
                                                {scene.imageUrl ? (
                                                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Prehistoric Visual" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        {scene.isLoading ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Spinner className="h-10 w-10 text-green-500 m-0" />
                                                                <span className="text-[9px] font-black text-green-400 uppercase animate-pulse">Rendering Art...</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleRenderScene(idx)}
                                                                className="flex flex-col items-center gap-2 text-gray-600 hover:text-green-400 transition transform hover:scale-110"
                                                            >
                                                                <span className="text-3xl">🖼️</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Render Art</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-green-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg">SENSE {scene.id}</div>
                                            </div>

                                            {/* Logic & Text */}
                                            <div className="flex-grow flex flex-col justify-between py-2">
                                                <div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{scene.title}</h4>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleCopy(scene.prompt, `p-${idx}`)}
                                                                className={`p-2.5 rounded-xl bg-gray-900 border border-gray-700 transition shadow-md ${copyStatus === `p-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
                                                                title="Copy Production Prompt"
                                                            >
                                                                {copyStatus === `p-${idx}` ? '✓' : <CopyIcon />}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCopy(JSON.stringify({ prompt: scene.prompt }, null, 2), `j-${idx}`)}
                                                                className={`p-2.5 rounded-xl bg-gray-900 border border-gray-700 transition shadow-md ${copyStatus === `j-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
                                                                title="Copy JSON Code"
                                                            >
                                                                {copyStatus === `j-${idx}` ? '✓' : <JsonIcon />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-300 text-xs italic leading-relaxed border-l-2 border-green-500 pl-3 py-1 mb-4">
                                                        "{scene.description}"
                                                    </p>
                                                </div>

                                                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-start gap-3 shadow-inner">
                                                    <div className="text-xs mt-0.5">🔊</div>
                                                    <div className="flex-grow">
                                                        <span className="text-[8px] font-black text-gray-500 uppercase block mb-1">ASMR Soundscape:</span>
                                                        <p className="text-gray-400 text-[10px] italic leading-relaxed">{scene.asmrSounds}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 select-none">
                                    <span className="text-9xl mb-4">🪵</span>
                                    <p className="text-2xl font-black uppercase tracking-[0.6em]">Waiting for Data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-950 border border-red-500 text-red-100 rounded-2xl shadow-2xl z-[100] animate-shake flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
                </div>
            )}
        </div>
    );
};

export default ForestHouseASMRGenerator;
