
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateYouTubeMetadata, 
    YouTubeMetadata,
    generateCharacters,
    ImageReference
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import { GoogleGenAI, Type } from "@google/genai";
import { useAutoSave } from '../hooks/useAutoSave.ts';

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
    voiceover?: string;
}

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

const YouTubeIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
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

// COMMENT: Added missing JsonIcon component definition.
const JsonIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const aspectRatios = [
    { label: '16:9 (Landscape)', value: '16:9', icon: '📺' },
    { label: '9:16 (Vertical)', value: '9:16', icon: '📱' },
    { label: '1:1 (Square)', value: '1:1', icon: '🔳' },
    { label: '4:3 (Classic)', value: '4:3', icon: '🖼️' },
    { label: '3:4 (Portrait)', value: '3:4', icon: '📐' }
];

const forestHouseBlueprints = [
    { label: "A-Frame Cabin", icon: "📐", prompt: "Building House in Forest (ASMR): Construction of a luxury wooden A-frame house deep in the forest. សាងសង់ផ្ទះពីចាស់មកថ្មី ក្នុងព្រៃ។ Focus on satisfying high-detail ASMR steps: clearing the ground, building the wood frame, installing glass windows, and interior decoration." },
    { label: "Tree Mansion", icon: "🌳", prompt: "Building a massive multi-level treehouse mansion wrapped around an ancient oak tree. ផ្ទះលើដើមឈើធំ។ Focus on woodworking ASMR: rope bridge assembly, wooden railing installation, and cozy leaf-filtered lighting." },
    { label: "Modern Glass Pod", icon: "🛸", prompt: "A futuristic round glass forest pod house being assembled. ផ្ទះកញ្ចក់ទំនើបក្នុងព្រៃ។ Focus on precision engineering: robotic arms placing glass panels, glowing interior lights, and 100% realistic reflection of nature." },
    { label: "Stone & Log Hut", icon: "🪨", prompt: "Building a traditional stone and log forest sanctuary. ផ្ទះថ្មនឹងឈើ។ Focus on the heavy lifting: placing boulders, carving thick logs, and thatched roof layering." },
    { label: "Hobbit Hill Hole", icon: "🕳️", prompt: "Constructing a cozy underground Hobbit hole in a grassy forest hill. Digging into the earth, building a round wooden door, stone arched entrance, and lush green garden landscaping. Satisfying earthy ASMR." },
    { label: "Mirror House Prism", icon: "🪞", prompt: "The Invisible House: Building a reflective mirror-walled cabin in a snowy forest. Installing giant mirrored panels that reflect the surrounding pine trees. Ultra-minimalist and futuristic architecture." },
    { label: "Bamboo Skyscraper", icon: "🎋", prompt: "Miniature Bamboo Skyscraper build in a tropical forest. Using ancient weaving techniques, thin bamboo poles, and rope lashing. High-speed assembly of multiple floors with a leaf-thatched peak." },
    { label: "Abandoned Temple Home", icon: "⛩️", prompt: "Restoring an ancient mossy forest temple ruins into a luxury modern residence. Cleaning stone carvings, installing hidden lighting, and adding glass floors over old stone foundations." },
    { label: "Waterfall Cliff Villa", icon: "🌊", prompt: "Building a luxury villa cantilevered over a forest waterfall. Steel support beams anchored into the rock, floor-to-ceiling glass, and a wrap-around wooden deck. Atmospheric mist and wet rock textures." },
    { label: "Mushroom Fairy Hut", icon: "🍄", prompt: "DIY Fairy-tale Mushroom Cottage build. Sculpting a rounded concrete stem, painting it red with white spots, and creating a cozy wooden interior with curved windows and doors." },
    { label: "Bio-Dome Greenhouse", icon: "🌐", prompt: "Constructing a geodesic bio-dome home in a rainforest clearing. Hexagonal glass panels, exotic plant interior, and high-tech climate control systems. High-gloss steel frame." },
    { label: "Shipping Container Hideout", icon: "📦", prompt: "Converting two rusty shipping containers into an off-grid forest hideout. Cutting metal doors, installing solar panels, and cladding the exterior with reclaimed wood planks." },
    { label: "Floating River Cabin", icon: "🛶", prompt: "Building a floating wooden cabin on a calm forest river. Assembling the pontoon base, building the cedar wood walls, and adding a small deck for fishing. Water reflections and rhythmic movement." },
    { label: "Victorian Forest Manor", icon: "🏰", prompt: "Building a miniature Victorian-style manor in a dark, misty forest. Intricate gingerbread trim, tall pointed gables, and glowing gas-lantern style lighting. Deep mysterious atmosphere." },
    { label: "Observation Tower", icon: "🔭", prompt: "Constructing a 30-foot wooden observation tower residence. Building the spiral staircase, the elevated living quarters, and the 360-degree glass windows. 8k forest canopy views." },
    { label: "Modular Hex Pod", icon: "🐝", prompt: "Assembling a modular hexagonal forest unit. Pre-fabricated panels being clicked together by a small crane. High-tech, efficient, and minimalist design in a redwood forest." },
    { label: "Khmer Stilt House", icon: "🇰🇭", prompt: "Building a traditional Khmer wooden stilt house in a rural forest setting. Carving decorative pillars, assembling the raised floor, and weaving the palm-leaf roof. Authentic cultural architecture." },
    { label: "Underground Bunker Home", icon: "🛡️", prompt: "Converting an old concrete forest bunker into a luxury survivalist home. Sandblasting concrete, installing blast-proof glass, and adding modern neon interior lighting. High security aesthetic." },
    { label: "Geometric Prism Cabin", icon: "📐", prompt: "Constructing a sharp geometric prism cabin in a rocky forest clearing. Dark charcoal wood siding, triangular windows, and a hidden entrance. Stealth architecture style." },
    { label: "Ancient Banyan House", icon: "🧘", prompt: "Building a meditation retreat inside the roots of a massive Banyan tree. Using the natural root structure as walls, adding a wooden floor, and soft hanging paper lanterns. Zen atmosphere." },
    { label: "Lakeside Deck House", icon: "🎣", prompt: "Building a large wrap-around wooden deck and small cabin over a forest lake. Installing underwater support pilings, cedar planks, and an outdoor fire pit area. Water ripples and nature focus." },
    { label: "Steampunk Outpost", icon: "⚙️", prompt: "Building a steampunk-inspired forest outpost. Brass pipes, copper roofing, steam-venting chimneys, and large clockwork gears visible on the exterior walls. Gritty industrial nature aesthetic." },
    { label: "Tiny House on Wheels", icon: "🚐", prompt: "Building a luxury forest tiny house on a trailer. Wood siding, loft bed with skylight, and solar powered systems. Parked in a sun-drenched forest meadow." },
    { label: "Spiral Tree Tower", icon: "🐚", prompt: "A spiral-shaped wooden tower home wrapping around a giant pine tree. Continuous winding balcony, high-detail wood grain, and glowing warm interior light. Masterpiece craft." },
    { label: "Log Cabin Mansion", icon: "🪵", prompt: "Building a massive luxury log mansion using whole pine trunks. Debarking logs, chainsaw carving notches, and the satisfying process of stacking the heavy walls. Fireplace and elk-horn decor." },
    { label: "Japanese Tea House", icon: "🍵", prompt: "Constructing a peaceful Japanese Sukiya-style tea house in a bamboo grove. Sliding paper doors, tatami mat installation, and a stone path garden. High-detail natural textures." },
    { label: "Forest Library Pod", icon: "📖", prompt: "Building a secluded glass-walled library pod for reading. Surrounded by books and trees. Focus on quiet solitude, soft lighting, and high-end built-in bookshelves." },
    { label: "Eco-Earthship Build", icon: "♻️", prompt: "Building a sustainable Earthship home using rammed earth and recycled tires in a forest. Colorful glass bottle walls, natural plaster, and indoor greenhouse systems. Bio-architecture." },
    { label: "Nordic Winter Lodge", icon: "⛷️", prompt: "Constructing a Nordic-style dark wood lodge during winter. Floor-to-ceiling windows, outdoor hot tub, and heavy fur interior decor. Contrast of cold blue snow and orange firelight." },
    { label: "Tree Canopy Walkway", icon: "🌉", prompt: "Building a series of interconnected suspended pods in the high tree canopy. Connecting them with rope bridges and spiral net stairs. High-altitude construction ASMR." }
];

const BuildingForestHouseGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [masterPrompt, setMasterPrompt] = useState(forestHouseBlueprints[0].prompt);
    const [sceneCount, setSceneCount] = useState(15);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isRenderingAll, setIsRenderingAll] = useState(false);
    const [noVoiceover, setNoVoiceover] = useState(true);
    const [selectedRatio, setSelectedRatio] = useState('16:9');
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [visualReferences, setVisualReferences] = useState<ImageReference[]>([]);
    const [isGeneratingExtras, setIsGeneratingExtras] = useState(false);
    const [displayPresets, setDisplayPresets] = useState(forestHouseBlueprints);

    // Thumbnail Studio States
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

    const stopSignal = useRef(false);
    const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useAutoSave('building-forest-house-v2', { masterPrompt, sceneCount, scenes, youtubeMeta, visualReferences, selectedPreset, selectedRatio, thumbnailPrompt, thumbnailUrl });

    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'building-forest-house') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'building-forest-house',
                category: 'vip',
                title: "Forest House Build",
                data: { masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta, visualReferences, selectedPreset, selectedRatio, thumbnailPrompt, thumbnailUrl }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
            loadLocalHistory();
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'building-forest-house') return;
            const d = e.detail.data;
            if (d.masterPrompt) setMasterPrompt(d.masterPrompt);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.scenes) setScenes(d.scenes);
            if (d.noVoiceover !== undefined) setNoVoiceover(d.noVoiceover);
            if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
            if (d.visualReferences) setVisualReferences(d.visualReferences);
            if (d.selectedPreset) setSelectedPreset(d.selectedPreset);
            if (d.selectedRatio) setSelectedRatio(d.selectedRatio);
            if (d.thumbnailPrompt) setThumbnailPrompt(d.thumbnailPrompt);
            if (d.thumbnailUrl) setThumbnailUrl(d.thumbnailUrl);
            setShowHistory(false);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [masterPrompt, sceneCount, scenes, noVoiceover, youtubeMeta, visualReferences, selectedPreset, selectedRatio, thumbnailPrompt, thumbnailUrl]);

    const loadLocalHistory = useCallback(() => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'building-forest-house');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        loadLocalHistory();
    }, [loadLocalHistory]);

    const handleReloadHistory = (project: any) => {
        window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: project }));
        setShowHistory(false);
    };

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedPreset(val);
        setMasterPrompt(val);
        setScenes([]);
        setYoutubeMeta(null);
        setThumbnailUrl(null);
        // Auto update thumbnail prompt based on theme
        setThumbnailPrompt(`Viral YouTube Thumbnail: Building a ${val.split(':')[0]} in the Forest from 0% to 100%. High contrast, professional architectural photography, sunlight rays through trees, 8k render.`);
    };

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) return;
        setIsGeneratingScript(true);
        setError(null);
        setScenes([]);
        setYoutubeMeta(null);
        try {
            const result = await generateConsistentStoryScript(
                `FOREST HOUSE BUILDING ASMR. Context: ${masterPrompt}. Style: 100% Realistic professional nature photography.`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) { setError("Failed to generate script."); } finally { setIsGeneratingScript(false); }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const prompt = `100% Realistic professional architectural photography, 8k. Action: ${scene.action}. Environment: ${scene.consistentContext}. No text. Cinematic lighting.`;
            const url = await generateImage(prompt, selectedRatio);
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s));
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
            if (i < scenes.length - 1) await new Promise(r => setTimeout(r, 1200));
        }
        setIsRenderingAll(false);
    };

    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;
        setIsGeneratingThumbnail(true);
        try {
            const url = await generateImage(thumbnailPrompt, selectedRatio, 'High');
            setThumbnailUrl(url);
        } catch (err) { setError("Thumbnail failed."); } finally { setIsGeneratingThumbnail(false); }
    };

    const handleGenerateYouTubeInfo = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const context = `Forest Project: ${masterPrompt}\nScenes:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(masterPrompt.substring(0, 50), context, 'Forest Construction');
            setYoutubeMeta(meta);
        } catch (err) { setError("Meta failed."); } finally { setIsGeneratingMeta(false); }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    // COMMENT: Implemented missing handleCopyJson function.
    const handleCopyJson = (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        const data = {
            scene: scene.sceneNumber,
            action: scene.action,
            prompt: scene.consistentContext
        };
        handleCopy(JSON.stringify(data, null, 2), `json-${index}`);
    };

    const handleDownloadSingle = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `ForestHouse_Sense_${num}.png`;
        link.click();
    };

    const progressPercent = scenes.length > 0 ? Math.round((scenes.filter(s => s.imageUrl).length / scenes.length) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in text-gray-100 pb-24">
             <div className="w-full flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 uppercase tracking-tighter">សាងសង់ផ្ទះក្នុងព្រៃ</h2>
                <div className="flex gap-2">
                    <button onClick={() => { loadLocalHistory(); setShowHistory(!showHistory); }} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border transition-all ${showHistory ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-[#1e293b] border-gray-700'}`}><HistoryIcon /> History</button>
                    <button onClick={() => { setScenes([]); setMasterPrompt(forestHouseBlueprints[0].prompt); setThumbnailUrl(null); setYoutubeMeta(null); }} className="p-2.5 bg-red-900/40 text-red-500 border border-red-800 rounded-xl hover:bg-red-900 transition-all"><TrashIcon /></button>
                </div>
            </div>

            {showHistory && (
                <div className="w-full bg-[#0f172a]/95 border-2 border-indigo-500/50 p-6 rounded-3xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5" /> Forest Build History Vault
                        </h4>
                        <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-3xl transition-colors">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto custom-scrollbar pr-3">
                        {localHistory.length > 0 ? (
                            localHistory.map((project, idx) => (
                                <div key={project.id} onClick={() => handleReloadHistory(project)} className="bg-[#1e293b]/60 hover:bg-[#1e293b] border border-gray-700 p-5 rounded-2xl cursor-pointer transition-all group shadow-inner">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2.5 py-1 rounded-full font-black border border-indigo-800/50 uppercase tracking-tighter">#{localHistory.length - idx}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">{project.data.masterPrompt || "Untitled Project"}</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-1 italic">{project.data.sceneCount} Senses</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">Click to Reload ➜</span></div>
                                </div>
                            ))
                        ) : ( <div className="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div> )}
                    </div>
                </div>
            )}
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/80 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl backdrop-blur-sm">
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                             <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1 mb-3">
                                <SparklesIcon /> Choose 30 Contents More
                            </label>
                            <select value={selectedPreset} onChange={handlePresetChange} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none">
                                <option value="">-- Select a Theme --</option>
                                {displayPresets.map((p, i) => <option key={i} value={p.prompt}>{i + 1}. {p.label}</option>)}
                            </select>
                        </div>

                        {/* Aspect Ratio Picker */}
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 shadow-inner">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Aspect Ratio (Frame Size)</label>
                            <div className="grid grid-cols-5 gap-2">
                                {aspectRatios.map(r => (
                                    <button
                                        key={r.value}
                                        onClick={() => setSelectedRatio(r.value)}
                                        className={`p-2 rounded-lg border text-[10px] font-black transition-all flex flex-col items-center gap-1 ${selectedRatio === r.value ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                    >
                                        <span className="text-sm">{r.icon}</span>
                                        {r.value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea value={masterPrompt} onChange={(e) => setMasterPrompt(e.target.value)} placeholder="Describe build mission..." className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-48 resize-none focus:ring-2 focus:ring-amber-500 outline-none shadow-inner text-sm leading-relaxed" />
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Total Senses</label><input type="number" min="1" max="100" value={sceneCount} onChange={e => setSceneCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))} className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                             <div className="flex flex-col justify-end"><label className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={noVoiceover} onChange={e => setNoVoiceover(e.target.checked)} className="w-4 h-4 text-amber-600 bg-gray-900 border-gray-600 rounded focus:ring-amber-500" /><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">No VO</span></label></div>
                        </div>

                        <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-700 hover:brightness-110 text-white font-black rounded-xl shadow-xl transition transform active:scale-[0.98] disabled:opacity-50 text-lg flex items-center justify-center gap-3 uppercase tracking-widest">
                            {isGeneratingScript ? <Spinner /> : '📐 Architect Senses'}
                        </button>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Status & SEO Kit */}
                    {scenes.length > 0 && (
                        <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 shadow-2xl mb-4 animate-fade-in flex flex-col gap-4">
                            <div className="flex justify-between items-center px-4">
                                <span className="text-xl font-black text-amber-500">Pipeline Progress: {progressPercent}%</span>
                                <div className="flex gap-2">
                                    <button onClick={handleGenerateYouTubeInfo} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg flex items-center gap-2">{isGeneratingMeta ? <Spinner className="h-3 w-3 m-0" /> : <YouTubeIcon />} SEO Kit</button>
                                    <button onClick={isRenderingAll ? () => { stopSignal.current = true; } : handleRenderAll} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition shadow-lg flex items-center gap-2 ${isRenderingAll ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>{isRenderingAll ? 'STOP' : 'GEN ART'}</button>
                                </div>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700 mx-auto max-w-[98%]"><div className={`h-full bg-gradient-to-r from-amber-600 to-orange-400 transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.5)] ${isRenderingAll ? 'animate-pulse' : ''}`} style={{ width: `${progressPercent}%` }}></div></div>
                        </div>
                    )}

                    {/* Thumbnail Studio */}
                    <div className="bg-gray-800/40 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                <span className="text-2xl">🖼️</span> Thumbnail Studio
                            </h3>
                            {thumbnailUrl && (
                                <button onClick={() => { const a = document.createElement('a'); a.href = thumbnailUrl; a.download = `ForestHouse_Thumbnail.png`; a.click(); }} className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all shadow-lg"><DownloadIcon /></button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="aspect-video bg-black rounded-2xl border border-gray-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                                {thumbnailUrl ? (
                                    <img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                                ) : (
                                    <div className="text-center text-gray-700">
                                        <div className="text-4xl mb-2 opacity-20">🌲</div>
                                        <p className="text-[10px] uppercase font-black tracking-widest">Preview Area</p>
                                    </div>
                                )}
                                {isGeneratingThumbnail && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <Spinner className="h-10 w-10 text-amber-500 mb-2" />
                                        <span className="text-[10px] font-black text-amber-500 animate-pulse">RENDERING 4K...</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col justify-between">
                                <div className="space-y-4">
                                    <textarea value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} placeholder="Customize your viral thumbnail prompt..." className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white text-xs h-24 resize-none outline-none focus:ring-1 focus:ring-amber-500" />
                                </div>
                                <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail || !thumbnailPrompt} className="w-full mt-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-black rounded-xl uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {isGeneratingThumbnail ? <Spinner className="h-4 w-4 m-0" /> : <SparklesIcon />} Generate Thumbnail
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* YouTube SEO Display */}
                    {youtubeMeta && (
                        <div className="bg-gray-900 p-6 rounded-[2.5rem] border border-red-500/30 animate-fade-in space-y-6 shadow-2xl relative overflow-hidden mb-6">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            <div className="flex items-center gap-2 text-red-500 mb-2 font-black uppercase text-sm tracking-widest"><YouTubeIcon /> YouTube Distribution Kit</div>
                            <div className="space-y-4 text-xs font-bold">
                                <div><label className="text-gray-500 uppercase block mb-1">Viral Title Post Video</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white flex justify-between items-center">{youtubeMeta.title} <button onClick={() => handleCopy(youtubeMeta.title, 'yt-t')} className="text-cyan-400 hover:text-white">{copyStatus === 'yt-t' ? '✓' : 'Copy'}</button></div></div>
                                <div><label className="text-gray-500 uppercase block mb-1">Description For YouTube</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 whitespace-pre-wrap italic font-serif h-32 overflow-y-auto custom-scrollbar">{youtubeMeta.description}</div></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-gray-500 uppercase block mb-1">Hashtags</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-blue-400">{youtubeMeta.hashtags.join(' ')}</div></div>
                                    <div><label className="text-gray-500 uppercase block mb-1">Keywords / Tags (YT Studio)</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-emerald-400 line-clamp-3">{youtubeMeta.keywords.join(', ')}</div></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} ref={el => sceneRefs.current[idx] = el} className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-amber-500/50 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="forest house" /> : (
                                        <div className="flex flex-col items-center gap-3">
                                            {scene.isLoadingImage ? <><Spinner className="h-10 w-10 text-amber-500" /><span className="text-[10px] text-gray-500 font-black uppercase animate-pulse">Rendering...</span></> : <button onClick={() => handleGenerateImage(idx)} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-full text-[10px] uppercase shadow-lg transition-all">Render Art</button>}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-700 shadow-md uppercase">SENSE {scene.sceneNumber}</div>
                                    {scene.imageUrl && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                            <button onClick={() => handleDownloadSingle(scene.imageUrl!, scene.sceneNumber)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110 shadow-xl"><DownloadIcon /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex-grow flex flex-col bg-gradient-to-b from-gray-900 to-black">
                                    <p className="text-gray-300 text-xs italic border-l-2 border-amber-500 pl-3 mb-6">"{scene.action}"</p>
                                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-800">
                                        <button onClick={() => handleCopy(scene.consistentContext, `p-${idx}`)} className="text-[10px] text-gray-500 hover:text-white transition font-black uppercase flex items-center gap-2">{copyStatus === `p-${idx}` ? '✓' : <CopyIcon />} PROMPT</button>
                                        {/* COMMENT: Fixed handleCopyJson to function call. */}
                                        <button onClick={() => handleCopyJson(idx)} className="text-[10px] text-orange-400 hover:text-orange-300 transition font-black uppercase flex items-center gap-2">{copyStatus === `json-${idx}` ? '✓' : <JsonIcon />} JSON</button>
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

export default BuildingForestHouseGenerator;
