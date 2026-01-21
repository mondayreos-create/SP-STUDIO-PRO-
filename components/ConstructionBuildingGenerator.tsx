
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateYouTubeMetadata, 
    YouTubeMetadata,
    generateStoryIdeas, 
    StoryIdea 
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';
import { GoogleGenAI, Type } from "@google/genai";

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
    </svg>
);

const AnimatedCheckmark: React.FC<{className?: string}> = ({className = "w-4 h-4"}) => (
    <svg className={`${className} animate-pop-in`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const YouTubeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const JsonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const constructionPresets = [
    { label: "Modern Villa", icon: "🏠", prompt: "Building a luxury 2-story modern villa in the suburbs. High-speed foundation work, floor-to-ceiling glass installation, and final landscaping. Satisfying 8k architectural detail." },
    { label: "Suspension Bridge", icon: "🌉", prompt: "Engineering a massive steel suspension bridge over a deep blue river. Cinematic low angles of crane lifts, welding sparks, and final traffic flow." }
];

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
}

const ConstructionBuildingGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(constructionPresets[0].prompt);
    const [sceneCount, setSceneCount] = useState(12);
    const [selectedRatio, setSelectedRatio] = useState('16:9');
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    
    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useAutoSave('architect-x-v3', { masterPrompt, sceneCount, selectedRatio, scenes, youtubeMeta, thumbnailPrompt, thumbnailUrl });

    useEffect(() => {
        if (!thumbnailPrompt && masterPrompt) {
            setThumbnailPrompt(`Viral YouTube Thumbnail: Building a ${masterPrompt.substring(0, 100)}. 100% Realistic, high contrast, cinematic photography, 8k.`);
        }
    }, [masterPrompt, thumbnailPrompt]);

    const handleGenerateIdeas = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const ideas = await generateStoryIdeas(`Create 5 viral construction ideas for: ${masterPrompt}`, false);
            setStoryIdeas(ideas);
        } catch (err) { setError("Failed to generate ideas."); } finally { setIsLoading(false); }
    };

    const handleUseIdea = (idea: StoryIdea) => {
        setMasterPrompt(`Concept: ${idea.title}\n\nVision: ${idea.summary}`);
        setStoryIdeas([]);
        setScenes([]);
    };

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) return;
        setIsLoading(true);
        setIsGeneratingScript(true);
        setError(null);
        setScenes([]);
        try {
            const result = await generateConsistentStoryScript(`CONSTRUCTION PRODUCTION HUB SCRIPT. Context: ${masterPrompt}. Style: 100% Realistic, Professional Cinematic Architectural Photography.`, sceneCount);
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) { setError("Script failed."); } finally { setIsGeneratingScript(false); setIsLoading(false); }
    };

    const handleRenderSingle = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const renderPrompt = `100% Realistic professional architectural photography, 8k. Action: ${scene.action}. Context: ${scene.consistentContext}. No text. 100% building consistency.`;
            const url = await generateImage(renderPrompt, selectedRatio as any);
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) { setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s)); }
    };

    const handleRenderAll = async () => {
        setIsRenderingAll(true);
        stopSignal.current = false;
        for (let i = 0; i < scenes.length; i++) {
            if (stopSignal.current) break;
            if (scenes[i].imageUrl) continue;
            sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await handleRenderSingle(i);
            if (i < scenes.length - 1) await new Promise(r => setTimeout(r, 1500));
        }
        setIsRenderingAll(false);
    };

    const handleGenerateYouTubeInfo = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const context = `Construction Project: ${masterPrompt}\nSenses:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(masterPrompt.substring(0, 50), context, "Architecture");
            setYoutubeMeta(meta);
        } catch (e) { setError("Failed to generate metadata."); } finally { setIsGeneratingMeta(false); }
    };

    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;
        setIsGeneratingThumbnail(true);
        try {
            const url = await generateImage(thumbnailPrompt, selectedRatio, 'High');
            setThumbnailUrl(url);
        } catch (err) { setError("Thumbnail failed."); } finally { setIsGeneratingThumbnail(false); }
    };

    const handleCopy = (text: string, id: string) => {
        if (text) navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyCompactJson = () => {
        if (scenes.length === 0) return;
        const compact = scenes.map(s => ({
            p: s.sceneNumber,
            a: s.action,
            pr: s.consistentContext
        }));
        handleCopy(JSON.stringify(compact, null, 0), 'compact-json');
    };

    /* COMMENT: Implemented the missing handleDownloadSingle function to fix the compilation error on line 299. */
    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Architect_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progressPercent = scenes.length > 0 ? Math.round((scenes.filter(s => s.imageUrl).length / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in text-gray-100 pb-20">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/90 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-2xl">🏗️</span>
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-tighter leading-none">Architect X</h2>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 mb-6 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Blueprint Catalog</label>
                                <button onClick={handleGenerateIdeas} disabled={isLoading} className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase flex items-center gap-1">
                                    {isLoading ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon />} Get New Idea
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {constructionPresets.map((p, i) => (
                                    <button key={i} onClick={() => setMasterPrompt(p.prompt)} className={`p-3 rounded-lg border transition-all text-left text-[10px] font-bold uppercase ${masterPrompt === p.prompt ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-indigo-500'}`}>{p.icon} {p.label}</button>
                                ))}
                            </div>
                        </div>
                        <textarea value={masterPrompt} onChange={(e) => setMasterPrompt(e.target.value)} placeholder="Describe build mission..." className="w-full bg-[#0f172a] border border-gray-800 rounded-xl p-4 text-white h-40 resize-none outline-none shadow-inner text-sm" />
                        <button onClick={handleGenerateScript} disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-3xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm border-t border-white/20">{isGeneratingScript ? <Spinner className="m-auto" /> : 'Architect Senses'}</button>
                    </div>
                </div>

                {/* Right Area */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Status & SEO Kit */}
                    {scenes.length > 0 && (
                        <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-4 flex flex-col gap-4 animate-fade-in">
                            <div className="flex justify-between items-center px-4">
                                <span className="text-xl font-black text-cyan-400">Build Pipeline: {progressPercent}%</span>
                                <div className="flex gap-2">
                                    <button onClick={handleGenerateYouTubeInfo} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2">{isGeneratingMeta ? <Spinner className="h-3 w-3 m-0" /> : <YouTubeIcon />} {t('btn_seo_kit')}</button>
                                    <button onClick={isRenderingAll ? () => { stopSignal.current = true; } : handleRenderAll} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white' : 'bg-cyan-600 text-white'}`}>{isRenderingAll ? 'Stop' : 'Gen All Art'}</button>
                                    <button onClick={handleCopyCompactJson} className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'compact-json' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>{copyStatus === 'compact-json' ? '✓ DONE' : t('lbl_compact_json')}</button>
                                </div>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700 mx-auto max-w-[98%]"><div className={`h-full bg-gradient-to-r from-cyan-600 to-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(34,211,238,0.5)] ${isRenderingAll ? 'animate-pulse' : ''}`} style={{ width: `${progressPercent}%` }}></div></div>
                        </div>
                    )}

                    {/* Thumbnail Studio */}
                    <div className="bg-gray-800/40 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><span className="text-2xl">🖼️</span> Thumbnail Studio</h3>
                            {thumbnailUrl && (<button onClick={() => { const a = document.createElement('a'); a.href = thumbnailUrl; a.download = `Architect_Thumbnail.png`; a.click(); }} className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all shadow-lg"><DownloadIcon /></button>)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="aspect-video bg-black rounded-2xl border border-gray-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                                {thumbnailUrl ? (<img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />) : (<div className="text-center text-gray-700"><div className="text-4xl mb-2 opacity-20">🏗️</div><p className="text-[10px] uppercase font-black tracking-widest">Preview Area</p></div>)}
                                {isGeneratingThumbnail && (<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm"><Spinner className="h-10 w-10 text-cyan-500 mb-2" /><span className="text-[10px] font-black text-cyan-500 animate-pulse">RENDERING...</span></div>)}
                            </div>
                            <div className="flex flex-col justify-between">
                                <textarea value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} placeholder="Customize your viral thumbnail prompt..." className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white text-xs h-24 resize-none outline-none focus:ring-1 focus:ring-cyan-500" />
                                <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail || !thumbnailPrompt} className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-xl uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">{isGeneratingThumbnail ? <Spinner className="h-4 w-4 m-0" /> : <SparklesIcon />} Generate Thumbnail</button>
                            </div>
                        </div>
                    </div>

                    {/* SEO Kit Display */}
                    {youtubeMeta && (
                        <div className="bg-gray-900 p-6 rounded-[2.5rem] border border-red-500/30 animate-fade-in space-y-6 shadow-2xl relative overflow-hidden mb-6">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            <div className="flex items-center gap-2 text-red-500 mb-2 font-black uppercase text-sm tracking-widest"><YouTubeIcon /> SEO HUB (DISTRIBUTION KIT)</div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Viral Title</label>
                                        <button onClick={() => handleCopy(youtubeMeta.title, 'yt-t')} className="text-[10px] text-cyan-400 hover:text-white transition uppercase font-bold">Copy</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white text-sm font-bold flex justify-between items-center">{youtubeMeta.title}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">SEO Description</label>
                                        <button onClick={() => handleCopy(youtubeMeta.description, 'yt-d')} className="text-[10px] text-cyan-400 hover:text-white transition uppercase font-bold">Copy</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-500 uppercase block mb-1">Hashtags</label>
                                        <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-blue-400 flex justify-between items-center"><span className="truncate">{youtubeMeta.hashtags.join(' ')}</span> <button onClick={() => handleCopy(youtubeMeta.hashtags.join(' '), 'yt-h')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-h' ? <AnimatedCheckmark /> : 'Copy'}</button></div>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 uppercase block mb-1">Keywords / Tags</label>
                                        <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-emerald-400 flex justify-between items-center"><span className="truncate">{youtubeMeta.keywords.join(', ')}</span> <button onClick={() => handleCopy(youtubeMeta.keywords.join(', '), 'yt-k')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-k' ? <AnimatedCheckmark /> : 'Copy'}</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={el => sceneRefs.current[idx] = el} className="bg-gray-800/20 rounded-[2rem] border border-gray-700 overflow-hidden flex flex-col group shadow-xl hover:border-cyan-500/30 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="architectural render" />
                                            <button onClick={() => handleDownloadSingle(scene.imageUrl!, scene.sceneNumber)} className="absolute bottom-2 right-2 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition transform hover:scale-110 shadow-xl"><DownloadIcon /></button>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            {scene.isLoadingImage ? <Spinner className="h-10 w-10 text-cyan-500 m-0" /> : <button onClick={() => handleRenderSingle(idx)} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full text-[10px] uppercase font-black border border-gray-700 transition-all">Render Phase</button>}
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 bg-cyan-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg border border-white/10">SENSE {scene.sceneNumber}</div>
                                </div>
                                <div className="p-6 flex-grow flex flex-col bg-gradient-to-b from-gray-900 to-black">
                                    <p className="text-gray-300 text-xs leading-relaxed italic border-l-2 border-cyan-500 pl-3 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">"{scene.action}"</p>
                                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-800">
                                        <button onClick={() => handleCopy(scene.consistentContext, `p-${idx}`)} className="text-[10px] text-gray-500 hover:text-white transition font-black uppercase flex items-center gap-2">{copyStatus === `p-${idx}` ? '✓' : <CopyIcon />} PROMPT</button>
                                        <button onClick={() => handleCopy(JSON.stringify({p: scene.consistentContext}, null, 0), `j-${idx}`)} className="text-[10px] text-cyan-400 hover:text-cyan-300 transition font-black uppercase flex items-center gap-2">{copyStatus === `j-${idx}` ? '✓' : <JsonIcon />} COMPACT JSON</button>
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

export default ConstructionBuildingGenerator;
