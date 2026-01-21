
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage,
    generateYouTubeMetadata,
    generatePromptFromImage,
    generatePromptFromVideo,
    YouTubeMetadata,
    ImageReference
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

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
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const BoltIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
);

const styleOptions = [
    { name: '100% Realistic', value: '100% Realistic Photorealistic, Architectural Digest Photography, 8k raw photo' },
    { name: 'Cinematic Luxury', value: 'Cinematic High-Gloss Luxury, dramatic lighting, moody, high-end editorial' },
    { name: '3D Pixar Animation', value: '3D Render Style, Pixar Disney aesthetic, cute character proportions, warm lighting' },
    { name: 'Modern Minimalist', value: 'Clean Minimalist Style, bright natural light, crisp white textures, Zen vibe' },
    { name: 'Lo-Fi Anime', value: 'Cozy Lo-Fi Anime style, Ghibli-inspired hand-drawn textures, nostalgic glow' }
];

const quickActions = [
    // ORIGINAL PRESETS
    { label: "Fast x2 (6 Senses)", count: 6, icon: "⚡", prompt: "Fast Action x2: 0% dirty to 100% luxury new room. (ធ្វើលឿនៗ x2). A professional team moves at high speed. Same camera position. Satisfying cleaning and repair ASMR." },
    { label: "Pool Transformation", count: 12, icon: "🏊", prompt: "Luxury Pool Renovation: From empty concrete hole to crystal blue paradise. Tiling, lighting, and waterfall installation. (អាងហែលទឹក)" },
    { label: "Gamer Cave Pro", count: 8, icon: "🎮", prompt: "Gaming Room Build: Installing acoustic foam, RGB lighting, and ultimate dual-PC setup. 0% boring to 100% neon tech sanctuary." },
    { label: "Master Bath Build", count: 10, icon: "🚿", prompt: "Luxury Bathroom Remodel: Installing marble walls, a standalone tub, and gold hardware. High-speed plumbing and tiling." },
    { label: "Zen Yoga Studio", count: 6, icon: "🧘", prompt: "Zen Meditation Room: Wood flooring, sliding paper doors, and indoor garden. (បន្ទប់យោគៈ) From cluttered to peaceful." },
    { label: "Garage Workspace", count: 8, icon: "🔧", prompt: "Garage Shop Renovation: Organizing tools, epoxy flooring, and heavy-duty workbenches. (យានដ្ឋាន)" },
    { label: "Roof Garden DIY", count: 12, icon: "🌿", prompt: "Attic/Roof Transformation: Clearing space, adding decking, and planting a lush green oasis. (សួនលើដំបូល)" },
    { label: "Home Cinema", count: 10, icon: "🍿", prompt: "Theater Room Build: Dark walls, stadium seating, and giant projector setup. Pure cinematic transformation." },
    { label: "Modern Kitchen", count: 15, icon: "🍳", prompt: "Chef's Kitchen Remodel: New marble counters, high-end appliances, and satisfying tile work." },
    { label: "Wine Cellar", count: 8, icon: "🍷", prompt: "Underground Wine Cellar: Stone walls, custom racks, and low ambient lighting. (បន្ទប់ដាក់ស្រា)" },
    { label: "Kids Playroom", count: 6, icon: "🧸", prompt: "Kids Activity Center: Bright colors, built-in slides, and organized storage. (បន្ទប់ក្មេងលេង)" },
    { label: "Industrial Loft", count: 12, icon: "🏢", prompt: "Loft Renovation: Exposed brick, iron beams, and high ceilings. From grey concrete to trendy living space." },
    { label: "Smart Home Entry", count: 8, icon: "🔓", prompt: "Smart Corridor: Modern entry with facial recognition locks and automated path lighting." },
    { label: "Coffee Bar DIY", count: 6, icon: "☕", prompt: "Home Barista Station: Building a custom coffee nook with espresso equipment and tiled backsplash." },
    { label: "Patio Oasis", count: 10, icon: "⛱️", prompt: "Outdoor Patio Makeover: Stone paving, fire pit, and comfortable all-weather seating." },
    { label: "Attic Bedroom", count: 12, icon: "🛌", prompt: "Attic Conversion: Turning a dusty attic into a cozy skylit master bedroom." },
    { label: "Gym/Home Fitness", count: 8, icon: "🏋️", prompt: "Personal Gym Build: Rubber flooring, wall mirrors, and specialized equipment installation." },
    { label: "Art Studio", count: 6, icon: "🎨", prompt: "Artist Workspace: Large easels, paint organizers, and massive natural light setup." },
    { label: "Library / Study", count: 10, icon: "📚", prompt: "Old Study Restoration: High-gloss wood polishing, floor-to-ceiling bookshelves, and library ladder." },
    
    // NEW 15 PRESETS
    { label: "Luxury Pet Room", count: 6, icon: "🐶", prompt: "Ultra-Luxury Pet Sanctuary: Custom built dog houses inside a high-end room, pet shower station, and designer pet furniture. (បន្ទប់សត្វចិញ្ចឹម)" },
    { label: "Backyard BBQ", count: 10, icon: "🍖", prompt: "Outdoor Kitchen & BBQ Deck: Stone counters, stainless steel grill, and high-speed paving installation in a forest setting. (កន្លែងអាំងសាច់)" },
    { label: "Home Cinema V2", count: 12, icon: "📽️", prompt: "Mini IMAX Home Theater: Tiered leather seating, starlight ceiling effect, and massive screen install. 100% professional luxury." },
    { label: "Recording Studio", count: 8, icon: "🎤", prompt: "High-End Recording Studio: Acoustic wood panels, glowing LED diffusion, and professional mixing desk setup. (ស្ទូឌីយោថតសំឡេង)" },
    { label: "Spa & Sauna", count: 10, icon: "🧖", prompt: "Home Wellness Center: Building a cedar wood sauna and a marble-clad hot tub area. Relaxing steam and warm lighting. (បន្ទប់ស្ប៉ា)" },
    { label: "Vertical Garden", count: 8, icon: "🌱", prompt: "Indoor Vertical Jungle: Installing hydroponic living walls and automated misting systems in a modern lounge. (សួនបញ្ឈរ)" },
    { label: "PC Gaming Cave", count: 6, icon: "🖥️", prompt: "Ultimate PC Battle Station: Carbon fiber desk, triple monitor rig, and synchronized RGB lighting loops. High-speed tech setup." },
    { label: "Walk-in Closet", count: 10, icon: "👗", prompt: "Fashionista Dream Closet: Glass-front cabinets, centralized accessory island, and high-gloss floor polishing. (បន្ទប់ដាក់ខោអាវ)" },
    { label: "Wine Tasting", count: 8, icon: "🥂", prompt: "Professional Wine Tasting Room: Reclaimed wood walls, temperature-controlled storage, and elegant stone tasting bar." },
    { label: "Attic Library", count: 12, icon: "📔", prompt: "Quiet Attic Reading Nook: Custom bookshelves fitting the roof angle, skylight installation, and plush seating. (បណ្ណាល័យលើដំបូល)" },
    { label: "Smart Corridor", count: 6, icon: "🚨", prompt: "Futuristic Security Hallway: Laser scanners, smart glass walls, and automated recessed floor lighting. (ច្រកផ្លូវឆ្លាតវៃ)" },
    { label: "Indoor Fountain", icon: "⛲", count: 8, prompt: "Marble Indoor Waterfall: Custom stone carving and water circulation system build in a grand foyer. (ទឹកធ្លាក់ក្នុងផ្ទះ)" },
    { label: "Yoga Deck", count: 6, icon: "🤸", prompt: "Zen Mountain Yoga Deck: Building a floating wooden platform overlooking a misty valley. Peaceful and minimalist. (កន្លែងហាត់យោគៈ)" },
    { label: "Man Cave Bar", count: 10, icon: "🍺", prompt: "Industrial Home Bar: Exposed brick, iron pipes for shelves, and a polished concrete bar top. (បន្ទប់កម្សាន្តបុរស)" },
    { label: "Hobby Workshop", count: 8, icon: "🛠️", prompt: "Precision Hobby Workshop: Organized pegboards, heavy-duty workbenches, and high-intensity overhead lighting. (បន្ទប់ជាង)" }
];

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

const RoomRenovationPro: React.FC = () => {
    const { t } = useLanguage();
    const [mode, setMode] = useState<'manual' | 'clone'>('manual');
    const [cloneSource, setCloneSource] = useState<'image' | 'video'>('image');
    const [masterPrompt, setMasterPrompt] = useState(quickActions[0].prompt);
    const [selectedStyle, setSelectedStyle] = useState(styleOptions[0]);
    const [sceneCount, setSceneCount] = useState(6);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCloning, setIsCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    
    // Clone Media Source
    const [cloneMedia, setCloneMedia] = useState<ImageReference | null>(null);
    const [clonePreviewUrl, setClonePreviewUrl] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isVideo = file.type.startsWith('video');
            setCloneSource(isVideo ? 'video' : 'image');
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setCloneMedia({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
                setClonePreviewUrl(URL.createObjectURL(file));
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSelectAction = (act: typeof quickActions[0]) => {
        setMasterPrompt(act.prompt);
        setSceneCount(act.count);
        setScenes([]);
    };

    const handleClonePrompt = async () => {
        if (!cloneMedia) {
            setError("Please upload a source image or video to clone.");
            return;
        }
        setIsCloning(true);
        setError(null);
        try {
            let extracted = '';
            if (cloneSource === 'video') {
                extracted = await generatePromptFromVideo(cloneMedia.base64, cloneMedia.mimeType);
            } else {
                extracted = await generatePromptFromImage(cloneMedia.base64, cloneMedia.mimeType);
            }
            
            const refinedPrompt = `[CLONE 99% SIMILARITY MODE ACTIVE]
Source DNA: ${extracted}

Transformation Target: Create a high-speed 'Fast x2' restoration sequence. 
Maintain 100% exact architectural geometry, camera height, and lighting DNA from the source. 
(សូមរក្សារ នៅកន្លែងដ៏ដែល និងម៉ូតបន្ទប់ដ៏ដែល 99% - ចាស់មកថ្មី)
Perform the satisfying renovation through the scenes.`;
            
            setMasterPrompt(refinedPrompt);
            setMode('manual');
        } catch (err) {
            setError("Media extraction failed. Try another file.");
        } finally {
            setIsCloning(false);
        }
    };

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) {
            setError("Please enter a concept or clone a prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setScenes([]);

        const cloningModifier = masterPrompt.includes('[CLONE') 
            ? "CRITICAL CLONING RULE: Aim for 99% visual similarity to the source media DNA. Keep geometry, camera height, and structural lines identical. (រក្សារ នៅកន្លែងដ៏ដែល)" 
            : "";

        const consistencyInstruction = `
            CRITICAL PRODUCTION RULES:
            1. LOCATION LOCK: The camera angle, room geometry, and furniture placement must remain 100% IDENTICAL in every single scene. (រក្សារ នៅកន្លែងដ៏ដែល)
            2. TRANSFORMATION: Clear linear path from Stage 0% (Dirty/Old) to Stage 100% (Luxurious/New).
            3. FAST ACTIVITY x2: Workers must move at high speed, high energy, and in time-lapse motion (ធ្វើលឿនៗ x2).
            4. STYLE: ${selectedStyle.value}
            5. ${cloningModifier}
        `;

        try {
            const result = await generateConsistentStoryScript(
                `RENOVATION PRO FAST x2 PRODUCTION SCRIPT. Context: ${masterPrompt}. ${consistencyInstruction}`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) {
            setError("Failed to architect production script.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const prompt = `${selectedStyle.value}. Action: ${scene.action} (Fast x2 speed). Environment: ${scene.consistentContext}. Detailed textures, realistic materials, cinematic lighting. Maintain the EXACT same camera angle as Scene 1. No text. (ចាស់មកថ្មី - រក្សារនៅកន្លែងដ៏ដែល). 99% Similarity to source.`;
            const url = await generateImage(prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s));
            setError("Image generation failed.");
        }
    };

    const handleGenerateMetadata = async () => {
        if (scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const context = `Fast Renovation x2 Project: ${masterPrompt}\nScenes:\n${scenes.map(s => s.action).join('\n')}`;
            const meta = await generateYouTubeMetadata(
                "Incredible Fast Renovation x2 | 99% Similarity Clone",
                context,
                "Restoration & Fast Construction"
            );
            setYoutubeMeta(meta);
        } catch (e) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllSenses = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}:\n${s.consistentContext}`).join('\n\n');
        handleCopy(text, 'all-senses-bulk');
    };

    const handleCopyAllJSON = () => {
        if (scenes.length === 0) return;
        const data = scenes.map(s => ({
            id: s.sceneNumber,
            video_prompt: s.consistentContext
        }));
        handleCopy(JSON.stringify(data, null, 2), 'all-json-bulk');
    };

    const handleDownload = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Renovation_FastX2_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setMasterPrompt(quickActions[0].prompt);
        setScenes([]);
        setCloneMedia(null);
        setClonePreviewUrl(null);
        setError(null);
        setYoutubeMeta(null);
        setMode('manual');
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: ARCHITECT PANEL */}
                <div className="lg:col-span-5 space-y-6 h-full flex flex-col">
                    <div className="bg-[#1e293b]/95 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl backdrop-blur-xl flex flex-col flex-grow">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🧼</span>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-tighter leading-none">
                                    Renovation PRO
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
                                <BoltIcon />
                                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Fast x2 Mode</span>
                            </div>
                        </div>

                        {/* MODE TOGGLE */}
                        <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-gray-800 mb-8 shadow-inner">
                            <button onClick={() => setMode('manual')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all duration-300 ${mode === 'manual' ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>1. Content</button>
                            <button onClick={() => setMode('clone')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all duration-300 ${mode === 'clone' ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>2. Clone X</button>
                        </div>

                        {mode === 'clone' ? (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <label className="block text-[11px] font-black text-cyan-400 mb-3 uppercase tracking-widest">Clone Source (Image or Video)</label>
                                    <div className="relative aspect-video bg-[#0f172a] rounded-2xl border-2 border-dashed border-gray-800 flex items-center justify-center overflow-hidden group hover:border-cyan-500/50 transition-all">
                                        {clonePreviewUrl ? (
                                            <>
                                                {cloneSource === 'video' ? (
                                                    <video src={clonePreviewUrl} className="w-full h-full object-cover" controls={false} />
                                                ) : (
                                                    <img src={clonePreviewUrl} className="w-full h-full object-cover" alt="Clone Reference" />
                                                )}
                                                <button onClick={() => { setCloneMedia(null); setClonePreviewUrl(null); }} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition">✕</button>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-center p-6">
                                                <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/20">
                                                    <span className="text-2xl">📸</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Upload Reference (Image/Video) to Clone</span>
                                                <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-gray-600 mt-2 text-center uppercase tracking-widest">Targets 99% Similarity in Architecture & Perspective</p>
                                </div>
                                <button 
                                    onClick={handleClonePrompt}
                                    disabled={isCloning || !cloneMedia}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-2xl shadow-xl transition active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    {isCloning ? <Spinner /> : '🧬'} Extract Content DNA
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in flex flex-col flex-grow">
                                {/* Styles Selector */}
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 mb-4 uppercase tracking-[0.2em]">Architectural Style Studio</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {styleOptions.map((opt) => (
                                            <button
                                                key={opt.name}
                                                onClick={() => setSelectedStyle(opt)}
                                                className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all ${selectedStyle.name === opt.name ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:text-gray-300'}`}
                                            >
                                                {opt.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Expanded Quick Actions Grid */}
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 mb-3 uppercase tracking-widest text-center">Fast Activity Presets</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                        {quickActions.map((act, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleSelectAction(act)}
                                                className={`p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 group ${masterPrompt === act.prompt ? 'bg-cyan-900/40 border-cyan-500 text-white shadow-lg' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                            >
                                                <span className="text-xl group-hover:scale-110 transition-transform">{act.icon}</span>
                                                <span className="text-[9px] font-black uppercase leading-tight truncate">{act.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-grow">
                                    <label className="block text-[11px] font-black text-gray-500 mb-2 uppercase tracking-widest text-center">Master Design Idea</label>
                                    <textarea 
                                        value={masterPrompt}
                                        onChange={(e) => setMasterPrompt(e.target.value)}
                                        placeholder="Describe the fast transformation..."
                                        className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl p-4 text-white text-sm h-32 resize-none focus:ring-1 focus:ring-cyan-500 outline-none leading-relaxed italic shadow-inner"
                                    />
                                </div>

                                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700 flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Number Senses (Steps)</label>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="w-10 h-10 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">-</button>
                                        <span className="text-xl font-black text-white w-10 text-center">{sceneCount}</span>
                                        <button onClick={() => setSceneCount(Math.min(99, sceneCount + 1))} className="w-10 h-10 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">+</button>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleGenerateScript} 
                                    disabled={isLoading || !masterPrompt.trim()}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-black rounded-3xl shadow-xl transition transform active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-[0.2em]"
                                >
                                    {isLoading ? <Spinner /> : '🚀 Start Fast Production'}
                                </button>
                            </div>
                        )}
                        {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-xl text-center text-xs font-bold">{error}</div>}
                    </div>
                </div>

                {/* RIGHT: PRODUCTION HUB */}
                <div className="lg:col-span-7 flex flex-col h-full min-h-[700px]">
                    <div className="bg-[#111827]/90 p-8 rounded-[3rem] border border-gray-800 shadow-2xl flex flex-col h-full backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Production Hub</h3>
                                {scenes.length > 0 && <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Camera Locked 🔒 (រក្សារនៅកន្លែងដ៏ដែល)</p>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {scenes.length > 0 && (
                                    <>
                                        <button 
                                            onClick={handleCopyAllSenses}
                                            className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all border shadow-lg flex items-center gap-2 ${copyStatus === 'all-senses-bulk' ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white'}`}
                                        >
                                            <CopyIcon /> {copyStatus === 'all-senses-bulk' ? 'Copied All!' : 'Copy All Senses'}
                                        </button>
                                        <button 
                                            onClick={handleCopyAllJSON}
                                            className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all border shadow-lg flex items-center gap-2 ${copyStatus === 'all-json-bulk' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white'}`}
                                        >
                                            <JsonIcon /> {copyStatus === 'all-json-bulk' ? '✓ JSON Ready' : 'Copy All JSON Code'}
                                        </button>
                                        <button onClick={handleGenerateMetadata} disabled={isGeneratingMeta} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50">
                                            {isGeneratingMeta ? <Spinner className="h-4 w-4 m-0"/> : <YouTubeIcon />} Update Info
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {youtubeMeta && (
                            <div className="bg-gray-900/80 p-6 rounded-2xl border border-red-500/30 animate-fade-in space-y-4 shadow-2xl mb-8 relative z-10">
                                <div className="flex items-center gap-2 text-red-500 mb-2">
                                    <YouTubeIcon />
                                    <h4 className="text-sm font-black uppercase tracking-widest">YouTube Kit</h4>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-tighter block mb-1">Video Title</label>
                                    <div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white text-sm font-bold flex justify-between">
                                        {youtubeMeta.title}
                                        <button onClick={() => handleCopy(youtubeMeta.title, 'yt-t')} className="text-cyan-400 hover:text-white transition">
                                            {copyStatus === 'yt-t' ? '✓' : <CopyIcon />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-8 relative z-10">
                            {scenes.length > 0 ? (
                                scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-gray-800/20 rounded-[2.5rem] border border-gray-700/50 p-6 hover:border-cyan-500/30 transition-all shadow-xl group">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Visual Slot */}
                                            <div className="w-full md:w-56 aspect-video md:aspect-square bg-black rounded-[1.5rem] overflow-hidden relative border border-gray-700 shrink-0 flex items-center justify-center">
                                                {scene.imageUrl ? (
                                                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Phase Visual" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        {scene.isLoadingImage ? (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <Spinner className="h-8 w-8 text-cyan-500 m-0" />
                                                                <span className="text-[9px] font-black text-cyan-400 uppercase animate-pulse">Rendering...</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleGenerateImage(idx)}
                                                                className="flex flex-col items-center gap-2 text-gray-600 hover:text-cyan-400 transition"
                                                            >
                                                                <span className="text-2xl">🖼️</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Render Part</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-cyan-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">SENSE {scene.sceneNumber}</div>
                                                {scene.imageUrl && (
                                                    <button onClick={() => handleDownload(scene.imageUrl!, scene.sceneNumber)} className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-cyan-600 shadow-xl">
                                                        <DownloadIcon />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Data */}
                                            <div className="flex-grow flex flex-col justify-between py-1">
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Fast x2 Action</span>
                                                            <div className="h-1 w-12 bg-gray-700 rounded-full overflow-hidden">
                                                                <div className="h-full bg-cyan-500" style={{width: `${(scene.sceneNumber/sceneCount)*100}%`}}></div>
                                                            </div>
                                                            <span className="text-[8px] font-bold text-cyan-400">{Math.round((scene.sceneNumber/sceneCount)*100)}%</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleCopy(scene.action, `p-${idx}`)}
                                                            className={`p-2 rounded-lg bg-gray-900 border border-gray-700 transition ${copyStatus === `p-${idx}` ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
                                                            title="Copy Action Text"
                                                        >
                                                            {copyStatus === `p-${idx}` ? '✓' : <CopyIcon />}
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-300 text-sm leading-relaxed font-serif italic border-l-2 border-cyan-500 pl-3 mb-4">
                                                        "{scene.action}"
                                                    </p>
                                                </div>
                                                
                                                <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        <BoltIcon />
                                                        <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">99% Similarity Mode</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const data = {
                                                                scene: scene.sceneNumber,
                                                                action: scene.action,
                                                                prompt: scene.consistentContext
                                                            };
                                                            handleCopy(JSON.stringify(data, null, 2), `j-${idx}`);
                                                        }}
                                                        className="text-[10px] text-cyan-400 hover:text-white transition font-black uppercase"
                                                    >
                                                        {copyStatus === `j-${idx}` ? '✓ Done' : 'JSON Data'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 select-none">
                                    <span className="text-9xl mb-4">🏠</span>
                                    <p className="text-2xl font-black uppercase tracking-[0.5em]">Studio Pipeline Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomRenovationPro;
