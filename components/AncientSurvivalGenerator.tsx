
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

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

const survivalSpins = [
    { label: "Prehistoric Forest", icon: "🦖", prompt: "Life Million Years Ago: Lost and Alone in the Prehistoric Forest. A cinematic journey of a primitive human surviving in a lush, dangerous jungle filled with ancient ferns, giant insects, and the distant roar of dinosaurs. Focus on survival skills: making fire, finding water, and building a tree shelter. 100% Realistic, 8k documentary style." },
    { label: "Dino Encounter", icon: "🦕", prompt: "Prehistoric Survival: A lone human encounters a massive long-neck dinosaur in a misty valley. 100% Realistic, high-fidelity scale, cinematic low angle shots, moist jungle atmosphere." },
    { label: "Primitive Fire", icon: "🔥", prompt: "The First Flame: Detailed macro shots of a primitive human using sticks and dry moss to create fire in a dark cave. Satisfying ASMR focus on smoke, heat, and glowing embers." },
    { label: "Ancient River", icon: "🌊", prompt: "Prehistoric River Crossing: Navigating a dangerous river filled with ancient crocodiles. Underwater and surface split shots, high-speed water physics, realistic scale and tension." },
    { label: "Saber-tooth Hunt", icon: "🐯", prompt: "The Predator's Path: Hiding from a Saber-tooth tiger in the tall grass. POV breathing, extreme close-ups of the tiger's fur and fangs, cinematic tension, hyper-realistic." }
];

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
}

const AncientSurvivalGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(survivalSpins[0].prompt);
    const [sceneCount, setSceneCount] = useState(12);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'ancient-survival') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'ancient-survival',
                category: 'vip',
                title: "Prehistoric Survival Project",
                data: { masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'ancient-survival') return;
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

    const handleSelectSpin = (opt: typeof survivalSpins[0]) => {
        setMasterPrompt(opt.prompt);
        setScenes([]);
    };

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) {
            setError("Please enter a concept.");
            return;
        }
        setIsGeneratingScript(true);
        setError(null);
        setScenes([]);
        setYoutubeMeta(null);

        const voiceInstruction = noVoiceover ? "\n\nSTRICT RULE: Do NOT include any narration. Focus purely on the environmental ASMR sounds: heavy breathing, leaves rustling, animal roars, and fire crackling." : "";

        try {
            const result = await generateConsistentStoryScript(
                `PREHISTORIC SURVIVAL SCRIPT. Context: ${masterPrompt}. 
                STYLE: 100% Realistic, Professional Cinematic Nature Documentary Photography. 
                Focus on the raw, dangerous beauty of millions of years ago. 
                Maintain 100% character and environmental consistency across all scenes.${voiceInstruction}`,
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
            const prompt = `100% Realistic, professional cinematic nature photography, 8k. Prehistoric theme. Action: ${scene.action}. Environment: ${scene.consistentContext}. Detailed textures, humidity, raw nature, atmospheric lighting. No text.`;
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

    const handleCopyJson = (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        const structuredData = {
            sense: scene.sceneNumber,
            action: scene.action,
            voiceover: noVoiceover ? "" : scene.action,
            prompt: `100% Realistic, prehistoric nature cinematography, 8k. Action: ${scene.action}. Context: ${scene.consistentContext}.`
        };
        navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2));
        setCopyStatus(`json-${index}`);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleGenerateMetadata = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        setError(null);
        try {
            const context = `Ancient Survival Project: ${masterPrompt}\n\nSenses:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(
                "Life Million Years Ago | Ultimate Prehistoric Survival Journey",
                context,
                "Prehistoric Life & Survival ASMR"
            );
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Ancient_Survival_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setMasterPrompt(survivalSpins[0].prompt);
        setScenes([]);
        setNoVoiceover(true);
        setYoutubeMeta(null);
        setError(null);
        setSceneCount(12);
    };

    const completedCount = scenes.filter(s => s.imageUrl).length;
    const progressPercent = scenes.length > 0 ? Math.round((completedCount / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl">
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2 flex items-center gap-2">
                            <span>🏹</span> ការតស៊ូព្រៃ
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b border-gray-700 pb-4">
                            Ancient Survival Architect.
                        </p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Past Prompt Spins Box</label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {survivalSpins.map((opt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleSelectSpin(opt)}
                                        className={`p-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border shadow-sm ${masterPrompt === opt.prompt ? 'bg-orange-900/40 border-orange-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-orange-500 hover:text-gray-300'}`}
                                    >
                                        <span className="text-sm">{opt.icon}</span> 
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                value={masterPrompt}
                                onChange={(e) => setMasterPrompt(e.target.value)}
                                placeholder="Describe the survival story..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-40 resize-none focus:ring-2 focus:ring-orange-500 outline-none shadow-inner text-sm leading-relaxed"
                            />
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={noVoiceover} 
                                        onChange={e => setNoVoiceover(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${noVoiceover ? 'bg-orange-600' : 'bg-gray-700'}`}></div>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${noVoiceover ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-orange-400 uppercase tracking-tighter">No Voiceover</span>
                                    <span className="text-[9px] text-gray-500 italic">Focus on survival ASMR sounds.</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Number Senses (Scenes)</label>
                            <input 
                                type="number" min="1" max="100" 
                                value={sceneCount}
                                onChange={(e) => setSceneCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-pink-500 outline-none"
                            />
                        </div>

                        <button 
                            onClick={handleGenerateScript} 
                            disabled={isGeneratingScript || !masterPrompt.trim()}
                            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-700 hover:brightness-110 text-white font-black rounded-xl shadow-xl transition transform active:scale-[0.98] disabled:opacity-50 text-lg flex items-center justify-center gap-3 uppercase tracking-widest"
                        >
                            {isGeneratingScript ? <Spinner /> : '🚀'} 
                            {isGeneratingScript ? 'Architecting...' : 'Get Sense Script'}
                        </button>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {scenes.length > 0 && (
                        <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Survival Story Pipeline Progress</span>
                                </div>
                                <span className="text-sm font-black text-amber-500">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
                                <div className="h-full bg-gradient-to-r from-amber-600 to-orange-400 transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-center sticky top-16 z-10 backdrop-blur gap-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Survival storyboard ({scenes.length} Senses)</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {scenes.length > 0 && (
                                <>
                                    <button onClick={isRenderingAll ? () => { stopSignal.current = true; } : handleRenderAll} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all border shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-500'}`}>
                                        {isRenderingAll ? 'STOP RENDER' : 'GEN ALL ART'}
                                    </button>
                                    <button 
                                        onClick={() => handleCopy(scenes.map(s => `Sense ${s.sceneNumber}: ${s.action}`).join('\n\n'), 'all-senses')}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-[10px] font-bold transition shadow-md"
                                    >
                                        {copyStatus === 'all-senses' ? '✓ Copied' : 'Copy all Senses'}
                                    </button>
                                    <button 
                                        onClick={handleCopy(JSON.stringify(scenes, null, 2), 'all-json')}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-[10px] font-bold transition shadow-md"
                                    >
                                        {copyStatus === 'all-json' ? '✓ Copied' : 'Copy JSON all senses'}
                                    </button>
                                    <button 
                                        onClick={handleGenerateMetadata}
                                        disabled={isGeneratingMeta}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50"
                                    >
                                        {isGeneratingMeta ? <Spinner className="h-4 w-4 m-0"/> : <YouTubeIcon />} YouTube Info
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {youtubeMeta && (
                        <div className="bg-gray-900/80 p-6 rounded-2xl border border-red-500/30 animate-fade-in space-y-4 shadow-2xl">
                            <div className="flex items-center gap-2 text-red-500 mb-2">
                                <YouTubeIcon />
                                <h4 className="text-sm font-black uppercase tracking-widest">YouTube Distribution Kit</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">title post Video</label>
                                        <button onClick={() => handleCopy(youtubeMeta.title, 'metaTitle')} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase">{copyStatus === 'metaTitle' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white text-sm font-bold">{youtubeMeta.title}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Description for youtube</label>
                                        <button onClick={() => handleCopy(youtubeMeta.description, 'metaDesc')} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase">{copyStatus === 'metaDesc' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={(el) => (sceneRefs.current[idx] = el)} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-orange-500/50 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Sense ${scene.sceneNumber}`} />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            {scene.isLoadingImage ? (
                                                <>
                                                    <Spinner className="h-10 w-10 text-orange-500" />
                                                    <span className="text-[10px] text-gray-500 font-black uppercase animate-pulse">Rendering 8K Art...</span>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleGenerateImage(idx)}
                                                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-full text-[10px] uppercase shadow-lg transition-all"
                                                >
                                                    Render Sense Art
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-700 shadow-md">SENSE {scene.sceneNumber}</div>
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
                                <div className="p-4 flex-grow flex flex-col bg-gradient-to-b from-gray-900 to-black">
                                    <p className="text-gray-300 text-xs leading-relaxed italic border-l-2 border-orange-500 pl-3 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                                        "{scene.action}"
                                    </p>
                                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-gray-800 pt-3">
                                        <button 
                                            onClick={() => handleCopy(scene.action, `p-${idx}`)} 
                                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition font-black uppercase flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-700"
                                        >
                                            {copyStatus === `p-${idx}` ? '✓ Copied' : <><CopyIcon /> Prompt</>}
                                        </button>
                                        <button 
                                            onClick={() => handleCopyJson(idx)} 
                                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-orange-400 hover:text-orange-300 transition font-black uppercase flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-700"
                                        >
                                            {copyStatus === `json-${idx}` ? '✓ Done' : <><JsonIcon /> JSON</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {scenes.length === 0 && !isGeneratingScript && (
                            <div className="col-span-full py-20 text-center bg-gray-900/20 rounded-[3rem] border-4 border-dashed border-gray-800 flex flex-col items-center justify-center">
                                 <div className="text-8xl mb-4 opacity-10 grayscale">🏹</div>
                                 <p className="text-xl font-black text-gray-600 uppercase tracking-[0.4em]">Architect floor ready</p>
                                 <p className="text-sm text-gray-700 mt-4 max-w-md">Select a theme or describe your prehistoric survival story and click "Get Sense Script" to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AncientSurvivalGenerator;
