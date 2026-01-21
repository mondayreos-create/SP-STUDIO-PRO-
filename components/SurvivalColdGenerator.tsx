
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateYouTubeMetadata, 
    YouTubeMetadata 
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import { GoogleGenAI, Type } from "@google/genai";

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <TrashIcon /> Clear Project | សម្អាត
        </button>
    </div>
);

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
}

const SurvivalColdGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState('Survival in Afghanistan’s Extreme Cold: A cinematic documentary-style journey of survival in the high peaks. Focus on the cold, the wind, and the struggle to find shelter and fire. 100% Realistic, epic mountain photography.');
    const [sceneCount, setSceneCount] = useState(12);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [survivalIdeas, setSurvivalIdeas] = useState<any[]>([]);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'survival-cold') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'survival-cold',
                category: 'vip',
                title: "Survival Cold Project",
                data: { masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'survival-cold') return;
            const d = e.detail.data;
            if (d.masterPrompt) setMasterPrompt(d.masterPrompt);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.scenes) setScenes(d.scenes);
            if (d.noVoiceover !== undefined) setNoVoiceover(d.noVoiceover);
            if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta]);

    const handleGenerateIdeas = async () => {
        setIsGeneratingIdeas(true);
        setError(null);
        try {
            const prompt = `Generate 5 cinematic survival ideas for the theme: "Survival in Afghanistan’s Extreme Cold". Focus on realism and epic visuals. Output JSON array of {title, description}`;
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    }
                }
            });
            const ideas = JSON.parse(response.text || "[]");
            setSurvivalIdeas(ideas);
        } catch (err) {
            setError("Failed to generate ideas.");
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    const handleUseIdea = (idea: any) => {
        setMasterPrompt(`${idea.title}\n\n${idea.description}`);
        setSurvivalIdeas([]);
    };

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) {
            setError("Please enter a master prompt.");
            return;
        }
        setIsGeneratingScript(true);
        setError(null);
        setScenes([]);
        setYoutubeMeta(null);

        const voiceInstruction = noVoiceover ? "\n\nSTRICT RULE: Do NOT include any spoken dialogue or narration. Focus purely on environmental ASMR sounds: howling wind, crunching snow, crackling ice." : "";

        try {
            const result = await generateConsistentStoryScript(
                `SURVIVAL EXTREME COLD PRODUCTION. Context: ${masterPrompt}. Style: 100% Realistic, Cinematic High-Altitude Documentary Photography. Snow-filled valleys, frosted gear, breath mist.${voiceInstruction}`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) {
            setError("Failed to generate script.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const prompt = `100% Realistic cinematic documentary photography, 8k. Theme: Survival in Afghanistan Extreme Cold. Action: ${scene.action}. Environment: ${scene.consistentContext}. Intense cold atmosphere, frosted textures, wind particles, morning blue light, epic scale. 100% visual consistency.`;
            const url = await generateImage(prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s));
            setError("Image generation failed.");
        }
    };

    const handleRenderAll = async () => {
        setIsRenderingAll(true);
        stopSignal.current = false;
        for (let i = 0; i < scenes.length; i++) {
            if (stopSignal.current) break;
            if (scenes[i].imageUrl) continue;
            sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await handleGenerateImage(i);
            await new Promise(r => setTimeout(r, 1000));
        }
        setIsRenderingAll(false);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllPrompts = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}: ${s.consistentContext}`).join('\n\n');
        handleCopy(text, 'all-prompts');
    };

    const handleCopyAllJson = () => {
        if (scenes.length === 0) return;
        handleCopy(JSON.stringify(scenes, null, 2), 'all-json');
    };

    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Survival_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setMasterPrompt('Survival in Afghanistan’s Extreme Cold: A cinematic documentary-style journey of survival in the high peaks. Focus on the cold, the wind, and the struggle to find shelter and fire. 100% Realistic, epic mountain photography.');
        setScenes([]);
        setSurvivalIdeas([]);
        setNoVoiceover(true);
        setYoutubeMeta(null);
        setError(null);
        setSceneCount(12);
    };

    const completedCount = scenes.filter(s => s.imageUrl).length;
    const progressPercent = scenes.length > 0 ? Math.round((completedCount / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in text-slate-100 pb-20">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 h-fit space-y-6 shadow-xl backdrop-blur-sm">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-slate-100 mb-2 flex items-center gap-2">
                            <span>❄️🏔️</span> Survival Cold
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-700 pb-4">
                            Extreme Cold Survival Storyboard.
                        </p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Master Prompt Spins Box</label>
                                <button 
                                    onClick={handleGenerateIdeas}
                                    disabled={isGeneratingIdeas}
                                    className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 transition-colors uppercase flex items-center gap-1"
                                >
                                    {isGeneratingIdeas ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon className="h-3 w-3"/>}
                                    Get Ideas
                                </button>
                            </div>
                            
                            {survivalIdeas.length > 0 && (
                                <div className="space-y-2 animate-slide-down bg-black/40 p-3 rounded-xl border border-slate-700 mb-4">
                                    <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter mb-2">Select a Vision:</h4>
                                    {survivalIdeas.map((idea, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => handleUseIdea(idea)}
                                            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-left group hover:border-blue-500 transition"
                                        >
                                            <div className="text-[10px] font-bold text-white leading-tight mb-1">{idea.title}</div>
                                            <div className="text-[9px] text-slate-400 line-clamp-1 group-hover:line-clamp-none transition-all">{idea.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea 
                                value={masterPrompt}
                                onChange={(e) => setMasterPrompt(e.target.value)}
                                placeholder="Describe the extreme cold survival scenario..."
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white h-48 resize-none focus:ring-2 focus:ring-cyan-500 outline-none shadow-inner text-sm leading-relaxed"
                            />
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={noVoiceover} 
                                        onChange={e => setNoVoiceover(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${noVoiceover ? 'bg-blue-600' : 'bg-slate-700'}`}></div>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${noVoiceover ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-blue-400 uppercase tracking-tighter">No Voiceover (ASMR Only)</span>
                                    <span className="text-[9px] text-slate-500 italic">Focus on sounds of ice and wind.</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Number Senses (Scenes)</label>
                            <input 
                                type="number" min="1" max="100" 
                                value={sceneCount}
                                onChange={(e) => setSceneCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <button 
                            onClick={handleGenerateScript} 
                            disabled={isGeneratingScript || !masterPrompt.trim()}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-slate-600 hover:brightness-110 text-white font-black rounded-xl shadow-xl transition transform active:scale-[0.98] disabled:opacity-50 text-lg flex items-center justify-center gap-3 uppercase tracking-widest"
                        >
                            {isGeneratingScript ? <Spinner /> : '🏔️'} 
                            {isGeneratingScript ? 'Drafting...' : 'Get Sense Script'}
                        </button>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-8 space-y-6">
                    {scenes.length > 0 && (
                        <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Survival Pipeline Progress</span>
                                </div>
                                <span className="text-sm font-black text-blue-500">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}

                    {scenes.length > 0 && (
                        <div className="bg-slate-800/90 p-4 rounded-3xl border border-slate-700 flex flex-col md:flex-row justify-between items-center sticky top-16 z-10 backdrop-blur shadow-xl gap-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Storyboard Canvas</h3>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={isRenderingAll ? () => { stopSignal.current = true; } : handleRenderAll} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all border shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                                    {isRenderingAll ? 'STOP RENDER' : 'GEN ALL ART'}
                                </button>
                                <button onClick={handleCopyAllPrompts} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all border shadow-lg flex items-center gap-2 ${copyStatus === 'all-prompts' ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                                    <CopyIcon /> {copyStatus === 'all-prompts' ? 'COPIED!' : 'Copy All Prompt'}
                                </button>
                                <button onClick={handleCopyAllJson} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all border shadow-lg flex items-center gap-2 ${copyStatus === 'all-json' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 text-indigo-400 hover:text-white'}`}>
                                    <JsonIcon /> {copyStatus === 'all-json' ? '✓ JSON Ready' : 'Copy All JSON'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={(el) => (sceneRefs.current[idx] = el)} className="bg-slate-900 rounded-2xl overflow-hidden border border-blue-500/50 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Sense ${scene.sceneNumber}`} />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            {scene.isLoadingImage ? (
                                                <>
                                                    <Spinner className="h-10 w-10 text-cyan-500" />
                                                    <span className="text-[10px] text-slate-500 font-black uppercase animate-pulse">Rendering 8K Art...</span>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleGenerateImage(idx)}
                                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full text-[10px] uppercase shadow-lg transition-all"
                                                >
                                                    Render Sense Art
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-slate-700 shadow-md">SENSE {scene.sceneNumber}</div>
                                    {scene.imageUrl && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                            <button 
                                                onClick={() => handleDownloadSingle(scene.imageUrl!, scene.sceneNumber)} 
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110 shadow-xl" 
                                                title="Download Image"
                                            >
                                                <DownloadIcon />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-grow bg-gradient-to-b from-slate-900 to-black">
                                    <p className="text-slate-300 text-xs leading-relaxed italic border-l-2 border-blue-500 pl-3 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                                        "{scene.action}"
                                    </p>
                                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
                                        <button 
                                            onClick={() => handleCopy(scene.action, `p-${idx}`)} 
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition font-black uppercase flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-700"
                                        >
                                            {copyStatus === `p-${idx}` ? '✓ Copied' : <><CopyIcon /> Prompt</>}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const struct = {
                                                    scene: scene.sceneNumber,
                                                    action: scene.action,
                                                    voiceover: noVoiceover ? "" : scene.action
                                                };
                                                handleCopy(JSON.stringify(struct, null, 2), `json-${idx}`);
                                            }} 
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition font-black uppercase flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-700"
                                        >
                                            {copyStatus === `json-${idx}` ? '✓ Done' : <><JsonIcon /> JSON</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SurvivalColdGenerator;
