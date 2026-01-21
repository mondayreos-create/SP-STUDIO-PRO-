
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateHomeRestorationIdeas, 
    generateStoryIdeas,
    CarIdea, 
    generateYouTubeMetadata, 
    YouTubeMetadata 
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';
import { GoogleGenAI, Type } from "@google/genai";

const aspectRatios = [
    { label: '16:9 (Landscape)', value: '16:9', icon: '📺' },
    { label: '9:16 (Portrait)', value: '9:16', icon: '📱' },
    { label: '1:1 (Square)', value: '1:1', icon: '🔳' },
    { label: '4:3 (Classic)', value: '4:3', icon: '🖼️' },
    { label: '3:4 (Tall)', value: '3:4', icon: '📐' }
];

type CategoryType = 'model' | 'location';

const categories: { id: string; label: string; icon: string; type: CategoryType }[] = [
    { id: 'car', label: 'Car', icon: '🚗', type: 'model' },
    { id: 'moto', label: 'Moto', icon: '🏍️', type: 'model' },
    { id: 'bicycle', label: 'Bicycle', icon: '🚲', type: 'model' },
    { id: 'boat', label: 'Boat', icon: '🚤', type: 'model' },
    { id: 'airplane', label: 'Airplane', icon: '✈️', type: 'model' },
    { id: 'house', label: 'House', icon: '🏠', type: 'location' },
    { id: 'room', label: 'Room', icon: '🛋️', type: 'location' },
    { id: 'road', label: 'Road', icon: '🛣️', type: 'location' },
    { id: 'abandoned', label: 'Abandoned', icon: '🏚️', type: 'location' },
    { id: 'phone', label: 'Phone', icon: '📱', type: 'model' },
    { id: 'watch', label: 'Watch', icon: '⌚', type: 'model' },
    { id: 'shoes', label: 'Shoes', icon: '👟', type: 'model' },
    { id: 'furniture', label: 'Furniture', icon: '🪑', type: 'model' },
    { id: 'garden', label: 'Garden', icon: '🌻', type: 'location' },
    { id: 'pool', label: 'Pool', icon: '🏊', type: 'location' },
    { id: 'laptop', label: 'Laptop', icon: '💻', type: 'model' },
    { id: 'camera', label: 'Camera', icon: '📷', type: 'model' },
];

const motionSpeeds = [
    { label: 'Static', value: 'static', icon: '🛑' },
    { label: 'Normal', value: 'normal', icon: '🚶' },
    { label: 'Fast', value: 'fast', icon: '🏃' },
    { label: 'Turbo', value: 'turbo', icon: '⚡' }
];

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const ChevronIcon = ({ className = "h-4 w-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const JsonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const DraftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
}

const RestorationAsmrGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [category, setCategory] = useState('car');
    const [masterPrompt, setMasterPrompt] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [sceneCount, setSceneCount] = useState(15);
    const [motionSpeed, setMotionSpeed] = useState('normal');
    const [selectedRatio, setSelectedRatio] = useState('16:9');
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingShorts, setIsGeneratingShorts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [isYtKitVisible, setIsYtKitVisible] = useState(true);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // Visual Style State
    const [visualStyles, setVisualStyles] = useState<string[]>([]);
    const [isGeneratingStyles, setIsGeneratingStyles] = useState(false);

    // Thumbnail State
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isGeneratingThumbnailIdea, setIsGeneratingThumbnailIdea] = useState(false);
    
    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useAutoSave('restoration-asmr-pro-v7', { category, masterPrompt, sceneCount, selectedRatio, scenes, thumbnailUrl, thumbnailPrompt, youtubeMeta, isYtKitVisible, visualStyles, customSubject, motionSpeed });

    useEffect(() => {
        const handleLoad = (e: any) => {
            const project = e.detail;
            if (project.tool === 'restoration-asmr' && project.data) {
                const d = project.data;
                if (d.category) setCategory(d.category);
                if (d.masterPrompt) setMasterPrompt(d.masterPrompt);
                if (d.customSubject) setCustomSubject(d.customSubject);
                if (d.sceneCount) setSceneCount(d.sceneCount);
                if (d.selectedRatio) setSelectedRatio(d.selectedRatio);
                if (d.scenes) setScenes(d.scenes);
                if (d.thumbnailUrl) setThumbnailUrl(d.thumbnailUrl);
                if (d.thumbnailPrompt) setThumbnailPrompt(d.thumbnailPrompt);
                if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
                if (d.isYtKitVisible !== undefined) setIsYtKitVisible(d.isYtKitVisible);
                if (d.visualStyles) setVisualStyles(d.visualStyles);
                if (d.motionSpeed) setMotionSpeed(d.motionSpeed);
                setError(null);
            }
        };
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => window.removeEventListener('LOAD_PROJECT', handleLoad);
    }, []);

    const fetchVisualStyles = useCallback(async (catId: string) => {
        setIsGeneratingStyles(true);
        const cat = categories.find(c => c.id === catId);
        const typeLabel = cat?.type === 'model' ? "Famous Model Names / Specific Brands" : "Specific Areas / Locations / Specialized Niche Sites";
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `You are a professional restoration video director. Generate a list of 20 distinct ${typeLabel} specifically for a viral restoration video about: "${cat?.label}". 
                If it is a vehicle/object, provide specific real-world models (e.g. 'Ferrari F40', '1960s Leica M3'). 
                If it is a place/road, provide specific environments (e.g. 'Abandoned Amazon River Dock', 'Rusty Route 66 Gas Station'). 
                Return only a JSON array of strings.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            const styles = JSON.parse(response.text || "[]");
            setVisualStyles(styles);
        } catch (err) {
            console.error("Failed to fetch visual styles", err);
        } finally {
            setIsGeneratingStyles(false);
        }
    }, []);

    useEffect(() => {
        if (category) {
            fetchVisualStyles(category);
        }
    }, [category, fetchVisualStyles]);

    useEffect(() => {
        if (!thumbnailPrompt && masterPrompt) {
            setThumbnailPrompt(`Viral YouTube Thumbnail: ${masterPrompt.substring(0, 100)}. Cinematic macro restoration photography, high contrast, 1K resolution.`);
        }
    }, [masterPrompt, thumbnailPrompt]);

    const handleSaveDraft = () => {
        window.dispatchEvent(new CustomEvent('REQUEST_PROJECT_SAVE', { 
            detail: { tool: 'restoration-asmr' } 
        }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleGetNewIdea = async () => {
        setIsGeneratingIdeas(true);
        setError(null);
        try {
            const ideas = await generateStoryIdeas(`Create one unique viral restoration idea for a highly specific ${category}. Focus on extreme transformation from total ruin to luxury. Output one detailed summary.`, false);
            if (ideas.length > 0) {
                const idea = ideas[0];
                setMasterPrompt(`Restoration ASMR (PRO): ${idea.title}. ${idea.summary}. From 0% old to 100% brand new luxury state. Focus on satisfying mechanical steps and textures.`);
                setScenes([]);
            }
        } catch (err) {
            setError("Failed to generate a new idea.");
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    const handleGenerateThumbnailIdea = async () => {
        if (!masterPrompt.trim()) return;
        setIsGeneratingThumbnailIdea(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `As a professional YouTube Thumbnail Expert, generate ONE viral, high-CTR image generation prompt for this project: "${masterPrompt}". 
            Focus on extreme "Before vs After" contrast, 3D hyper-realism, cinematic lighting, and macro textures. 
            Output ONLY the English prompt text, no extra conversation.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            setThumbnailPrompt(response.text || '');
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingThumbnailIdea(false);
        }
    };

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) return;
        setIsLoading(true);
        setIsGeneratingShorts(false);
        setError(null);
        setScenes([]);
        try {
            const result = await generateConsistentStoryScript(
                `RESTORATION ASMR PRODUCTION. Context: ${masterPrompt}. 
                STRICT VISUAL RULE: Every scene must feature the SAME EXACT MODEL and SAME PRIMARY COLOR defined in the context. 
                Visual consistency is paramount. 
                Style: 100% Realistic, Professional Cinematic Photography. 
                Show the satisfying transformation from 0% ruined to 100% new. 
                No text. (ចាស់មកថ្មី - រក្សារនៅកន្លែងដ៏ដែល)`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) {
            setError("Failed to generate script.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateShorts = async () => {
        if (!masterPrompt.trim()) return;
        setIsLoading(true);
        setIsGeneratingShorts(true);
        setError(null);
        setScenes([]);
        try {
            const prompt = `SHORT VIRAL RESTORATION ASMR SCRIPT. Concept: ${masterPrompt}. 
            STRICT VISUAL RULE: Every scene must feature the SAME EXACT MODEL and SAME PRIMARY COLOR.
            Task: Generate EXACTLY 6 senses for a high-retention short video (Reels/Shorts/TikTok). 
            Style: Professional industrial 4K cinematography, 100% realistic. 
            IMPORTANT: The action should imply 'FAST x2' speed.`;
            const result = await generateConsistentStoryScript(prompt, 6);
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) {
            setError("Shorts failed.");
        } finally {
            setIsLoading(false);
            setIsGeneratingShorts(false);
        }
    };

    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;
        setIsGeneratingThumbnail(true);
        try {
            const url = await generateImage(thumbnailPrompt, '16:9', 'Low');
            setThumbnailUrl(url);
        } catch (err) {
            setError("Thumbnail failed.");
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const speedModifier = isGeneratingShorts || motionSpeed === 'turbo' ? "Fast motion x2 speed, " : motionSpeed === 'fast' ? "Quick motion, " : "";
            // Enhanced prompt for model and color consistency
            const prompt = `100% Realistic, professional macro photography of restoration, 8k. 
            ${speedModifier}Action: ${scene.action}. 
            Primary Subject DNA: ${masterPrompt}.
            Visual Environment: ${scene.consistentContext}. 
            CONSISTENCY MASTER RULE: You MUST retain the exact same model, same shape, and same primary color in this shot as the thumbnail and overview. 
            Detailed textures, high-gloss finish, cinematic lighting. 100% model and color consistency. No text. (ចាស់មកថ្មី - រក្សារនៅកន្លែងដ៏ដែល)`;
            const url = await generateImage(prompt, selectedRatio as any);
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s));
            setError("Image generation failed.");
        }
    };

    const handleRenderAll = async () => {
        setIsRenderingAll(true);
        stopSignal.current = false;
        
        // Speed scaling for rendering logic
        const baseDelay = motionSpeed === 'turbo' ? 200 : motionSpeed === 'fast' ? 600 : 1200;

        for (let i = 0; i < scenes.length; i++) {
            if (stopSignal.current) break;
            if (scenes[i].imageUrl) continue;
            sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await handleGenerateImage(i);
            await new Promise(r => setTimeout(r, baseDelay));
        }
        setIsRenderingAll(false);
    };

    const handleDownload = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Restoration_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        scenes.forEach((s, i) => {
            if (s.imageUrl) {
                setTimeout(() => {
                    handleDownload(s.imageUrl!, s.sceneNumber);
                }, i * 500);
            }
        });
    };

    const handleGenerateYTKit = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const context = `Restoration Project: ${masterPrompt}\nSenses:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(masterPrompt.substring(0, 50), context, "Restoration ASMR");
            setYoutubeMeta(meta);
            setIsYtKitVisible(true);
        } catch (e) {
            setError("Failed to generate YT KIT.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(key);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const applyDNABlueprint = (blueprint: string) => {
        const cat = categories.find(c => c.id === category);
        const prefix = cat?.type === 'model' ? "Restoration ASMR (PRO): Model - " : "Restoration ASMR (PRO): Area - ";
        const newPrompt = `${prefix}${blueprint}. Comprehensive restoration from absolute ruin at 0% to brand new masterpiece at 100%. Focus on satisfying macro steps: deep cleaning, precision repairs, and high-gloss factory finishing. (ចាស់មកថ្មី - រក្សារនៅកន្លែងដ៏ដែល)`;
        setMasterPrompt(newPrompt);
        setScenes([]);
    };

    const applyCustomSubject = () => {
        if (!customSubject.trim()) return;
        applyDNABlueprint(customSubject);
        setCustomSubject('');
    };

    const activeCat = categories.find(c => c.id === category);

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in text-gray-100 pb-24">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800/60 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl flex flex-col h-full backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="text-3xl">🛠️</span>
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-tighter leading-none">
                                Restoration ASMR
                            </h2>
                        </div>

                        {/* Category Selector Grid */}
                        <div className="space-y-2 mb-4">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                                Category Selection
                            </label>
                            <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-2xl border border-gray-800">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id)}
                                        className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all duration-300 border flex flex-col items-center gap-1 ${category === cat.id ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'}`}
                                    >
                                        <span className="text-lg">{cat.icon}</span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* DNA Blueprint Section */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    {activeCat?.type === 'model' ? '🚗 Model Name Blueprint' : '🏡 Area / Location Blueprint'}
                                    {isGeneratingStyles && <Spinner className="h-3 w-3 m-0" />}
                                </label>
                            </div>
                            <div className="bg-black/40 p-3 rounded-2xl border border-gray-800 h-48 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 gap-2">
                                    {visualStyles.map((style, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => applyDNABlueprint(style)}
                                            className="p-3 text-[10px] font-black text-left uppercase rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all flex items-center gap-2 group"
                                        >
                                            <span className="opacity-40 group-hover:opacity-100 transition-opacity">{idx + 1}.</span>
                                            <span className="truncate">{style}</span>
                                        </button>
                                    ))}
                                    {visualStyles.length === 0 && !isGeneratingStyles && (
                                        <div className="col-span-1 text-center py-16 opacity-20 text-[10px] font-black uppercase tracking-widest">Select Category First</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* NEW: Custom Idea Space */}
                        <div className="space-y-2 mb-6">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                                Custom {activeCat?.type === 'model' ? 'Model' : 'Location'} Name
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={customSubject}
                                    onChange={(e) => setCustomSubject(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyCustomSubject()}
                                    placeholder={activeCat?.type === 'model' ? "e.g. Toyota Supra Mk4" : "e.g. Abandoned Desert Gas Station"}
                                    className="flex-grow bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                                />
                                <button 
                                    onClick={applyCustomSubject}
                                    disabled={!customSubject.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase transition-all shadow-lg active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    <SparklesIcon /> Build
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Vision</label>
                                <button 
                                    onClick={handleGetNewIdea} 
                                    disabled={isGeneratingIdeas}
                                    className="text-[10px] font-black text-cyan-400 hover:text-white transition flex items-center gap-1"
                                >
                                    {isGeneratingIdeas ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon />} Get New Idea
                                </button>
                            </div>
                            <textarea 
                                value={masterPrompt}
                                onChange={(e) => setMasterPrompt(e.target.value)}
                                placeholder="Describe the restoration journey..."
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-4 text-white text-xs h-32 resize-none focus:ring-1 focus:ring-cyan-500 outline-none leading-relaxed"
                            />
                        </div>

                        <div className="mt-6 space-y-4">
                            {/* Aspect Ratio UI */}
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 shadow-inner">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Aspect Ratio</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {aspectRatios.map(r => (
                                        <button
                                            key={r.value}
                                            onClick={() => setSelectedRatio(r.value)}
                                            className={`p-2 rounded-lg border text-[10px] font-black transition-all flex flex-col items-center gap-1 ${selectedRatio === r.value ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <span className="text-sm">{r.icon}</span>
                                            {r.value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Motion Speed Control */}
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 shadow-inner">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Motion Intensity (Speed)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {motionSpeeds.map(s => (
                                        <button
                                            key={s.value}
                                            onClick={() => setMotionSpeed(s.value)}
                                            className={`p-2 rounded-lg border text-[10px] font-black transition-all flex flex-col items-center gap-1 ${motionSpeed === s.value ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <span className="text-sm">{s.icon}</span>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700 flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scenes Qty</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="w-8 h-8 bg-gray-700 rounded-lg font-bold hover:bg-gray-600 transition">-</button>
                                    <input 
                                        type="number"
                                        value={sceneCount}
                                        onChange={(e) => setSceneCount(Math.max(1, Math.min(499, parseInt(e.target.value) || 1)))}
                                        className="w-12 h-8 bg-[#0f172a] border border-gray-700 rounded-lg text-center font-black text-white outline-none focus:border-cyan-500"
                                    />
                                    <button onClick={() => setSceneCount(Math.min(499, sceneCount + 1))} className="w-8 h-8 bg-gray-700 rounded-lg font-bold hover:bg-gray-600 transition">+</button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={handleGenerateScript} disabled={isLoading} className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-black rounded-3xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px]">
                                    {isLoading && !isGeneratingShorts ? <Spinner className="m-auto" /> : 'Architect'}
                                </button>
                                <button onClick={handleGenerateShorts} disabled={isLoading} className="flex-1 py-5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:brightness-110 text-white font-black rounded-3xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px]">
                                    {isLoading && isGeneratingShorts ? <Spinner className="m-auto" /> : 'Fast Shorts'}
                                </button>
                            </div>

                            {/* Save Draft Button */}
                            <button 
                                onClick={handleSaveDraft}
                                className={`w-full py-3 border-2 transition-all flex items-center justify-center gap-2 rounded-2xl font-black uppercase text-[10px] tracking-widest ${saveStatus === 'saved' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-white'}`}
                            >
                                {saveStatus === 'saved' ? <AnimatedCheckmark /> : <DraftIcon />}
                                {saveStatus === 'saved' ? 'Saved to Vault' : 'Save Draft to Vault'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Storyboard */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Thumbnail Studio */}
                    <div className="bg-gray-800/40 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl animate-fade-in space-y-6 backdrop-blur-xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><span className="text-2xl">🖼️</span> Thumbnail Studio</h3>
                            {thumbnailUrl && (<button onClick={() => { const a = document.createElement('a'); a.href = thumbnailUrl; a.download = `Restoration_Thumbnail.png`; a.click(); }} className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all shadow-lg"><DownloadIcon /></button>)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="aspect-video bg-black rounded-2xl border border-gray-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                                {thumbnailUrl ? (<img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />) : (<div className="text-center text-gray-700"><div className="text-4xl mb-2 opacity-20">✨</div><p className="text-[10px] uppercase font-black tracking-widest">Preview Area</p></div>)}
                                {isGeneratingThumbnail && (<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm"><Spinner className="h-10 w-10 text-cyan-500 mb-2" /><span className="text-[10px] font-black text-cyan-400 animate-pulse">RENDERING 1K...</span></div>)}
                            </div>
                            <div className="flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Image Prompt Formula</label>
                                        <button 
                                            onClick={handleGenerateThumbnailIdea} 
                                            disabled={isGeneratingThumbnailIdea}
                                            className="text-[10px] font-black text-cyan-400 hover:text-white transition flex items-center gap-1"
                                        >
                                            {isGeneratingThumbnailIdea ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon />} Gen New Idea
                                        </button>
                                    </div>
                                    <textarea value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} placeholder="Customize your viral thumbnail prompt..." className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white text-xs h-24 resize-none outline-none focus:ring-1 focus:ring-cyan-500" />
                                </div>
                                <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail || !thumbnailPrompt} className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white font-black rounded-xl uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">{isGeneratingThumbnail ? <Spinner className="h-4 w-4 m-0" /> : <SparklesIcon />} Generate Thumbnail</button>
                            </div>
                        </div>
                    </div>

                    {scenes.length > 0 && (
                        <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 shadow-xl flex flex-wrap justify-between items-center gap-4 sticky top-0 z-20 backdrop-blur-md">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Storyboard ({scenes.length})</h3>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={handleGenerateYTKit} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2">
                                    {isGeneratingMeta ? <Spinner className="h-3 w-3 m-0" /> : <YouTubeIcon />} GET YT KIT
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

                    {/* YT KIT Display - Collapsible with individual copy controls */}
                    {youtubeMeta && (
                        <div className="bg-gray-900 rounded-[2.5rem] border border-red-500/30 animate-fade-in shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            
                            <button 
                                onClick={() => setIsYtKitVisible(!isYtKitVisible)}
                                className="w-full p-6 flex items-center justify-between group transition-colors hover:bg-white/5"
                            >
                                <div className="flex items-center gap-2 text-red-500 font-black uppercase text-sm tracking-widest">
                                    <YouTubeIcon /> YT KIT - Viral Distribution
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isYtKitVisible ? 'Click to Hide' : 'Click to Show'}
                                    </span>
                                    <ChevronIcon className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isYtKitVisible ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            
                            {isYtKitVisible && (
                                <div className="px-6 pb-6 space-y-6 animate-slide-down">
                                    <div className="space-y-4">
                                        <div className="bg-black/40 p-4 rounded-2xl border border-gray-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Viral Title</label>
                                                <button onClick={() => handleCopy(youtubeMeta.title, 'title')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-black flex items-center gap-1 transition">
                                                    {copyStatus === 'title' ? <AnimatedCheckmark /> : <><CopyIcon /> Copy</>}
                                                </button>
                                            </div>
                                            <div className="text-white text-sm font-bold">{youtubeMeta.title}</div>
                                        </div>

                                        <div className="bg-black/40 p-4 rounded-2xl border border-gray-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                                                <button onClick={() => handleCopy(youtubeMeta.description, 'desc')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-black flex items-center gap-1 transition">
                                                    {copyStatus === 'desc' ? <AnimatedCheckmark /> : <><CopyIcon /> Copy</>}
                                                </button>
                                            </div>
                                            <div className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-black/40 p-4 rounded-2xl border border-gray-800">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hashtags</label>
                                                    <button onClick={() => handleCopy(youtubeMeta.hashtags.join(' '), 'hashtags')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-black flex items-center gap-1 transition">
                                                        {copyStatus === 'hashtags' ? <AnimatedCheckmark /> : <CopyIcon />}
                                                    </button>
                                                </div>
                                                <div className="text-blue-400 text-[10px] font-mono">{youtubeMeta.hashtags.join(' ')}</div>
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-2xl border border-gray-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Keywords / Tags</label>
                                                    <button onClick={() => handleCopy(youtubeMeta.keywords.join(', '), 'keywords')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-black flex items-center gap-1 transition">
                                                        {copyStatus === 'keywords' ? <AnimatedCheckmark /> : <CopyIcon />}
                                                    </button>
                                                </div>
                                                <div className="text-emerald-400 text-[10px] font-mono truncate">{youtubeMeta.keywords.join(', ')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[1200px] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={(el) => (sceneRefs.current[idx] = el)} className="bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                                <div className="p-4 bg-gray-800/50 flex justify-between items-center border-b border-gray-800">
                                    <span className="text-xs font-black text-cyan-400">SENSE {scene.sceneNumber}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(scene.consistentContext, `p-${idx}`)} className={`p-2 rounded-lg bg-gray-900 border border-gray-700 transition ${copyStatus === `p-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}>
                                            {copyStatus === `p-${idx}` ? <AnimatedCheckmark className="text-green-500" /> : <CopyIcon />}
                                        </button>
                                        <button onClick={() => {
                                            const data = { sense: scene.sceneNumber, action: scene.action, prompt: scene.consistentContext };
                                            handleCopy(JSON.stringify(data), `json-${idx}`);
                                        }} className={`p-2 rounded-lg bg-gray-900 border border-gray-700 transition ${copyStatus === `json-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}>
                                            {copyStatus === `json-${idx}` ? <AnimatedCheckmark className="text-green-500" /> : <JsonIcon />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-0">
                                    <div className="aspect-video md:w-1/2 bg-black relative flex items-center justify-center border-r border-gray-800 overflow-hidden">
                                        {scene.imageUrl ? (
                                            <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Render" />
                                        ) : (
                                            <div className="text-center p-4">
                                                {scene.isLoadingImage ? <Spinner className="h-8 w-8 text-cyan-500" /> : <button onClick={() => handleGenerateImage(idx)} className="px-4 py-2 bg-gray-800 text-[10px] text-gray-400 hover:text-white rounded uppercase font-bold">Render Scene</button>}
                                            </div>
                                        )}
                                        {scene.imageUrl && (
                                            <button onClick={() => handleDownload(scene.imageUrl!, scene.sceneNumber)} className="absolute bottom-4 right-4 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-cyan-600 shadow-xl"><DownloadIcon className="h-3 w-3" /></button>
                                        )}
                                    </div>
                                    <div className="p-6 md:w-1/2 flex flex-col justify-center bg-black/20">
                                        <p className="text-gray-300 text-sm italic leading-relaxed font-serif">"{scene.action}"</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {scenes.length === 0 && !isLoading && (
                            <div className="col-span-full py-32 text-center bg-gray-900/20 rounded-[3rem] border-2 border-dashed border-gray-800 flex flex-col items-center justify-center">
                                 <div className="text-8xl mb-6 opacity-5 grayscale">🛠️</div>
                                 <p className="text-xl font-black text-gray-700 uppercase tracking-[0.4em]">Studio Ready</p>
                                 <p className="text-[10px] text-gray-600 mt-4 max-w-sm">Choose a category and blueprint from the left to start your restoration journey.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestorationAsmrGenerator;
