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
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const JsonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

// COMMENT: Added missing ClearProjectButton component definition to fix the "Cannot find name 'ClearProjectButton'" error.
const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const apachePresets = [
    { label: "Jungle Discovery", icon: "🚁", prompt: "Abandoned in the Jungle for Decades: A moss-covered, rusty Apache helicopter found deep in a tropical rainforest. Vines growing through the cockpit, faded military paint, 100% realistic cinematic lighting, National Geographic style." },
    { label: "Pressure Wash ASMR", icon: "💦", prompt: "Satisfying High-Pressure Wash: Cleaning decades of mud and grime off an Apache helicopter. Foam sliding down the metal fuselage, high-detail water spray, 8k realistic textures." },
    { label: "Engine Overhaul", icon: "⚙️", prompt: "Apache Engine Restoration: A team of mechanics disassembling and polishing a massive helicopter turbine engine. Greasy gears vs shiny new parts, professional workshop setting, high fidelity." },
    { label: "Camo Paint Job", icon: "🎨", prompt: "Military Paint Restoration: Applying a fresh, high-gloss desert camouflage paint to the Apache helicopter. Precise spray painting, masking tape removal, brand-new factory finish look." },
    { label: "The Final Flight", icon: "🌤️", prompt: "Fully Restored Apache Taking Off: The helicopter, now 100% brand new and shiny, taking its first flight over a mountain range. Dust blowing from the rotors, cinematic sunset, epic scale." }
];

interface ApacheScene {
    id: number;
    title: string;
    description: string;
    prompt: string;
    voiceover: string;
    imageUrl?: string;
    isLoading: boolean;
}

const ApacheRestorationGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(apachePresets[0].prompt);
    const [senseCount, setSenseCount] = useState(12);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [scenes, setScenes] = useState<ApacheScene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [displaySpins, setDisplaySpins] = useState(apachePresets);

    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const handleShufflePresets = () => {
        const shuffled = [...apachePresets].sort(() => Math.random() - 0.5);
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
                You are a Viral Content Architect specializing in High-Detail Mechanical Restoration. 
                Generate exactly ${senseCount} Senses (scenes) for a video about restoring an Apache Helicopter.
                
                STRICT VISUAL STYLE: 100% Photorealistic, Cinematic Photography, 8K, Automotive/Aviation restoration detail.
                THEME: Satisfaction, Progress, Old to New, ASMR.
                
                For each sense, provide:
                - title: Catchy name for the sense.
                - description: Internal action description.
                - prompt: A highly detailed 100% Realistic video generation prompt.
                - voiceover: A short narration (max 20 words) in English.
                
                Maintain subject and environmental consistency throughout.
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
            setError("Architecting failed. Check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenderScene = async (index: number) => {
        const scene = scenes[index];
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true } : s));
        try {
            const finalPrompt = `100% Realistic, cinematic photography, high detail, 8k. ${scene.prompt}. No text in image.`;
            const url = await generateImage(finalPrompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoading: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: false } : s));
        }
    };

    const handleRenderAll = async () => {
        setIsRenderingAll(true);
        stopSignal.current = false;
        for (let i = 0; i < scenes.length; i++) {
            if (stopSignal.current) break;
            if (scenes[i].imageUrl) continue;
            sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await handleRenderScene(i);
            await new Promise(r => setTimeout(r, 1000));
        }
        setIsRenderingAll(false);
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

    const completedCount = scenes.filter(s => s.imageUrl).length;
    const progressPercent = scenes.length > 0 ? Math.round((completedCount / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in font-sans">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/90 p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform rotate-2">
                                <span className="text-2xl">🚁</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-slate-300 uppercase tracking-tighter leading-none">
                                    Apache Pro X
                                </h2>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Military Tech Restoration</p>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="p-4 bg-black/40 rounded-2xl border border-gray-800 mb-6 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest">Past Prompt Spins Box</label>
                                <button onClick={handleShufflePresets} className="p-1 hover:rotate-180 transition-transform duration-500 text-gray-600 hover:text-emerald-400"><RefreshIcon /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {displaySpins.map((opt) => (
                                    <button 
                                        key={opt.label}
                                        onClick={() => { setMasterPrompt(opt.prompt); }}
                                        className={`p-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border shadow-sm ${masterPrompt === opt.prompt ? 'bg-emerald-900/40 border-emerald-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-emerald-500 hover:text-gray-300'}`}
                                    >
                                        <span className="text-sm">{opt.icon}</span> 
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-[#0f172a] rounded-2xl border border-gray-800 shadow-inner">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Restoration Concept</label>
                                <textarea 
                                    value={masterPrompt}
                                    onChange={(e) => setMasterPrompt(e.target.value)}
                                    placeholder="Enter your helicopter restoration story idea..."
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
                                            className="w-5 h-5 appearance-none border border-gray-700 rounded bg-black checked:bg-emerald-600 transition-all cursor-pointer relative"
                                        />
                                        {noVoiceover && <span className="absolute top-0.5 left-1 text-[10px] pointer-events-none">✓</span>}
                                    </div>
                                    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition">No Voiceover | គ្មានសំឡេង</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 px-2">Number of Senses (1-100)</label>
                                <input 
                                    type="number" 
                                    min="1" max="100" 
                                    value={senseCount}
                                    onChange={e => setSenseCount(parseInt(e.target.value) || 1)}
                                    className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl p-4 text-white font-black text-center text-xl focus:ring-1 focus:ring-emerald-500 transition-shadow shadow-inner"
                                />
                            </div>

                            <button 
                                onClick={handleArchitect} 
                                disabled={isLoading || !masterPrompt}
                                className="w-full py-5 bg-gradient-to-r from-emerald-600 to-slate-900 text-white font-black rounded-3xl shadow-xl transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm border-t border-white/20"
                            >
                                {isLoading ? <Spinner className="h-6 w-6" /> : <span className="text-xl">⚙️</span>} 
                                {isLoading ? 'Architecting...' : 'Get Sense (Architect)'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Production Canvas */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-[700px]">
                    <div className="bg-[#111827]/90 p-8 rounded-[3rem] border border-gray-800 shadow-2xl flex flex-col h-full backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Restoration Storyboard</h3>
                                {scenes.length > 0 && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Ready for 4K Media Generation</p>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {scenes.length > 0 && (
                                    <button onClick={isRenderingAll ? () => { stopSignal.current = true; } : handleRenderAll} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all border shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white border-red-500' : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'}`}>
                                        {isRenderingAll ? 'STOP RENDER' : 'GEN ALL ART'}
                                    </button>
                                )}
                                <button onClick={handleClear} className="p-2.5 bg-gray-900 rounded-xl text-gray-500 hover:text-red-500 transition border border-gray-700 shadow-lg"><TrashIcon /></button>
                            </div>
                        </div>

                        {scenes.length > 0 && (
                            <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-8 animate-fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Restoration Progress</span>
                                    </div>
                                    <span className="text-sm font-black text-emerald-500">{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
                                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6 relative z-10 pb-20">
                            {scenes.length > 0 ? (
                                scenes.map((scene, idx) => (
                                    <div key={idx} ref={(el) => (sceneRefs.current[idx] = el)} className="bg-gray-800/20 rounded-[2.5rem] border border-gray-700/50 p-6 group hover:border-emerald-500/30 transition-all shadow-xl">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Visual Slot */}
                                            <div className="w-full md:w-64 aspect-video md:aspect-square bg-black rounded-[1.5rem] overflow-hidden relative border border-gray-700 shrink-0 flex items-center justify-center shadow-inner">
                                                {scene.imageUrl ? (
                                                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Helicopter Visual" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        {scene.isLoading ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Spinner className="h-10 w-10 text-emerald-500 m-0" />
                                                                <span className="text-[9px] font-black text-emerald-400 uppercase animate-pulse">Rendering 8K...</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleRenderScene(idx)}
                                                                className="flex flex-col items-center gap-2 text-gray-600 hover:text-emerald-400 transition transform hover:scale-110"
                                                            >
                                                                <span className="text-3xl">🖼️</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Render Art</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg">SENSE {scene.id}</div>
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
                                                                title="Copy Prompt JSON"
                                                            >
                                                                {copyStatus === `j-${idx}` ? '✓' : <JsonIcon />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-300 text-xs italic leading-relaxed border-l-2 border-emerald-500 pl-3 py-1 mb-4">
                                                        "{scene.description}"
                                                    </p>
                                                </div>

                                                {!noVoiceover && (
                                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-start gap-3 shadow-inner">
                                                        <div className="text-xs mt-0.5">🎙️</div>
                                                        <p className="text-gray-400 text-xs font-serif italic leading-relaxed">{scene.voiceover}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 select-none">
                                    <span className="text-9xl mb-4">⚙️</span>
                                    <p className="text-2xl font-black uppercase tracking-[0.6em]">Waiting for Directives</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-950 border border-red-500 text-red-200 rounded-2xl shadow-2xl z-[100] animate-shake flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
                </div>
            )}
        </div>
    );
};

export default ApacheRestorationGenerator;