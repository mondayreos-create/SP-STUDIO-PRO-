
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateStoryIdeas, 
    StoryIdea,
    generateYouTubeMetadata, 
    YouTubeMetadata
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';
import { GoogleGenAI } from "@google/genai";

type ImageQuality = 'Low' | 'Medium' | 'High';

const aspectRatios = [
    { label: '16:9 (Landscape)', value: '16:9', icon: '📺' },
    { label: '9:16 (Portrait)', value: '9:16', icon: '📱' },
    { label: '1:1 (Square)', value: '1:1', icon: '🔳' },
    { label: '4:3 (Classic)', value: '4:3', icon: '🖼️' },
    { label: '3:4 (Tall)', value: '3:4', icon: '📐' }
];

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AnimatedCheckmark: React.FC<{className?: string}> = ({className = "w-4 h-4"}) => (
    <svg className={`${className} animate-pop-in`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const YouTubeIcon = ({ className = "h-4 w-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const JsonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/xl" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const truckPresets = [
    { label: "Scania V8 King", prompt: "Manufacturing a heavy-duty Scania V8 truck. Focus on the engine block mounting, chrome detailing, and the high-gloss red finish. 100% Realistic 8k industrial photography." },
    { label: "Tesla Semi", prompt: "Assembling the Tesla Semi electric truck. High-tech cleanroom facility, robotic battery pack installation, and the futuristic high-gloss metallic finish." },
    { label: "Volvo FH16", prompt: "Production of the Volvo FH16 flagship. Focus on the Globetrotter cab welding and the 750hp engine integration. Industrial factory aesthetic." },
    { label: "Peterbilt 389", prompt: "Hand-assembling a classic Peterbilt 389. Focus on the massive chrome grill, the tall exhaust stacks, and the polished aluminum fuel tanks." },
    { label: "Kenworth W900", prompt: "Manufacturing the legendary Kenworth W900. Long-hood assembly, custom sleeper cab installation, and heavy-duty frame-rail construction." },
    { label: "Mercedes Actros", prompt: "The robotic production of the Mercedes-Benz Actros. Focus on the MirrorCam system assembly and the high-tech digital dashboard installation." },
    { label: "Nikola Tre BEV", prompt: "Assembling the Nikola Tre battery-electric truck. Focus on the large battery arrays and the high-voltage cable routing." },
    { label: "Caterpillar 797F", prompt: "Manufacturing the world's largest mining truck, the CAT 797F. Focus on the massive 13-foot tires and the 400-ton steel dump body assembly." },
    { label: "MAN TGX", prompt: "Production of the MAN TGX heavy hauler. Focus on the aerodynamic side skirts and the advanced driver-assist sensor integration." },
    { label: "Mack Anthem", prompt: "Assembling the Mack Anthem. Focus on the bold hood ornament installation and the steep aerodynamic sloping hood design." },
    { label: "Freightliner Cascadia", prompt: "The mass production of the Freightliner Cascadia. High-speed automated assembly line focusing on fuel efficiency aero-kits." },
    { label: "Iveco S-Way", prompt: "Manufacturing the Iveco S-Way. Focus on the modular cab construction and the natural gas (LNG) tank installation." },
    { label: "DAF XG+", prompt: "Assembling the DAF XG+. Focus on the elongated cab design for maximum comfort and the advanced safety camera systems." },
    { label: "Western Star 49X", prompt: "Building the heavy-duty Western Star 49X. Focus on the rugged vocational chassis and the reinforced vocational cab construction." },
    { label: "Oshkosh M-ATV", prompt: "Military-grade production of the Oshkosh M-ATV. Focus on the TAK-4 independent suspension and the armored hull assembly." },
    { label: "BelAZ 75710", prompt: "Assembling the ultra-class BelAZ 75710. Focus on the dual diesel engines and the eight massive tires required for 450-ton loads." },
    { label: "Liebherr T 282C", prompt: "Manufacturing the Liebherr T 282C mining truck. Focus on the high-power electric drive system and the massive radiator assembly." },
    { label: "Komatsu 930E", prompt: "The industrial build of the Komatsu 930E. Focus on the autonomous drive system integration and the heavy-duty planetary gear assembly." },
    { label: "Unimog U 5023", prompt: "Crafting the multi-purpose Unimog U 5023. Focus on the portal axles and the extreme off-road chassis flexibility." },
    { label: "Rivian R1T Fleet", prompt: "Industrial fleet production of the Rivian R1T. Focus on the skateboard platform assembly and the innovative gear tunnel construction." }
];

const loadingMessages = [
  "Forging the chassis...",
  "Mounting the V8 engine...",
  "Applying metallic top-coat...",
  "Finalizing the production line..."
];

const RenderLoadingOverlay: React.FC<{ progress: number; messageIndex: number }> = ({ progress, messageIndex }) => (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10 animate-fade-in p-4 text-center">
        <div className="relative mb-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
        </div>
        <h4 className="text-white font-bold text-[10px] mb-2 animate-pulse uppercase tracking-widest">{loadingMessages[messageIndex % loadingMessages.length]}</h4>
        <div className="w-full max-w-[100px] bg-gray-800 rounded-full h-1 mb-1 overflow-hidden border border-gray-700">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{Math.round(progress)}% Complete</span>
    </div>
);

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoading: boolean;
}

const SuperTruckManufacturing: React.FC = () => {
    const { t } = useLanguage();
    const [concept, setConcept] = useState(truckPresets[0].prompt);
    const [sceneCount, setSceneCount] = useState(15);
    const [selectedRatio, setSelectedRatio] = useState('16:9');
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingShorts, setIsGeneratingShorts] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isGeneratingThumbnailIdea, setIsGeneratingThumbnailIdea] = useState(false);

    const [simulatedProgress, setSimulatedProgress] = useState<Record<number, number>>({});
    const [simulatedMessageIdx, setSimulatedMessageIdx] = useState<Record<number, number>>({});

    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useAutoSave('super-truck-factory-v7', { concept, sceneCount, scenes, thumbnailUrl, thumbnailPrompt, youtubeMeta, selectedRatio });

    useEffect(() => {
        const handleLoad = (e: any) => {
            const project = e.detail;
            if (project.tool === 'super-truck-factory' && project.data) {
                const d = project.data;
                if (d.concept) setConcept(d.concept);
                if (d.sceneCount) setSceneCount(d.sceneCount);
                if (d.scenes) setScenes(d.scenes);
                if (d.thumbnailUrl) setThumbnailUrl(d.thumbnailUrl);
                if (d.thumbnailPrompt) setThumbnailPrompt(d.thumbnailPrompt);
                if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
                if (d.selectedRatio) setSelectedRatio(d.selectedRatio);
                setError(null);
            }
        };
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => window.removeEventListener('LOAD_PROJECT', handleLoad);
    }, []);

    useEffect(() => {
        if (!thumbnailPrompt && concept) {
            setThumbnailPrompt(`Viral YouTube Thumbnail for Truck Build: ${concept.substring(0, 100)}. Cinematic 3D hyper-realistic render, dramatic lighting, high contrast, 1K resolution industrial photography.`);
        }
    }, [concept, thumbnailPrompt]);

    const handleClearProject = () => {
        if (!window.confirm("Clear all production data?")) return;
        setConcept(truckPresets[0].prompt);
        setScenes([]);
        setThumbnailUrl(null);
        setYoutubeMeta(null);
        setError(null);
        stopSignal.current = true;
    };

    const handleGetNewIdeas = async () => {
        setIsGeneratingIdeas(true);
        setError(null);
        try {
            const ideas = await generateStoryIdeas("Create 5 innovative truck manufacturing concepts for high-retention social media.", false);
            setStoryIdeas(ideas);
        } catch (err) { setError("Ideas failed."); } finally { setIsGeneratingIdeas(false); }
    };

    const handleUseIdea = (idea: StoryIdea) => {
        setConcept(`Truck Build: ${idea.title}\n\nVision: ${idea.summary}`);
        setThumbnailPrompt(`Viral YouTube Thumbnail for Truck Build: ${idea.title}. 100% Realistic, high contrast, cinematic photography, 8k.`);
        setStoryIdeas([]);
        setScenes([]);
    };

    const handleGenerateThumbnailIdea = async () => {
        if (!concept.trim()) return;
        setIsGeneratingThumbnailIdea(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `As a professional YouTube Thumbnail artist, create one highly detailed, cinematic, and viral-worthy image generation prompt for a video about heavy truck manufacturing: ${concept}. Focus on composition, mechanical detail, and high-impact industrial textures. Output ONLY the prompt text, no extra words.`
            });
            setThumbnailPrompt(resp.text || '');
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingThumbnailIdea(false);
        }
    };

    const handleGenerateScript = async () => {
        if (!concept.trim()) return;
        setIsLoading(true);
        setIsGeneratingShorts(false);
        setError(null);
        setScenes([]);
        try {
            const prompt = `HEAVY TRUCK MANUFACTURING SCRIPT. Concept: ${concept}. Breakdown into exactly ${sceneCount} logical industrial steps. Style: 100% Realistic Industrial Cinematography.`;
            const result = await generateConsistentStoryScript(prompt, sceneCount);
            setScenes(result.map(s => ({ ...s, isLoading: false })));
        } catch (err) { setError("Script failed."); } finally { setIsLoading(false); }
    };

    const handleGenerateShorts = async () => {
        if (!concept.trim()) return;
        setIsLoading(true);
        setIsGeneratingShorts(true);
        setError(null);
        setScenes([]);
        try {
            const prompt = `SHORT FORM VIRAL TRUCK PRODUCTION SCRIPT. Concept: ${concept}. Task: Architect EXACTLY 6 intense scenes. Style: Fast-paced 100% Realistic.`;
            const result = await generateConsistentStoryScript(prompt, 6);
            setScenes(result.map(s => ({ ...s, isLoading: false })));
        } catch (err) { setError("Shorts failed."); } finally { setIsLoading(false); setIsGeneratingShorts(false); }
    };

    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;
        setIsGeneratingThumbnail(true);
        setError(null);
        try {
            // Standardizing to 16:9 and 1K resolution (Low quality)
            const url = await generateImage(thumbnailPrompt, '16:9', 'Low');
            setThumbnailUrl(url);
        } catch (err) { setError("Thumbnail failed."); } finally { setIsGeneratingThumbnail(false); }
    };

    const handleRenderSingle = async (index: number) => {
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true } : s));
        setSimulatedProgress(prev => ({ ...prev, [index]: 0 }));
        setSimulatedMessageIdx(prev => ({ ...prev, [index]: 0 }));
        const pInterval = window.setInterval(() => {
            setSimulatedProgress(prev => {
                const current = prev[index] ?? 0;
                if (current >= 95) { clearInterval(pInterval); return prev; }
                return { ...prev, [index]: current + Math.random() * 8 };
            });
        }, 300);
        const mInterval = window.setInterval(() => {
            setSimulatedMessageIdx(prev => ({ ...prev, [index]: ((prev[index] ?? 0) + 1) % loadingMessages.length }));
        }, 1500);
        try {
            const scene = scenes[index];
            const prompt = `100% Realistic heavy truck manufacturing, 8k. Action: ${scene.action}. Environment: ${scene.consistentContext}. Cinematic industrial lighting.`;
            const url = await generateImage(prompt, selectedRatio as any, 'Medium');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoading: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: false } : s));
        } finally {
            clearInterval(pInterval); clearInterval(mInterval);
        }
    };

    const handleRenderAll = async () => {
        if (scenes.length === 0) return;
        setIsRenderingAll(true);
        stopSignal.current = false;
        for (let i = 0; i < scenes.length; i++) {
            if (stopSignal.current) break;
            if (scenes[i].imageUrl) continue;
            sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await handleRenderSingle(i);
            if (i < scenes.length - 1) await new Promise(r => setTimeout(r, 1200));
        }
        setIsRenderingAll(false);
    };

    const handleGenerateSEOInfo = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const ctx = `Truck Project: ${concept}\nScenes:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(concept.substring(0, 50), ctx, 'Truck Factory');
            setYoutubeMeta(meta);
        } catch (err) { setError("SEO KIT failed."); } finally { setIsGeneratingMeta(false); }
    };

    const handleCopy = (text: string, id: string) => {
        if (text) navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllPrompts = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}: ${s.consistentContext}`).join('\n\n');
        handleCopy(text, 'all-prompts');
    };

    const handleDownloadAllArt = () => {
        if (scenes.length === 0) return;
        scenes.forEach((s, i) => {
            if (s.imageUrl) {
                setTimeout(() => handleDownloadSingle(s.imageUrl!, s.sceneNumber), i * 300);
            }
        });
        handleCopy('', 'all-download');
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

    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `TruckFactory_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progressPercent = scenes.length > 0 ? Math.round((scenes.filter(s => s.imageUrl).length / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in text-gray-100 pb-20 relative">
            <div className="w-full flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 uppercase tracking-tighter leading-none">Truck Factory Hub</h2>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full shadow-lg">
                        <div className={`w-2 h-2 rounded-full ${isRenderingAll ? 'bg-green-500 animate-pulse' : 'bg-blue-500'} `}></div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pipeline {isRenderingAll ? 'Online' : 'Standby'}</span>
                    </div>
                </div>
                <button onClick={handleClearProject} className="p-2.5 bg-red-950/20 text-red-500 border border-red-900/30 rounded-xl hover:bg-red-900 transition-all"><TrashIcon /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1a1f2e] p-6 rounded-3xl border border-gray-700 h-fit space-y-6 shadow-xl">
                        <div className="bg-black p-4 rounded-xl border border-gray-800 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Blueprint Catalog</label>
                                <button onClick={handleGetNewIdeas} disabled={isGeneratingIdeas} className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase flex items-center gap-1">
                                    {isGeneratingIdeas ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon />} Get New Idea
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                {truckPresets.map((p, i) => (
                                    <button key={i} onClick={() => setConcept(p.prompt)} className={`p-3 rounded-lg border transition-all text-left text-[10px] font-bold uppercase ${concept === p.prompt ? 'bg-blue-900/40 border-blue-500 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{p.label}</button>
                                ))}
                            </div>
                        </div>

                        <textarea value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Describe truck mission..." className="w-full bg-[#0f172a] border border-gray-700 rounded-2xl p-4 text-white text-xs h-32 resize-none outline-none transition-all placeholder-gray-800" />
                        
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 shadow-inner">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Aspect Ratio (Frame Size)</label>
                            <div className="grid grid-cols-5 gap-2">
                                {aspectRatios.map(r => (
                                    <button
                                        key={r.value}
                                        onClick={() => setSelectedRatio(r.value)}
                                        className={`p-2 rounded-lg border text-[10px] font-black transition-all flex flex-col items-center gap-1 ${selectedRatio === r.value ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                    >
                                        <span className="text-sm">{r.icon}</span>
                                        {r.value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 shadow-inner">
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Number of Senses (Scenes)</label>
                            <input 
                                type="number" min="1" max="100" 
                                value={sceneCount}
                                onChange={(e) => setSceneCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={handleGenerateScript} disabled={isLoading} className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                                {isLoading && !isGeneratingShorts ? <Spinner className="m-auto" /> : 'Full Script'}
                            </button>
                            <button onClick={handleGenerateShorts} disabled={isLoading} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                                {isLoading && isGeneratingShorts ? <Spinner className="m-auto" /> : 'Fast Shorts'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    {/* Thumbnail Studio */}
                    <div className="bg-gray-800/40 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><span className="text-2xl">🖼️</span> Thumbnail Studio</h3>
                            <div className="flex gap-2">
                                <button onClick={handleGenerateThumbnailIdea} disabled={isGeneratingThumbnailIdea} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg flex items-center gap-2">
                                    {isGeneratingThumbnailIdea ? <Spinner className="h-3 w-3 m-0" /> : <SparklesIcon />} Generate Idea
                                </button>
                                {thumbnailUrl && (<button onClick={() => { const a = document.createElement('a'); a.href = thumbnailUrl; a.download = `Truck_Thumbnail.png`; a.click(); }} className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all shadow-lg"><DownloadIcon /></button>)}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="aspect-video bg-black rounded-2xl border border-gray-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                                {thumbnailUrl ? (<img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />) : (<div className="text-center text-gray-700"><div className="text-4xl mb-2 opacity-20">🚛</div><p className="text-[10px] uppercase font-black tracking-widest">Preview Area</p></div>)}
                                {isGeneratingThumbnail && (<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm"><Spinner className="h-10 w-10 text-blue-500 mb-2" /><span className="text-[10px] font-black text-blue-500 animate-pulse">RENDERING 1K...</span></div>)}
                            </div>
                            <div className="flex flex-col justify-between">
                                <div className="space-y-4">
                                    <textarea value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} placeholder="Viral thumbnail prompt..." className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white text-xs h-36 resize-none outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail || !thumbnailPrompt} className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-xl uppercase text-xs shadow-xl flex items-center justify-center gap-2">{isGeneratingThumbnail ? <Spinner className="h-4 w-4 m-0" /> : <SparklesIcon />} Generate Thumbnail</button>
                            </div>
                        </div>
                    </div>

                    {/* SEO HUB */}
                    {scenes.length > 0 && (
                        <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Build Pipeline: {progressPercent}%</span>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={handleGenerateSEOInfo} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg flex items-center gap-2">{isGeneratingMeta ? <Spinner className="h-3 w-3 m-0" /> : <YouTubeIcon />} SEO Kit</button>
                                <button onClick={handleCopyAllPrompts} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'all-prompts' ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                    {copyStatus === 'all-prompts' ? '✓ Copied' : <><CopyIcon /> Copy All Prompts</>}
                                </button>
                                <button onClick={handleDownloadAllArt} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'all-download' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                    {copyStatus === 'all-download' ? '✓ Downloaded' : <><DownloadIcon /> Download All Art</>}
                                </button>
                                <button onClick={isRenderingAll ? () => { stopSignal.current = true; setIsRenderingAll(false); } : handleRenderAll} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{isRenderingAll ? 'STOP' : 'GEN ALL ART'}</button>
                                <button onClick={handleCopyCompactJson} className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'compact-json' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>{copyStatus === 'compact-json' ? '✓ COMPACT READY' : 'COMPACT JSON'}</button>
                            </div>
                        </div>
                    )}

                    {youtubeMeta && (
                        <div className="bg-gray-900 p-6 rounded-[2.5rem] border border-red-500/30 animate-fade-in space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            <div className="flex items-center gap-2 text-red-500 mb-2 font-black uppercase text-sm tracking-widest"><YouTubeIcon /> SEO HUB (DISTRIBUTION KIT)</div>
                            <div className="space-y-4 text-xs font-bold">
                                <div><label className="text-gray-500 uppercase block mb-1">Viral Title</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white flex justify-between items-center">{youtubeMeta.title} <button onClick={() => handleCopy(youtubeMeta.title, 'yt-t')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-t' ? <AnimatedCheckmark /> : 'Copy'}</button></div></div>
                                <div><label className="text-gray-500 uppercase block mb-1">SEO Description</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 whitespace-pre-wrap h-32 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-gray-500 uppercase block mb-1">Hashtags</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-blue-400 flex justify-between items-center"><span className="truncate">{youtubeMeta.hashtags.join(' ')}</span> <button onClick={() => handleCopy(youtubeMeta.hashtags.join(' '), 'yt-h')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-h' ? <AnimatedCheckmark /> : 'Copy'}</button></div></div>
                                    <div><label className="text-gray-500 uppercase block mb-1">Keywords / Tags</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-emerald-400 flex justify-between items-center"><span className="truncate">{youtubeMeta.keywords.join(', ')}</span> <button onClick={() => handleCopy(youtubeMeta.keywords.join(', '), 'yt-k')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-k' ? <AnimatedCheckmark /> : 'Copy'}</button></div></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[1200px] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={el => sceneRefs.current[idx] = el} className="bg-gray-800/20 rounded-2xl border border-gray-700 overflow-hidden flex flex-col group shadow-xl hover:border-blue-500/30 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="truck" />
                                            <button onClick={() => handleDownloadSingle(scene.imageUrl!, scene.sceneNumber)} className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 shadow-xl"><DownloadIcon /></button>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            {!scene.isLoading && <button onClick={() => handleRenderSingle(idx)} className="text-[10px] font-black uppercase text-gray-500 hover:text-red-400 border border-gray-800 px-4 py-2 rounded-full transition-colors">Render Part</button>}
                                        </div>
                                    )}
                                    {scene.isLoading && <RenderLoadingOverlay progress={simulatedProgress[idx] || 0} messageIndex={simulatedMessageIdx[idx] || 0} />}
                                    <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-lg">SENSE {scene.sceneNumber}</div>
                                </div>
                                <div className="p-4 flex flex-col flex-grow bg-gradient-to-b from-gray-900 to-black">
                                    <p className="text-gray-300 text-xs italic line-clamp-3 mb-4 min-h-[3em]">"{scene.action}"</p>
                                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-800">
                                        <button onClick={() => handleCopy(scene.consistentContext, `p-${idx}`)} className={`text-[9px] font-black uppercase transition-all flex items-center gap-1 ${copyStatus === `p-${idx}` ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}><CopyIcon /> PROMPT</button>
                                        <button onClick={() => handleCopy(JSON.stringify(scene, null, 2), `j-${idx}`)} className={`text-[9px] font-black uppercase tracking-tighter transition-all ${copyStatus === `j-${idx}` ? 'text-green-400' : 'text-blue-400 hover:text-blue-300'}`}>JSON</button>
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

export default SuperTruckManufacturing;
