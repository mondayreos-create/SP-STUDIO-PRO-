
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateRoomCleaningIdeas, 
    CarIdea, 
    generateYouTubeMetadata, 
    YouTubeMetadata 
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

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

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrlFirst?: string;
    imageUrlMid?: string;
    imageUrlLast?: string;
    isLoadingFirst: boolean;
    isLoadingMid: boolean;
    isLoadingLast: boolean;
}

const RoomCleaningPro: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState('Room Cleaning (ASMR): A professional cleaning crew of many people arrives at an extremely dirty, abandoned house. សម្អាតបន្ទប់ពីចាស់មកថ្មី។ High-impact transformation where the crew cleans every corner.');
    const [sceneCount, setSceneCount] = useState(10);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    
    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) return;
        setIsGeneratingScript(true);
        setError(null);
        setScenes([]);
        try {
            const result = await generateConsistentStoryScript(
                `ROOM CLEANING CREW. Context: ${masterPrompt}. 0% to 100% transformation with a team of professional cleaners.`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingFirst: false, isLoadingMid: false, isLoadingLast: false })));
        } catch (err) {
            setError("Failed to generate script.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateFrame = async (index: number, type: 'first' | 'mid' | 'last') => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? { 
            ...s, 
            isLoadingFirst: type === 'first' ? true : s.isLoadingFirst,
            isLoadingMid: type === 'mid' ? true : s.isLoadingMid,
            isLoadingLast: type === 'last' ? true : s.isLoadingLast
        } : s));

        try {
            let stagePrompt = type === 'first' ? "0% DIRTY" : type === 'mid' ? "75% CLEANING" : "100% PERFECT";
            const prompt = `100% Realistic professional interior photography, 8k. Action: ${scene.action}. Stage: ${stagePrompt}. 100% consistency. No text.`;
            const url = await generateImage(prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { 
                ...s, 
                imageUrlFirst: type === 'first' ? url : s.imageUrlFirst,
                imageUrlMid: type === 'mid' ? url : s.imageUrlMid,
                imageUrlLast: type === 'last' ? url : s.imageUrlLast,
                isLoadingFirst: false, isLoadingMid: false, isLoadingLast: false
            } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingFirst: false, isLoadingMid: false, isLoadingLast: false } : s));
        }
    };

    const handleRenderAll = async () => {
        setIsRenderingAll(true);
        stopSignal.current = false;
        for (let i = 0; i < scenes.length; i++) {
            if (stopSignal.current) break;
            sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (!scenes[i].imageUrlFirst) await handleGenerateFrame(i, 'first');
            if (!scenes[i].imageUrlMid) await handleGenerateFrame(i, 'mid');
            if (!scenes[i].imageUrlLast) await handleGenerateFrame(i, 'last');
            await new Promise(r => setTimeout(r, 1500));
        }
        setIsRenderingAll(false);
    };

    const handleDownloadAll = () => {
        scenes.forEach((s, i) => {
            ['First', 'Mid', 'Last'].forEach((slot, j) => {
                const url = (s as any)[`imageUrl${slot}`];
                if (url) {
                    setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Cleaning_Scene_${s.sceneNumber}_${slot}.png`;
                        a.click();
                    }, (i * 1500) + (j * 500));
                }
            });
        });
    };

    const handleGenerateYouTubeInfo = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const context = `Cleaning Project: ${masterPrompt}\nSenses:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(masterPrompt.substring(0, 50), context, "Cleaning ASMR");
            setYoutubeMeta(meta);
        } catch (e) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleClear = () => {
        setMasterPrompt('');
        setScenes([]);
        setYoutubeMeta(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in text-gray-100 pb-24">
            <ClearProjectButton onClick={handleClear} />
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">សំអាតបន្ទប់ (PRO)</h2>
                        <textarea 
                            value={masterPrompt}
                            onChange={(e) => setMasterPrompt(e.target.value)}
                            placeholder="Describe the cleaning mission..."
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-48 resize-none focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                        />
                        <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm">
                            {isGeneratingScript ? <Spinner /> : 'Get Sense Script'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    {scenes.length > 0 && (
                        <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 shadow-xl flex flex-wrap justify-between items-center gap-4 sticky top-0 z-20 backdrop-blur-md">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Storyboard ({scenes.length})</h3>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={handleGenerateYouTubeInfo} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2">
                                    {isGeneratingMeta ? <Spinner className="h-3 w-3 m-0" /> : <YouTubeIcon />} YouTube Info
                                </button>
                                <button onClick={isRenderingAll ? () => { stopSignal.current = true; } : handleRenderAll} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2">
                                    {isRenderingAll ? 'Stop Renders' : 'Gen All Art'}
                                </button>
                                <button onClick={handleDownloadAll} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2">
                                    <DownloadIcon /> Down All Art
                                </button>
                            </div>
                        </div>
                    )}

                    {youtubeMeta && (
                        <div className="bg-gray-900 p-6 rounded-2xl border border-red-500/30 animate-fade-in space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            <div className="flex items-center gap-2 text-red-500 mb-2 font-black uppercase text-sm tracking-widest"><YouTubeIcon /> YouTube Distribution Kit</div>
                            <div className="space-y-4 text-xs">
                                <div><label className="text-gray-500 uppercase mb-1 block">Title</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white font-bold">{youtubeMeta.title}</div></div>
                                <div><label className="text-gray-500 uppercase mb-1 block">Description</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 whitespace-pre-wrap">{youtubeMeta.description}</div></div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-8 overflow-y-auto max-h-[1000px] custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={(el) => (sceneRefs.current[idx] = el)} className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                                <div className="p-4 bg-gray-800/50 flex justify-between items-center">
                                    <span className="text-xs font-black text-cyan-400">SENSE {scene.sceneNumber}</span>
                                    <p className="text-xs italic text-gray-400 truncate max-w-[70%]">"{scene.action}"</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-black p-1">
                                    {[
                                        { key: 'First', label: '0%', img: scene.imageUrlFirst, loading: scene.isLoadingFirst },
                                        { key: 'Mid', label: '75%', img: scene.imageUrlMid, loading: scene.isLoadingMid },
                                        { key: 'Last', label: '100%', img: scene.imageUrlLast, loading: scene.isLoadingLast }
                                    ].map((slot) => (
                                        <div key={slot.key} className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden rounded-xl border border-gray-800 group/frame">
                                            {slot.img ? (
                                                <img src={slot.img} className="w-full h-full object-cover" alt={slot.key} />
                                            ) : (
                                                <div className="text-center p-2">
                                                    {slot.loading ? <Spinner className="h-6 w-6 text-cyan-500" /> : <button onClick={() => handleGenerateFrame(idx, slot.key.toLowerCase() as any)} className="px-3 py-1 bg-gray-800 text-[9px] text-gray-400 hover:text-white rounded uppercase font-bold">Render {slot.label}</button>}
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded font-black">{slot.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomCleaningPro;
