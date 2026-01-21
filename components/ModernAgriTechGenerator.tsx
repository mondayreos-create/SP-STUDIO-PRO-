
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
import { GoogleGenAI, Type } from "@google/genai";

type ImageQuality = 'Low' | 'Medium' | 'High';

const aspectRatios = [
    { label: '16:9 (Landscape)', value: '16:9', icon: '📺' },
    { label: '9:16 (Portrait)', value: '9:16', icon: '📱' },
    { label: '1:1 (Square)', value: '1:1', icon: '🔳' },
    { label: '4:3 (Classic)', value: '4:3', icon: '🖼️' },
    { label: '3:4 (Tall)', value: '3:4', icon: '📐' }
];

const AnimatedCheckmark: React.FC<{className?: string}> = ({className = "w-4 h-4"}) => (
    <svg className={`${className} animate-pop-in`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
    </svg>
);

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

const agriPresets = [
    { label: "Vertical Hydroponics", icon: "🌱", prompt: "Modern Indoor Vertical Farm: Rows of vibrant green lettuce growing in high-tech hydroponic towers. Automated systems with purple-tinted growth lights, mist sprays, and clean white industrial surfaces. 100% Realistic 8k." },
    { label: "Autonomous Harvester", icon: "🛰️", prompt: "High-Tech Autonomous Combine Harvester Swarm: Robotic harvesters working in a vast wheat field at sunset. Sleek metallic design, glowing sensors, drone support. Cinematic golden hour, 8k realism." },
    { label: "AI Mushroom Lab", icon: "🍄", prompt: "Smart Mushroom Bio-Reactor: Transparent climate-controlled pods growing exotic glowing mushrooms. Robotic arms monitoring humidity and spores in a dark, high-tech industrial facility. 100% Realistic." },
    { label: "Drone Pollination", icon: "🐝", prompt: "Robotic bee swarm pollinating a futuristic orchard. Thousands of tiny micro-drones moving with precision between glowing flowers, macro photography focus." },
    { label: "Satellite Crop Monitor", icon: "📡", prompt: "Global precision agriculture hub. Holographic displays showing satellite soil moisture data, orbital views of mega-farms, and high-tech command center aesthetic." },
    { label: "Soil Sensor Web", icon: "🌡️", prompt: "Smart soil monitoring grid. Robotic probes inserting sensors into the earth, underground fiber-optic lighting, and data-driven root health visualization." },
    { label: "Precision Irrigation", icon: "💧", prompt: "Automated smart irrigation system. Laser-guided water jets, micro-mist systems, and solar-powered pump stations in a desert oasis farm." },
    { label: "Vertical Aeroponics", icon: "💨", prompt: "High-tech aeroponic towers. Plants suspended in air, high-pressure nutrient misting systems, and robotic planting arms in a futuristic laboratory." },
    { label: "Lab-Grown Meat", icon: "🥩", prompt: "Cultivated protein bio-factory. High-tech steel vats, clear nutrient pipelines, and robotic quality control in a clinical, futuristic production lab." },
    { label: "AI Pest Control", icon: "🛡️", prompt: "Laser pest control drones. Autonomous tiny drones patrolling greenhouse aisles, using AI to detect and neutralize insects with precision light beams." },
    { label: "Robot Bee Swarm", icon: "🐝", prompt: "Bionic pollination. Thousands of metallic micro-bees with translucent wings working in a futuristic greenhouse, high-speed macro detail." },
    { label: "CRISPR Lab Crops", icon: "🧬", prompt: "Genetic optimization facility. Scientists and robots working on neon-glowing crops in a cleanroom, DNA sequence holographic projections." },
    { label: "Floating Ocean Farm", icon: "🌊", prompt: "Autonomous maritime agriculture. Giant circular floating farm pods on the open ocean, harvesting seaweed and salt-resistant crops." },
    { label: "Martian Greenhouses", icon: "🚀", prompt: "Agriculture on Mars. Geodesic glass domes on red sand, high-tech life support systems, and automated planters growing Earth-like greenery." },
    { label: "Underground Fungi", icon: "🌑", prompt: "Subterranean smart farm. AI-controlled darkness, bioluminescent indicator lights, and massive automated racks of premium mushrooms." },
    { label: "Automated Seed Planter", icon: "🚜", prompt: "Next-gen autonomous seeder. A sleek carbon-fiber vehicle with dozens of robotic planter arms working in a perfectly flat grid field." },
    { label: "Laser Weeding", icon: "🔦", prompt: "Autonomous weed neutralization. Large robotic platforms using high-power lasers to vaporize weeds between crop rows without chemicals." },
    { label: "Smart Storage Silo", icon: "🏢", prompt: "Futuristic grain storage complex. Huge glowing silver silos with internal robotic cleaners and AI-driven quality management systems." },
    { label: "Data-Driven Harvest", icon: "📊", prompt: "The digital harvest. Automated trucks moving across fields while holographic data overlays show yield and moisture levels in real-time." },
    { label: "Molecular Farming", icon: "🔬", prompt: "Extracting medicine from plants. High-tech laboratory processing line where automated presses extract specialized proteins from bio-engineered leaves." }
];

const loadingMessages = [
  "Calibrating crop sensors...",
  "Syncing satellite data...",
  "Powering up agri-bots...",
  "Rendering 8K plant cells...",
  "Simulating growth cycle...",
  "Lighting the lab floor...",
  "Adjusting soil nutrients...",
  "Finalizing harvest algorithms..."
];

const RenderLoadingOverlay: React.FC<{ progress: number; messageIndex: number }> = ({ progress, messageIndex }) => (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10 animate-fade-in p-4 text-center">
        <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
        </div>
        <h4 className="text-white font-bold text-xs mb-2 animate-pulse uppercase tracking-widest">{loadingMessages[messageIndex % loadingMessages.length]}</h4>
        <div className="w-full max-w-[120px] bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden border border-gray-700">
            <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">{Math.round(progress)}% Complete</span>
    </div>
);

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoading: boolean;
}

const ModernAgriTechGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [concept, setConcept] = useState(agriPresets[0].prompt);
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

    // Thumbnail State
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [thumbnailRatio, setThumbnailRatio] = useState('16:9');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isGeneratingThumbnailIdea, setIsGeneratingThumbnailIdea] = useState(false);

    const [simulatedProgress, setSimulatedProgress] = useState<Record<number, number>>({});
    const [simulatedMessageIdx, setSimulatedMessageIdx] = useState<Record<number, number>>({});

    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useAutoSave('modern-agri-tech-v5', { concept, sceneCount, selectedRatio, scenes, thumbnailUrl, thumbnailPrompt, thumbnailRatio, youtubeMeta });

    useEffect(() => {
        const handleLoad = (e: any) => {
            const project = e.detail;
            if (project.tool === 'modern-agri-tech' && project.data) {
                const d = project.data;
                if (d.concept) setConcept(d.concept);
                if (d.sceneCount) setSceneCount(d.sceneCount);
                if (d.selectedRatio) setSelectedRatio(d.selectedRatio);
                if (d.scenes) setScenes(d.scenes);
                if (d.thumbnailUrl) setThumbnailUrl(d.thumbnailUrl);
                if (d.thumbnailPrompt) setThumbnailPrompt(d.thumbnailPrompt);
                if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
                setError(null);
            }
        };
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => window.removeEventListener('LOAD_PROJECT', handleLoad);
    }, []);

    const handleClearProject = () => {
        if (!window.confirm("Clear all production data?")) return;
        setConcept(agriPresets[0].prompt);
        setScenes([]);
        setThumbnailUrl(null);
        setYoutubeMeta(null);
        setError(null);
    };

    useEffect(() => {
        if (!thumbnailPrompt && concept) {
            setThumbnailPrompt(`Viral YouTube Thumbnail for Agri-Tech: ${concept.substring(0, 100)}. Professional 3D render, high-tech vibe, 1K resolution.`);
        }
    }, [concept, thumbnailPrompt]);

    const handleGetNewIdeas = async () => {
        setIsGeneratingIdeas(true);
        setError(null);
        try {
            const ideas = await generateStoryIdeas("Create 5 futuristic agri-tech concepts. Focus on robotics, bio-engineering, or space farming.", false);
            setStoryIdeas(ideas);
        } catch (err) {
            setError("Failed to generate ideas.");
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    const handleUseIdea = (idea: StoryIdea) => {
        setConcept(`Agri-Tech Project: ${idea.title}\n\nVision: ${idea.summary}\n\n100% Realistic futuristic tech aesthetic.`);
        setThumbnailPrompt(`Viral YouTube Thumbnail for Agri-Tech: ${idea.title}. Professional 3D render, high-tech vibe, 8k.`);
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
                contents: `As a professional YouTube Thumbnail artist, create one highly detailed, cinematic, and viral-worthy image generation prompt for an advanced agri-tech/farming video: ${concept}. Focus on organic textures, robotic high-tech systems, and dramatic natural lighting. Output ONLY the prompt text, no extra words.`
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
            const prompt = `MODERN AGRI-TECH PRODUCTION SCRIPT. Concept: ${concept}. Task: Architect exactly ${sceneCount} logical industrial steps. Style: High-end futuristic industrial cinematography, 100% realistic.`;
            const result = await generateConsistentStoryScript(prompt, sceneCount);
            setScenes(result.map(s => ({ ...s, isLoading: false })));
        } catch (err) { setError("Script failed."); } finally { 
            setIsLoading(false); 
        }
    };

    const handleGenerateShorts = async () => {
        if (!concept.trim()) return;
        setIsLoading(true);
        setIsGeneratingShorts(true);
        setError(null);
        setScenes([]);
        try {
            const prompt = `SHORT VIRAL AGRI-TECH PRODUCTION SCRIPT. Concept: ${concept}. Task: Generate EXACTLY 6 senses for a fast-paced tech loop. Style: Professional industrial 4K cinematography, 100% realistic.`;
            const result = await generateConsistentStoryScript(prompt, 6);
            setScenes(result.map(s => ({ ...s, isLoading: false })));
        } catch (err) { setError("Shorts failed."); } finally { 
            setIsLoading(false); 
            setIsGeneratingShorts(false); 
        }
    };

    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;
        setIsGeneratingThumbnail(true);
        setError(null);
        try {
            // Standardizing to 16:9 and 1K resolution (Low quality)
            const url = await generateImage(thumbnailPrompt, '16:9', 'Low');
            setThumbnailUrl(url);
        } catch (err) { 
            console.error(err);
            setError(err instanceof Error ? err.message : "Thumbnail generation failed."); 
        } finally { 
            setIsGeneratingThumbnail(false); 
        }
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
            const renderPrompt = `100% Realistic professional agri-tech photography, 8k. Action: ${scene.action}. Environment: ${scene.consistentContext}. No text. Cinematic lighting, high speed shutter detail.`;
            const url = await generateImage(renderPrompt, selectedRatio as any);
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
            const ctx = `Agri-Tech: ${concept}\nScenes:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(concept.substring(0, 50), ctx, 'Modern Agri-Tech');
            setYoutubeMeta(meta);
        } catch (err) { setError("Meta failed."); } finally { setIsGeneratingMeta(false); }
    };

    const handleCopyText = (text: string, id: string) => {
        if (text) navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllPrompts = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}: ${s.consistentContext}`).join('\n\n');
        handleCopyText(text, 'prompts');
    };

    const handleDownloadAllArt = () => {
        if (scenes.length === 0) return;
        scenes.forEach((s, i) => {
            if (s.imageUrl) {
                setTimeout(() => handleDownloadSingle(s.imageUrl!, s.sceneNumber), i * 300);
            }
        });
        handleCopyText('', 'all-download');
    };

    const handleCopyCompactJson = () => {
        if (scenes.length === 0) return;
        const compact = scenes.map(s => ({
            p: s.sceneNumber,
            a: s.action,
            pr: s.consistentContext
        }));
        handleCopyText(JSON.stringify(compact, null, 0), 'compact-json');
    };

    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Agri_Scene_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progressPercent = scenes.length > 0 ? Math.round((scenes.filter(s => s.imageUrl).length / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in text-gray-100 pb-20 relative">
             {/* Main Processing Signal removed per request */}

            <div className="w-full flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 uppercase tracking-tighter leading-none">Agri-Tech Lab</h2>
                    <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full shadow-lg">
                        <div className={`w-2 h-2 rounded-full ${isRenderingAll ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'} `}></div>
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{isRenderingAll ? 'Lab Online' : 'Lab Standby'}</span>
                    </div>
                </div>
                <button onClick={handleClearProject} className="p-2.5 bg-red-950/20 text-red-500 border border-red-900/30 rounded-xl hover:bg-red-900 transition-all px-4 py-2 font-bold uppercase text-xs">Clear Project</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Blueprints & Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1a2e26] p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl backdrop-blur-xl h-fit">
                        <div className="space-y-4">
                            <div className="bg-black/40 p-4 rounded-xl border border-gray-700 shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Agri-Tech Blueprints</label>
                                    <button onClick={handleGetNewIdeas} disabled={isGeneratingIdeas} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase flex items-center gap-1">
                                        {isGeneratingIdeas ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon />} Get New Idea
                                    </button>
                                </div>

                                {storyIdeas.length > 0 && (
                                    <div className="space-y-2 mb-4 animate-fade-in max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {storyIdeas.map((idea, idx) => (
                                            <button key={idx} onClick={() => handleUseIdea(idea)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-emerald-500 transition">
                                                <div className="text-[10px] font-bold text-white mb-0.5">{idea.title}</div>
                                                <div className="text-[9px] text-gray-500 line-clamp-1">{idea.summary}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-2 mb-6 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                                    {agriPresets.map((opt) => (
                                        <button key={opt.label} onClick={() => setConcept(opt.prompt)} className={`p-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-3 border ${concept === opt.prompt ? 'bg-emerald-900/40 border-emerald-500 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                                            <span className="text-xl">{opt.icon}</span><span className="truncate">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Describe your farm vision..." className="w-full bg-[#0f172a] border border-gray-700 rounded-2xl p-4 text-white text-xs h-32 resize-none outline-none transition-all placeholder-gray-800" />
                            
                            {/* Aspect Ratio UI */}
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 shadow-inner">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Aspect Ratio (Frame Size)</label>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Scenes</label><input type="number" min="1" max="50" value={sceneCount} onChange={e => setSceneCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-2 text-center font-bold text-sm" /></div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={handleGenerateScript} disabled={isLoading} className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                                    {isLoading && !isGeneratingShorts ? <Spinner className="m-auto" /> : 'Full Storyboard'}
                                </button>
                                <button onClick={handleGenerateShorts} disabled={isLoading} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                                    {isLoading && isGeneratingShorts ? <Spinner className="m-auto" /> : 'Fast Shorts'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Area */}
                <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
                    {/* Thumbnail Studio Section */}
                    <div className="bg-gray-800/40 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                <span className="text-2xl">🖼️</span> Thumbnail Studio
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={handleGenerateThumbnailIdea} disabled={isGeneratingThumbnailIdea} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg flex items-center gap-2">
                                    {isGeneratingThumbnailIdea ? <Spinner className="h-3 w-3 m-0" /> : <SparklesIcon />} Generate Idea
                                </button>
                                {thumbnailUrl && (
                                    <button onClick={() => { const a = document.createElement('a'); a.href = thumbnailUrl; a.download = `Agri_Thumbnail.png`; a.click(); }} className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all shadow-lg"><DownloadIcon /></button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="aspect-video bg-black rounded-2xl border border-gray-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                                {thumbnailUrl ? (
                                    <img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                                ) : (
                                    <div className="text-center text-gray-700">
                                        <div className="text-4xl mb-2 opacity-20">🛰️</div>
                                        <p className="text-[10px] uppercase font-black tracking-widest">Preview Area</p>
                                    </div>
                                )}
                                {isGeneratingThumbnail && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <Spinner className="h-10 w-10 text-cyan-500 mb-4" />
                                        <span className="text-[10px] font-black text-cyan-400 animate-pulse">RENDERING 1K...</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col justify-between">
                                <div className="space-y-4">
                                    <textarea 
                                        value={thumbnailPrompt} 
                                        onChange={(e) => setThumbnailPrompt(e.target.value)}
                                        placeholder="Customize your viral thumbnail prompt..."
                                        className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white text-xs h-36 resize-none outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <button 
                                    onClick={handleGenerateThumbnail} 
                                    disabled={isGeneratingThumbnail || !thumbnailPrompt}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-xl uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isGeneratingThumbnail ? <Spinner className="h-4 w-4 m-0" /> : <SparklesIcon />} Generate Thumbnail
                                </button>
                            </div>
                        </div>
                    </div>

                    {scenes.length > 0 && (
                        <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Build Pipeline: {progressPercent}%</span>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={handleGenerateSEOInfo} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase transition shadow-lg flex items-center gap-2">{isGeneratingMeta ? <Spinner className="h-3 w-3 m-0" /> : <YouTubeIcon />} YT Info</button>
                                <button onClick={handleCopyAllPrompts} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'prompts' ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                    {copyStatus === 'prompts' ? '✓ Copied' : <><CopyIcon /> Copy All Prompts</>}
                                </button>
                                <button onClick={handleDownloadAllArt} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'all-download' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                    {copyStatus === 'all-download' ? '✓ Downloaded' : <><DownloadIcon /> Download All Art</>}
                                </button>
                                <button 
                                    onClick={isRenderingAll ? () => { stopSignal.current = true; setIsRenderingAll(false); } : handleRenderAll} 
                                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white' : 'bg-cyan-500 text-white'}`}
                                >
                                    {isRenderingAll ? 'Stop Render' : 'Gen All Art'}
                                </button>
                                <button onClick={handleCopyCompactJson} className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${copyStatus === 'compact-json' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>{copyStatus === 'compact-json' ? '✓ COMPACT READY' : 'COMPACT JSON'}</button>
                            </div>
                        </div>
                    )}

                    {youtubeMeta && (
                        <div className="bg-gray-900 p-6 rounded-[2.5rem] border border-red-500/30 animate-fade-in space-y-6 shadow-2xl relative overflow-hidden mb-6">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            <div className="flex items-center gap-2 text-red-500 mb-2 font-black uppercase text-sm tracking-widest"><YouTubeIcon /> SEO HUB (DISTRIBUTION KIT)</div>
                            <div className="space-y-4 text-xs font-bold">
                                <div>
                                    <label className="text-gray-500 uppercase block mb-1">Viral Title</label>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white text-sm font-bold flex justify-between items-center">
                                        {youtubeMeta.title} 
                                        <button onClick={() => handleCopyText(youtubeMeta.title, 'yt-t')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-t' ? <AnimatedCheckmark /> : 'Copy'}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-500 uppercase block mb-1">SEO Description</label>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic">{youtubeMeta.description}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-500 uppercase block mb-1">Hashtags</label>
                                        <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-blue-400 flex justify-between items-center">
                                            <span className="truncate">{youtubeMeta.hashtags.join(' ')}</span> 
                                            <button onClick={() => handleCopyText(youtubeMeta.hashtags.join(' '), 'yt-h')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-h' ? <AnimatedCheckmark /> : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 uppercase block mb-1">Keywords / Tags</label>
                                        <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-emerald-400 flex justify-between items-center">
                                            <span className="truncate">{youtubeMeta.keywords.join(', ')}</span> 
                                            <button onClick={() => handleCopyText(youtubeMeta.keywords.join(', '), 'yt-k')} className="text-cyan-400 hover:text-white transition">{copyStatus === 'yt-k' ? <AnimatedCheckmark /> : 'Copy'}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[1200px] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.length > 0 ? scenes.map((scene, idx) => (
                            <div key={idx} ref={el => sceneRefs.current[idx] = el} className="bg-gray-800/20 rounded-2xl border border-gray-700 overflow-hidden flex flex-col group shadow-xl hover:border-blue-500/30 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="agri" />
                                            <button 
                                                onClick={() => handleDownloadSingle(scene.imageUrl!, scene.sceneNumber)}
                                                className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-600 shadow-xl"
                                                title="Download Image"
                                            >
                                                <DownloadIcon />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            {!scene.isLoading && <button onClick={() => handleRenderSingle(idx)} className="text-[10px] font-black uppercase text-gray-500 hover:text-white border border-gray-800 px-4 py-2 rounded-full transition-colors">Render Part</button>}
                                        </div>
                                    )}
                                    {scene.isLoading && <RenderLoadingOverlay progress={simulatedProgress[idx] || 0} messageIndex={simulatedMessageIdx[idx] || 0} />}
                                    <div className="absolute top-0 left-0 bg-yellow-400 text-black text-2xl font-black px-5 py-2.5 rounded-br-2xl shadow-[5px_5px_15px_rgba(0,0,0,0.7)] z-10 border-b-2 border-r-2 border-black/10 transition-transform transform active:scale-110">{scene.sceneNumber}</div>
                                </div>
                                <div className="p-4 bg-gradient-to-b from-gray-900 to-black rounded-b-2xl flex flex-col flex-grow">
                                    <p className="text-gray-300 text-xs italic mb-4 min-h-[3em] line-clamp-3 group-hover:line-clamp-none transition-all leading-relaxed font-serif flex-grow">"{scene.action}"</p>
                                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-800">
                                        <button onClick={() => handleCopyText(scene.consistentContext, `prompt-${idx}`)} className={`text-[9px] font-black flex items-center gap-1 uppercase tracking-tighter transition-all ${copyStatus === `prompt-${idx}` ? 'text-green-400 scale-110' : 'text-gray-600 hover:text-cyan-400'}`}><CopyIcon /> {copyStatus === `prompt-${idx}` ? 'COPIED' : 'PROMPT'}</button>
                                        <button onClick={() => handleCopyText(JSON.stringify(scene, null, 2), `json-${idx}`)} className={`text-[9px] font-black uppercase tracking-tighter transition-all ${copyStatus === `json-${idx}` ? 'text-green-400 scale-110' : 'text-cyan-400 hover:text-cyan-300'}`}>
                                            {copyStatus === `json-${idx}` ? '✓ DONE' : <><JsonIcon /> JSON</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 py-20"><span className="text-9xl mb-4">🛰️</span><p className="text-2xl font-black uppercase tracking-[0.5em]">Lab Ready</p></div>
                        )}
                    </div>
                </div>
            </div>
            {error && (
                <div className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-red-900/90 border border-red-700 text-red-200 rounded-xl shadow-2xl text-center font-bold text-sm">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ModernAgriTechGenerator;
