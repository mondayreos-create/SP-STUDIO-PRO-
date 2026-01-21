
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateHomeRestorationIdeas, 
    CarIdea, 
    generateYouTubeMetadata, 
    YouTubeMetadata 
} from '../services/geminiService.ts';

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

const CopyIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const JsonIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
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
    imageUrlA?: string;
    imageUrlB?: string;
    isLoadingImageA: boolean;
    isLoadingImageB: boolean;
}

const DesignHomeXAsmr: React.FC = () => {
    const [masterPrompt, setMasterPrompt] = useState('Transform a room: Decorate room from normal to a beautiful room (ASMR) - Old to New (ចាស់មកថ្មី), repairing and painting back to new. A professional cleaning crew comes to deep clean, scrub the walls, remove junk, and organize the room back to beautiful luxury. ផុសជុលបាញ់ថ្នាំពណ៍ មកថ្មីឡើង វិញ។');
    const [sceneCount, setSceneCount] = useState(15);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [roomIdeas, setRoomIdeas] = useState<CarIdea[]>([]);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

    // PERSISTENCE
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'design-home-x-asmr') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'design-home-x-asmr',
                category: 'vip',
                title: "Room Transformation X",
                data: { masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'design-home-x-asmr') return;
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
            const ideas = await generateHomeRestorationIdeas(masterPrompt || "Room transformation from normal to beautiful");
            setRoomIdeas(ideas);
        } catch (err) {
            setError("Failed to generate ideas.");
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    const handleUseIdea = (idea: CarIdea) => {
        setMasterPrompt(`Room Concept: ${idea.title}\n\nTransformation Plan: ${idea.description}\n\nFocus on the satisfying ASMR sounds of a cleaning crew restoring a normal room to a beautiful masterpiece. Old to New (ចាស់មកថ្មី). ផុសជុលបាញ់ថ្នាំពណ៍ មកថ្មីឡើង វិញ`);
        setRoomIdeas([]);
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

        const voiceInstruction = noVoiceover ? "\n\nSTRICT RULE: Do NOT include any spoken dialogue or narration. Focus purely on environmental ASMR sounds: vacuum humming, water pressure splashing, scrubbing, and high-gloss paint spraying hisses." : "";

        try {
            const result = await generateConsistentStoryScript(
                `ROOM TRANSFORMATION ASMR SCRIPT. Context: ${masterPrompt}. Style: 100% Realistic, Professional Cinematic Interior Photography. Focus on the cleaning crew's work from normal/old state to new/beautiful luxury perfection.${voiceInstruction}`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImageA: false, isLoadingImageB: false })));
        } catch (err) {
            setError("Failed to generate script.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateMetadata = async () => {
        if (scenes.length === 0) {
            setError("Please generate a script first.");
            return;
        }
        setIsGeneratingMeta(true);
        setError(null);
        try {
            const context = `Room Transformation Project: ${masterPrompt}\n\nSenses:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(
                "Ultimate Room Makeover ASMR | Old to Beautiful Transformation",
                context,
                "Room Restoration & Cleaning ASMR"
            );
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleGenerateImage = async (index: number, slot: 'A' | 'B') => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? (slot === 'A' ? { ...s, isLoadingImageA: true } : { ...s, isLoadingImageB: true }) : s));
        try {
            const variationPrompt = slot === 'B' ? ", alternate cinematic angle, different perspective" : ", wide cinematic lens";
            const prompt = `100% Realistic, professional interior architecture photography, 8k. Action: ${scene.action}. Environment: ${scene.consistentContext}. Detailed textures of cleaning foam vs shiny surfaces, fresh paint, modern furniture${variationPrompt}.`;
            const url = await generateImage(prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? (slot === 'A' ? { ...s, imageUrlA: url, isLoadingImageA: false } : { ...s, imageUrlB: url, isLoadingImageB: false }) : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? (slot === 'A' ? { ...s, isLoadingImageA: false } : { ...s, isLoadingImageB: false }) : s));
            setError("Image generation failed.");
        }
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
            sense_number: scene.sceneNumber,
            action: scene.action,
            voiceover: noVoiceover ? "" : scene.action,
            prompt: `100% Realistic, professional room transformation photography, 8k. Action: ${scene.action}. Context: ${scene.consistentContext}.`
        };
        navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2));
        setCopyStatus(`json-${index}`);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleDownload = (url: string, num: number, slot: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `RoomX_Sense_${num}_${slot}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setMasterPrompt('Transform a room: Decorate room from normal to a beautiful room (ASMR) - Old to New (ចាស់មកថ្មី), repairing and painting back to new. A professional cleaning crew comes to deep clean, scrub the walls, remove junk, and organize the room back to beautiful luxury. ផុសជុលបាញ់ថ្នាំពណ៍ មកថ្មីឡើង វិញ។');
        setScenes([]);
        setRoomIdeas([]);
        setNoVoiceover(true);
        setYoutubeMeta(null);
        setError(null);
        setSceneCount(15);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Inputs */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600 mb-2 flex items-center gap-2">
                        <span>🧼</span> Design Room X (ASMR)
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b border-gray-700 pb-4">
                        Old ruin to fresh beautiful perfection.
                    </p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Master Prompt Spins Box</label>
                            <button 
                                onClick={handleGenerateIdeas}
                                disabled={isGeneratingIdeas}
                                className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase flex items-center gap-1"
                            >
                                {isGeneratingIdeas ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon className="h-3 w-3"/>}
                                Get Ideas
                            </button>
                        </div>
                        
                        {roomIdeas.length > 0 && (
                            <div className="space-y-2 animate-slide-down bg-black/40 p-3 rounded-xl border border-gray-700 mb-4">
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter mb-2">Select a Project Plan:</h4>
                                {roomIdeas.map((idea, idx) => (
                                    <div key={idx} className="bg-gray-800 p-2 rounded border border-gray-700 group">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-grow">
                                                <div className="text-[10px] font-bold text-white leading-tight mb-1">{idea.title}</div>
                                                <div className="text-[9px] text-gray-500 line-clamp-1 group-hover:line-clamp-none transition-all">{idea.description}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleUseIdea(idea)}
                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black rounded uppercase shadow"
                                            >
                                                Use
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <textarea 
                            value={masterPrompt}
                            onChange={(e) => setMasterPrompt(e.target.value)}
                            placeholder="Describe the room transformation and goals..."
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-48 resize-none focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner text-sm leading-relaxed"
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
                                <div className={`w-10 h-5 rounded-full transition-colors ${noVoiceover ? 'bg-emerald-600' : 'bg-gray-700'}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${noVoiceover ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-emerald-400 uppercase tracking-tighter">No Voiceover (ASMR Only)</span>
                                <span className="text-[9px] text-gray-500 italic">Focus on satisfying cleaning sounds.</span>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Number Senses (Scenes)</label>
                        <input 
                            type="number" min="1" max="100" 
                            value={sceneCount}
                            onChange={(e) => setSceneCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleGenerateScript} 
                        disabled={isGeneratingScript || !masterPrompt.trim()}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black rounded-xl shadow-xl transition transform active:scale-[0.98] disabled:opacity-50 text-lg flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {isGeneratingScript ? <Spinner /> : '🚀'} 
                        {isGeneratingScript ? 'Architecting...' : 'Get Sense Script'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-xs animate-shake">{error}</div>}
                </div>

                {/* Right Panel: Sense Gallery */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 shadow-xl flex justify-between items-center sticky top-0 z-10 backdrop-blur">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Production storyboard ({scenes.length} Senses)</h3>
                        {scenes.length > 0 && (
                            <button 
                                onClick={handleGenerateMetadata}
                                disabled={isGeneratingMeta}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50"
                            >
                                {isGeneratingMeta ? <Spinner className="h-4 w-4 m-0"/> : <YouTubeIcon />} YouTube Info
                            </button>
                        )}
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
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Title Post Video</label>
                                        <button onClick={() => handleCopy(youtubeMeta.title, 'metaTitle')} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase">{copyStatus === 'metaTitle' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white text-sm font-bold">{youtubeMeta.title}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Description for YouTube</label>
                                        <button onClick={() => handleCopy(youtubeMeta.description, 'metaDesc')} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase">{copyStatus === 'metaDesc' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-emerald-500/50 transition-all duration-300">
                                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-emerald-900/30 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 text-xs shadow-inner">{scene.sceneNumber}</span>
                                        <p className="text-gray-300 text-xs italic line-clamp-1">"{scene.action}"</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(scene.action, `p-${idx}`)} className="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition border border-gray-700">{copyStatus === `p-${idx}` ? '✓ Copied' : 'Prompt'}</button>
                                        <button onClick={() => handleCopyJson(idx)} className="text-[9px] bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded transition border border-gray-700 uppercase">{copyStatus === `json-${idx}` ? '✓ Done' : 'JSON'}</button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-0 border-b border-gray-800">
                                    {/* Render A Slot */}
                                    <div className="aspect-video bg-black relative flex items-center justify-center border-r border-gray-800">
                                        {scene.imageUrlA ? (
                                            <img src={scene.imageUrlA} className="w-full h-full object-cover" alt="Render A" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                {scene.isLoadingImageA ? <><Spinner className="h-6 w-6 text-emerald-500" /><span className="text-[8px] text-gray-500 uppercase animate-pulse">Rendering A...</span></> : <button onClick={() => handleGenerateImage(idx, 'A')} className="px-3 py-1 bg-gray-800 text-[10px] text-gray-400 hover:text-white rounded uppercase font-bold">Render A</button>}
                                            </div>
                                        )}
                                        {scene.imageUrlA && (
                                            <button onClick={() => handleDownload(scene.imageUrlA!, scene.sceneNumber, 'A')} className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-emerald-600 shadow-xl"><DownloadIcon className="h-3 w-3" /></button>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Render A</div>
                                    </div>
                                    
                                    {/* Render B Slot */}
                                    <div className="aspect-video bg-black relative flex items-center justify-center">
                                        {scene.imageUrlB ? (
                                            <img src={scene.imageUrlB} className="w-full h-full object-cover" alt="Render B" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                {scene.isLoadingImageB ? <><Spinner className="h-6 w-6 text-emerald-500" /><span className="text-[8px] text-gray-500 uppercase animate-pulse">Rendering B...</span></> : <button onClick={() => handleGenerateImage(idx, 'B')} className="px-3 py-1 bg-gray-800 text-[10px] text-gray-400 hover:text-white rounded uppercase font-bold">Render B</button>}
                                            </div>
                                        )}
                                        {scene.imageUrlB && (
                                            <button onClick={() => handleDownload(scene.imageUrlB!, scene.sceneNumber, 'B')} className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-emerald-600 shadow-xl"><DownloadIcon className="h-3 w-3" /></button>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Render B</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {scenes.length === 0 && !isGeneratingScript && (
                            <div className="col-span-full py-20 text-center bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center">
                                 <div className="text-6xl mb-4 opacity-10">🏠</div>
                                 <p className="text-xs font-black text-gray-600 uppercase tracking-[0.3em]">Sense Canvas Ready</p>
                                 <p className="text-[10px] text-gray-700 mt-2">Describe the transformation and click "Get Sense Script" to start.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignHomeXAsmr;
