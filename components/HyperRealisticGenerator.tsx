
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

const SparklesIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
}

const hyperPresets = [
    { title: "Dog Rescue Mission (Example)", desc: "Kind Man Rescues Abandoned Mother Dog and Puppies - You Won't Believe The Ending! Focus on photorealistic details, deep emotional lighting, and high-fidelity textures of fur, rain, and dirty environments." },
    { title: "Building a Hyper-Realistic Mini Villa", desc: "Building a Hyper-Realistic 2-Storey Mini Villa - So Beautiful You Can't Resist! Focus on professional architectural miniature construction, hand-laid bricks, intricate woodworking, and hyper-detailed landscaping." },
    { title: "Stunning 2-Story Mini House", desc: "Building a Stunning 2-Story Mini House Like a Dream | Full Steps | DIY Mini House. Macro photography style, focus on tools like tiny trowels, wet cement texture, and realistic glass windows." },
    { title: "Elegant Mini House With Chimney", desc: "This Elegant Mini House Will Surprise You - With a Real Chimney! Focus on the satisfying process of building a miniature stone fireplace and functional roof structure." },
    { title: "Luxurious Mini House - Bricks", desc: "Luxurious 2-Storey Mini House - Building Bricks by Hand! Close-up shots of hands precisely placing tiny red bricks one by one with realistic mortar." }
];

const HyperRealisticGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(hyperPresets[1].desc);
    const [sceneCount, setSceneCount] = useState(15);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    // Load History logic
    const loadLocalHistory = useCallback(() => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'hyper-realistic');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        loadLocalHistory();
        window.addEventListener('HISTORY_UPDATED', loadLocalHistory);
        return () => window.removeEventListener('HISTORY_UPDATED', loadLocalHistory);
    }, [loadLocalHistory]);

    // Save project effect
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'hyper-realistic') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'hyper-realistic',
                category: 'vip',
                title: masterPrompt.substring(0, 30) || "Hyper-Realistic Production",
                data: { masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
            loadLocalHistory();
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'hyper-realistic') return;
            const d = e.detail.data;
            if (d.masterPrompt) setMasterPrompt(d.masterPrompt);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.scenes) setScenes(d.scenes);
            if (d.noVoiceover !== undefined) setNoVoiceover(d.noVoiceover);
            if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
            setError(null);
            setShowHistory(false);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta, loadLocalHistory]);

    // FIX: Added handlePresetChange function to handle dropdown selection changes and reset scenes.
    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            setMasterPrompt(val);
            setScenes([]);
            setStoryIdeas([]);
        }
    };

    const handleGenerateIdeas = async () => {
        setIsGeneratingIdeas(true);
        setError(null);
        setStoryIdeas([]);
        try {
            const ideas = await generateStoryIdeas(`Create 5 of your best professional, creative and viral hyper-realistic production ideas for miniature building or emotional rescues.`, false);
            setStoryIdeas(ideas);
        } catch (err) {
            setError("Failed to generate story ideas.");
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    const handleUseIdea = (idea: StoryIdea) => {
        setMasterPrompt(`Title: ${idea.title}\n\nVision: ${idea.summary}\n\nStyle: 100% Realistic, Professional Cinematic Photography, High detail.`);
        setStoryIdeas([]);
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

        const voiceInstruction = noVoiceover ? "\n\nSTRICT RULE: Do NOT include any spoken dialogue or narration. Focus purely on realistic environmental sounds and visual impact (ASMR style)." : "";

        try {
            const result = await generateConsistentStoryScript(
                `HYPER-REALISTIC PRODUCTION SCRIPT. Context: ${masterPrompt}. 
                STYLE: 100% Realistic, Professional Cinematic Photography, National Geographic / Architectural Digest Aesthetic. 
                Focus on the texture, lighting, and authentic detail of every material (bricks, wood, fur, water).${voiceInstruction}`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) {
            setError("Failed to generate senses script.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const prompt = `100% Realistic, hyper-detailed photorealistic documentary style, 8k, raw photo quality. Action: ${scene.action}. Environment: ${scene.consistentContext}. Intense textures, cinematic natural lighting, sharp focus. Genuine photography aesthetic. No 3D render look.`;
            const url = await generateImage(prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s));
            setError("Image generation failed.");
        }
    };

    const handleCopyAll = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}: ${s.action}`).join('\n\n');
        handleCopy(text, 'all-senses-copy');
    };

    const handleDownloadAll = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}: ${s.action}\nVisual Prompt: ${s.consistentContext}`).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HyperRealistic_Senses_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
            prompt: `100% Realistic, hyper-detailed photorealistic, 8k. Action: ${scene.action}. Context: ${scene.consistentContext}.`
        };
        navigator.clipboard.writeText(JSON.stringify(structuredData, null, 2));
        setCopyStatus(`json-${index}`);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `HyperReal_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateMetadata = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        setError(null);
        try {
            const context = `Hyper-Realistic Production: ${masterPrompt}\n\nProduction Senses:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(
                "Incredible Hyper-Realistic Production | A Cinematic Journey",
                context,
                "Hyper-Realistic Nature & DIY"
            );
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleClear = () => {
        setMasterPrompt(hyperPresets[1].desc);
        setScenes([]);
        setNoVoiceover(true);
        setYoutubeMeta(null);
        setError(null);
        setSceneCount(15);
        setStoryIdeas([]);
    };

    const handleReloadHistory = (project: any) => {
        window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: project }));
        setShowHistory(false);
    };

    const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );

    const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
        <div className="w-full flex justify-end mb-4">
            <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Clear Project
            </button>
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in">
            {/* Header Action Bar */}
            <div className="w-full flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            loadLocalHistory();
                            setShowHistory(!showHistory);
                        }} 
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 border-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] ${showHistory ? 'bg-[#06b6d4] border-cyan-400 text-white' : 'bg-[#1e293b] border-gray-700 text-gray-300 hover:border-[#06b6d4]'}`}
                    >
                        <HistoryIcon /> {showHistory ? 'Hide History' : 'Reload History | ប្រវត្តផលិត'}
                    </button>
                </div>
                <button onClick={handleClear} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-300 bg-red-950/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-colors duration-200">
                    <TrashIcon className="h-4 w-4" /> Reset Project | សម្អាត
                </button>
            </div>

            {/* History Overlay */}
            {showHistory && (
                <div className="w-full bg-[#0f172a]/95 border-2 border-cyan-500/50 p-6 rounded-3xl mb-8 animate-slide-down shadow-[0_0_50px_rgba(6,182,212,0.3)] relative z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-cyan-400 uppercase tracking-widest flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5" /> Production History Vault
                        </h4>
                        <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-3xl transition-colors">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto custom-scrollbar pr-3">
                        {localHistory.length > 0 ? (
                            localHistory.map((project, idx) => (
                                <div 
                                    key={project.id} 
                                    onClick={() => handleReloadHistory(project)}
                                    className="bg-[#1e293b]/60 hover:bg-[#1e293b] border border-gray-700 p-5 rounded-2xl cursor-pointer transition-all group shadow-inner"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-2.5 py-1 rounded-full font-black border border-cyan-800/50 uppercase tracking-tighter">#{localHistory.length - idx}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">{project.data.masterPrompt || "Untitled Production"}</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic leading-relaxed">"{project.data.masterPrompt}"</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1">Restoration Ready <span className="text-lg">➜</span></span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found in vault.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Inputs */}
                <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-[#ec4899] mb-2 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                        <span>🌟</span> Hyper-Realistic Studio
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b border-gray-700 pb-4">
                        Professional High-Fidelity Scripting.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{t('spins_box')}</label>
                                <button 
                                    onClick={handleGenerateIdeas}
                                    disabled={isGeneratingIdeas}
                                    className="text-[10px] font-black text-[#06b6d4] hover:text-cyan-300 transition-colors uppercase flex items-center gap-1"
                                >
                                    {isGeneratingIdeas ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon className="h-3 w-3"/>}
                                    Get Ideas (5 Models)
                                </button>
                            </div>

                            {storyIdeas.length > 0 && (
                                <div className="space-y-2 animate-slide-down bg-black/40 p-3 rounded-xl border border-gray-700 mb-4">
                                    <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter mb-2">Select a Concept Model:</h4>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {storyIdeas.map((idea, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleUseIdea(idea)}
                                                className={`p-2 rounded border text-left transition-all bg-gray-800 border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-white`}
                                            >
                                                <div className="text-[10px] font-bold leading-tight mb-1">{idx + 1}. {idea.title}</div>
                                                <div className="text-[9px] line-clamp-1">{idea.summary}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <select 
                                onChange={handlePresetChange}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer"
                            >
                                <option value="">-- Select Concept Blueprint --</option>
                                {hyperPresets.map((p, i) => (
                                    <option key={i} value={p.desc}>{p.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Master Prompt</label>
                            <textarea 
                                value={masterPrompt}
                                onChange={(e) => setMasterPrompt(e.target.value)}
                                placeholder="Describe the hyper-realistic scenario..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-48 resize-none focus:ring-2 focus:ring-cyan-500 outline-none shadow-inner text-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    checked={noVoiceover} 
                                    onChange={e => setNoVoiceover(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-10 h-5 rounded-full transition-colors ${noVoiceover ? 'bg-cyan-600' : 'bg-gray-700'}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${noVoiceover ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-cyan-400 uppercase tracking-tighter">No Voiceover</span>
                                <span className="text-[9px] text-gray-500 italic">Focus on visual ASMR impact.</span>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Number Senses</label>
                        <input 
                            type="number" min="1" max="200" 
                            value={sceneCount}
                            onChange={(e) => setSceneCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleGenerateScript} 
                        disabled={isGeneratingScript || !masterPrompt.trim()}
                        className="w-full py-4 bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] hover:brightness-110 text-white font-black rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] transition transform active:scale-[0.98] disabled:opacity-50 text-lg flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {isGeneratingScript ? <Spinner /> : '🚀'} 
                        {isGeneratingScript ? 'Architecting...' : 'Get Sense Script'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-xs animate-shake">{error}</div>}
                </div>

                {/* Right Panel: Sense Gallery */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 backdrop-blur gap-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Storyboard ({scenes.length} Senses)</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {scenes.length > 0 && (
                                <>
                                    <button 
                                        onClick={handleCopyAll}
                                        className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] border border-gray-700 hover:border-cyan-400 text-gray-300 rounded-lg text-xs font-bold transition shadow-md"
                                    >
                                        {copyStatus === 'all-senses-copy' ? '✓ Copied' : <><CopyIcon /> Copy All</>}
                                    </button>
                                    <button 
                                        onClick={handleDownloadAll}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md"
                                    >
                                        <DownloadIcon /> Download All
                                    </button>
                                    <button 
                                        onClick={handleGenerateMetadata}
                                        disabled={isGeneratingMeta}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50"
                                    >
                                        {isGeneratingMeta ? <Spinner className="h-4 w-4 m-0"/> : <YouTubeIcon />} YouTube Kit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {youtubeMeta && (
                        <div className="bg-gray-900/80 p-6 rounded-2xl border border-red-500/30 animate-fade-in space-y-4 shadow-2xl">
                            <div className="flex items-center gap-2 text-red-500 mb-2">
                                <YouTubeIcon />
                                <h4 className="text-sm font-black uppercase tracking-widest">YouTube Metadata</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Title</label>
                                        <button onClick={() => handleCopy(youtubeMeta.title, 'metaTitle')} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase">{copyStatus === 'metaTitle' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white text-sm font-bold">{youtubeMeta.title}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Description</label>
                                        <button onClick={() => handleCopy(youtubeMeta.description, 'metaDesc')} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase">{copyStatus === 'metaDesc' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Sense ${scene.sceneNumber}`} />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            {scene.isLoadingImage ? (
                                                <>
                                                    <Spinner className="h-10 w-10 text-cyan-500" />
                                                    <span className="text-[10px] text-gray-500 font-black uppercase animate-pulse">Rendering Realistic Art...</span>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleGenerateImage(idx)}
                                                    className="px-6 py-2 bg-gradient-to-r from-[#06b6d4] to-[#ec4899] text-white font-black rounded-full text-[10px] uppercase shadow-lg transition-all transform hover:scale-105 active:scale-95"
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
                                    <p className="text-gray-300 text-xs leading-relaxed italic border-l-2 border-cyan-500 pl-3 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                                        "{scene.action}"
                                    </p>
                                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-gray-800 pt-3">
                                        <button 
                                            onClick={() => handleCopy(scene.consistentContext, `p-${idx}`)} 
                                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition font-black uppercase flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-700"
                                        >
                                            {copyStatus === `p-${idx}` ? '✓ Copied' : <><CopyIcon /> Prompt</>}
                                        </button>
                                        <button 
                                            onClick={() => handleCopyJson(idx)} 
                                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 transition font-black uppercase flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-700"
                                        >
                                            {copyStatus === `json-${idx}` ? '✓ Done' : <><JsonIcon /> JSON</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {scenes.length === 0 && !isGeneratingScript && (
                            <div className="col-span-full py-20 text-center bg-gray-900/20 rounded-[3rem] border-4 border-dashed border-gray-800 flex flex-col items-center justify-center">
                                 <div className="text-8xl mb-4 opacity-10 grayscale">📸</div>
                                 <p className="text-xl font-black text-gray-600 uppercase tracking-[0.4em]">Studio Ready</p>
                                 <p className="text-sm text-gray-700 mt-4 max-w-md">Select a blueprint, get ideas, or enter your scenario and click "Get Sense Script" to start.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HyperRealisticGenerator;
