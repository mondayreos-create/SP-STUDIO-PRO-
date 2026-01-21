
import React, { useState, useRef, useEffect } from 'react';
import { 
    analyzeCharacterReference, 
    generateConsistentStoryScript, 
    generateImage, 
    generateYouTubeMetadata,
    ImageReference, 
    CharacterAnalysis,
    YouTubeMetadata,
    generateCharacters,
    generateSongMusicPrompt
} from '../services/geminiService.ts';

interface GeneratedScene {
    sceneNumber: number;
    description: string;
    imageUrl?: string;
    isLoading: boolean;
    promptUsed?: string;
}

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const BanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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

const relaxingPresets = [
    { title: "Relaxing Christmas Winter Ambience | Cozy Fireplace & Snowfall", synopsis: "A warm and cozy cabin interior during Christmas night. A crackling fireplace lights up the room while soft snow falls outside the large window. Decorated tree and gentle festive atmosphere." },
    { title: "Rainy Night in Tokyo | Lofi Jazz & City Lights Ambience", synopsis: "A rainy night in a modern Tokyo apartment. City lights reflect on the wet window. A lofi jazz aesthetic with soft neon glows and the rhythmic sound of rain." },
    { title: "Mystic Forest Stream | Deep Relaxation Nature Sounds", synopsis: "A hidden stream deep in an ancient forest. Crystal clear water flowing over mossy stones. Sunlight beams filter through the canopy. Peaceful bird songs and wind through leaves." },
    { title: "Deep Sea Sanctuary | Underwater Whale Song & Coral Reef", synopsis: "A serene underwater journey through a vibrant coral reef. Soft blue light rays penetrate from the surface. A majestic whale passes by in the distance with deep ambient sounds." },
    { title: "Zen Garden Meditation | Temple Bells & Sand Raking", synopsis: "A peaceful Japanese Zen garden at sunrise. Raked white sand patterns, a small wooden bridge, and a gentle waterfall. The distant sound of a temple bell echoing in the mist." },
    { title: "Mountain Cabin Blizzard | Howling Wind & Warmth", synopsis: "High altitude mountain retreat during a powerful blizzard. The contrast between the cold howling wind outside and the extreme comfort of a warm wooden interior." },
    { title: "Autumn Path in Kyoto | Falling Leaves & River Breeze", synopsis: "A walk along an autumn path in Kyoto. Vibrant red maple leaves falling slowly. A small traditional boat glides on a calm river nearby." },
    { title: "Starry Night Voyage | Galactic Ambient & Space Silence", synopsis: "A slow journey through a colorful nebula. Glowing stars and distant planets. A peaceful and vast cosmic atmosphere for deep sleep." },
    { title: "Ancient Library Rain | Thunder & Old Book Smells", synopsis: "Inside a massive ancient library with towering mahogany shelves. Thunder rumbles softly as heavy rain hits the stained glass ceiling." },
    { title: "Tropical Island Paradise | Calm Waves & Palm Breeze", synopsis: "An empty white sand beach at sunset. Gentle turquoise waves lapping at the shore. Tall palm trees swaying in a warm tropical wind." },
    { title: "Desert Oasis Night | Moonlit Dunes & Campfire", synopsis: "A hidden oasis in the Sahara under a full moon. A small pool of water reflecting the stars and a crackling campfire by a Bedouin tent." },
    { title: "Himalayan Monastery | Tibetan Chants & Mountain Air", synopsis: "High in the Himalayas, a monastery overlooking the clouds. Morning prayers and incense smoke rising in the crisp cold air." },
    { title: "Lakeside Spring Morning | Blooming Flowers & Soft Water", synopsis: "A peaceful lake surrounded by spring flowers in full bloom. The surface of the water is like a mirror, reflecting the blue sky." },
    { title: "Secret Jungle Waterfall | Hidden Paradise Nature Sounds", synopsis: "A tropical jungle paradise with a magnificent tiered waterfall. Exotic birds flying across the mist-filled air." },
    { title: "Cozy Attic Study | Rainy Day & Warm Light", synopsis: "A small attic room filled with books and plants. Raindrops tapping on the roof tiles. A safe and warm place for focus and study." },
    { title: "Winter Solstice Magic | Northern Lights & Frozen Lake", synopsis: "The aurora borealis dancing over a frozen arctic lake. The silent beauty of the North under the shimmering green lights." },
    { title: "Provence Lavender Wind | Purple Fields & Summer Sun", synopsis: "Endless fields of lavender in Provence. The sound of cicadas and a gentle wind carrying the scent of flowers under a bright sun." },
    { title: "Swiss Train Journey | Window View of Snowy Alps", synopsis: "A slow train ride through the Swiss Alps. Passing frozen lakes and pine forests covered in thick white snow. Rhythmic track sounds." },
    { title: "Tuscan Vineyard Sunset | Golden Hills & Quiet Evening", synopsis: "Rolling hills of Tuscany at golden hour. Cypress trees and rows of vines. A quiet and peaceful evening in the countryside." },
    { title: "Moonlit Ocean Deep | Infinite Waves & Silence", synopsis: "In the middle of the dark ocean under a silver moon. The infinite movement of deep waves providing a meditative and powerful silence." }
];

const RelaxingContentsGenerator: React.FC = () => {
    const [visualReferences, setVisualReferences] = useState<ImageReference[]>([]);
    const [synopsis, setSynopsis] = useState('');
    const [sceneCount, setSceneCount] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [scenes, setScenes] = useState<GeneratedScene[]>([]);
    const [copyState, setCopyState] = useState<string | null>(null);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [musicPrompt, setMusicPrompt] = useState('');
    const [isGeneratingExtras, setIsGeneratingExtras] = useState(false);
    const [displayPresets, setDisplayPresets] = useState(relaxingPresets);
    const [lockCamera, setLockCamera] = useState(true);
    const [bannedMotion, setBannedMotion] = useState(false);
    
    // YouTube Metadata State
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    
    const stopSignal = useRef(false);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (visualReferences.length >= 5) {
                setError("Maximum 5 visual references allowed.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setVisualReferences(prev => [...prev, {
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                }]);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index: number) => {
        setVisualReferences(prev => prev.filter((_, i) => i !== index));
    };

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const title = e.target.value;
        setSelectedPreset(title);
        const preset = relaxingPresets.find(p => p.title === title);
        if (preset) {
            setSynopsis(preset.synopsis);
            handleAutoSetup(preset.synopsis, preset.title);
        }
    };

    const handleShufflePresets = () => {
        const shuffled = [...relaxingPresets].sort(() => Math.random() - 0.5);
        setDisplayPresets(shuffled);
        handleClear();
    };

    const handleAutoSetup = async (customSynopsis?: string, customTitle?: string) => {
        const activeSynopsis = customSynopsis || synopsis;
        const activeTitle = customTitle || selectedPreset;

        if (!activeSynopsis.trim()) {
            setError("Please enter a synopsis first.");
            return;
        }
        setIsGeneratingExtras(true);
        setError(null);
        try {
            const count = 2;
            const charPrompt = `Create ${count} highly detailed 3D atmosphere or static vehicle elements for this relaxing story: "${activeSynopsis}". 
            Describe them as cinematic 3D models with high quality textures. 
            Include names of the elements and visual characteristics (e.g. 'Vintage Sleigh', 'Cozy Fireplace', 'Antique Train').`;
            
            const gen = await generateCharacters(charPrompt, count);
            
            if (visualReferences.length === 0) {
                 setStatusText("Rendering 3D reference art...");
                 for (let i = 0; i < gen.length; i++) {
                     const imgUrl = await generateImage(`Relaxing 3D render, high-quality, professional photography, cinematic lighting: ${gen[i].description}`, '1:1');
                     const [header, base64] = imgUrl.split(',');
                     const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
                     setVisualReferences(prev => [...prev, { base64, mimeType: mime }]);
                     if (i < gen.length - 1) await new Promise(r => setTimeout(r, 1000));
                 }
            }

            setStatusText("Composing ambient music prompt...");
            const mPrompt = await generateSongMusicPrompt(activeTitle || activeSynopsis.substring(0, 30), "Relaxing Ambient Music");
            setMusicPrompt(mPrompt);
            setStatusText("");

        } catch (err) {
            setError("Auto-setup failed. Please try again.");
        } finally {
            setIsGeneratingExtras(false);
        }
    };

    const handleStart = async () => {
        if (visualReferences.length === 0 || !synopsis.trim()) {
            setError("Please provide visual references (Auto Setup can create them) and a synopsis.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setScenes([]);
        setYoutubeMeta(null);
        setProgress(0);
        stopSignal.current = false;

        try {
            setStatusText('Analyzing Atmospheres...');
            setProgress(5);
            
            const analyzedRefs: string[] = [];
            for (let i = 0; i < visualReferences.length; i++) {
                if (stopSignal.current) break;
                setStatusText(`Analyzing Reference ${i + 1}/${visualReferences.length}...`);
                const analysis = await analyzeCharacterReference(visualReferences[i].base64, visualReferences[i].mimeType);
                analyzedRefs.push(analysis.characterDescription);
            }
            
            setProgress(15);

            setStatusText('Writing Relaxing Script...');
            const script = await generateConsistentStoryScript(synopsis, sceneCount);
            
            const initialScenes: GeneratedScene[] = script.map(s => ({
                sceneNumber: s.sceneNumber,
                description: s.action,
                isLoading: true
            }));
            setScenes(initialScenes);
            setProgress(25);

            const allRefsDesc = analyzedRefs.join('\n\n');

            for (let i = 0; i < initialScenes.length; i++) {
                if (stopSignal.current) break;
                setStatusText(`Rendering Sense ${i + 1} of ${sceneCount}...`);

                const scene = initialScenes[i];
                
                // Camera Formula Logic based on user request
                let cameraPrompt = "";
                if (lockCamera) {
                    cameraPrompt = "CAMERA STYLE: STRICTLY STATIC. Fixed perspective. No Active Camera. No zoom, no pan, no movement. Tripod shot. Subjects within the scene (water, rain, fire) can move, but the frame is 100% still like a photo (ខ្ញុំចង់ឱ្យវីដេអូមើលទៅដូចរូបភាពមួយសន្លឹកដែលនៅស្ងៀម).";
                } else {
                    cameraPrompt = "CAMERA STYLE: Cinematic slow forward movement allowed.";
                }

                // New Banned Motion Prompt Logic
                let bannedMotionInstruction = "";
                if (bannedMotion) {
                    bannedMotionInstruction = `
                        NEGATIVE PROMPT INSTRUCTION (BANNED MOTION):
                        - DO NOT generate any camera movement.
                        - BANNED: walk, run, zoom, pan, tilt, rotation, tracking, following, move forward, move backward.
                        - The video must be a "Static shot, no movement" (Formula for Veo 3).
                        - Technical Formula for Kling/Runway: Motion level 1, Horizontal 0, Vertical 0, Zoom 0, Pan 0.
                        - Technical Formula for Luma: Add "--static" instruction logic.
                        - Result must look like 1 single still photograph with internal micro-movements only (e.g. fire flickering or rain falling).
                    `;
                }

                const fullPrompt = `
                    Generate a High-Quality Relaxing 3D Render Image.
                    
                    ${cameraPrompt}
                    ${bannedMotionInstruction}
                    
                    ART STYLE: 3D Cinematic, Unreal Engine 5, Highly Detailed, Soft Ambient Lighting, Photorealistic Textures.
                    
                    VISUAL ELEMENTS:
                    ${allRefsDesc}
                    (Keep the environment and objects 100% consistent across all scenes).
                    
                    ACTION:
                    ${script[i].action}
                    
                    SETTING:
                    ${script[i].consistentContext}
                    
                    Final Look: Peaceful, cinematic depth of field, 4k render, soft glow.
                `;

                try {
                    const imageUrl = await generateImage(fullPrompt, '16:9');
                    setScenes(prev => prev.map(s => 
                        s.sceneNumber === scene.sceneNumber 
                            ? { ...s, imageUrl: imageUrl, isLoading: false, promptUsed: fullPrompt } 
                            : s
                    ));
                } catch (err) {
                    console.error(`Sense ${scene.sceneNumber} failed`, err);
                    setScenes(prev => prev.map(s => 
                        s.sceneNumber === scene.sceneNumber 
                            ? { ...s, isLoading: false, promptUsed: fullPrompt } 
                            : s
                    ));
                }

                setProgress(25 + Math.round(((i + 1) / initialScenes.length) * 75));
                if (i < initialScenes.length - 1) await new Promise(r => setTimeout(r, 1000));
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setIsProcessing(false);
            setStatusText('');
        }
    };

    const handleGenerateMetadata = async () => {
        if (!synopsis.trim() && scenes.length === 0) return;
        setIsGeneratingMeta(true);
        setYoutubeMeta(null);
        try {
            const context = `Synopsis: ${synopsis}\n\nScenes:\n${scenes.map(s => s.description).join('\n')}`;
            const meta = await generateYouTubeMetadata(
                selectedPreset || synopsis.substring(0, 50), 
                context, 
                'Relaxing Ambience'
            );
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate YouTube Metadata");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleStop = () => {
        stopSignal.current = true;
        setIsProcessing(false);
        setStatusText('Stopped.');
    };

    const handleClear = () => {
        setVisualReferences([]);
        setSynopsis('');
        setScenes([]);
        setError(null);
        setProgress(0);
        setSceneCount(5);
        setSelectedPreset('');
        setMusicPrompt('');
        setYoutubeMeta(null);
        setLockCamera(true);
        setBannedMotion(false);
    };

    const handleDownloadImage = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Relaxing_Sense_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyState(id);
        setTimeout(() => setCopyState(null), 2000);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Inputs */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-6 flex items-center gap-2">
                        <span>🧘</span> Relaxing Contents
                    </h2>

                    <div className="space-y-6">
                        {/* 20 Contents More Selector */}
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                    <SparklesIcon /> Choose 20 Contents More
                                </label>
                                <button 
                                    onClick={handleShufflePresets}
                                    className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition"
                                    title="Get new content suggestions"
                                >
                                    <RefreshIcon /> New Contents
                                </button>
                            </div>
                            <select 
                                value={selectedPreset}
                                onChange={handlePresetChange}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                            >
                                <option value="">-- Select a Theme (Auto Create) --</option>
                                {displayPresets.map((p, i) => (
                                    <option key={i} value={p.title}>{i + 1}. {p.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Visual Reference Slot */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-300">1. Visual Reference (តួអង្គ/ប្លង់) ({visualReferences.length}/5)</label>
                                {selectedPreset && visualReferences.length === 0 && (
                                    <button 
                                        onClick={() => handleAutoSetup()} 
                                        disabled={isGeneratingExtras}
                                        className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold transition flex items-center gap-1"
                                    >
                                        {isGeneratingExtras ? <Spinner className="h-3 w-3 m-0"/> : '✨ Auto Setup'}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {visualReferences.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-900 rounded-lg border border-gray-600 overflow-hidden group">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <TrashIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                {visualReferences.length < 5 && (
                                    <label className="cursor-pointer aspect-square bg-gray-900 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center hover:border-teal-400 transition-colors">
                                        <span className="text-2xl mb-1 text-gray-500">+</span>
                                        <span className="text-[10px] text-gray-500">Add</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Banned Motion Logic Panel */}
                        <div className="bg-red-900/10 p-4 rounded-lg border border-red-500/30 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={bannedMotion} 
                                        onChange={e => setBannedMotion(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${bannedMotion ? 'bg-red-600' : 'bg-gray-700'}`}></div>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${bannedMotion ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-red-400 flex items-center gap-1">
                                        <BanIcon /> Banned Prompt (Motion)
                                    </span>
                                    <span className="text-[10px] text-gray-500 italic">"Disable all camera movements." (បិទរាល់ការរំកិល)</span>
                                </div>
                            </label>
                            
                            <div className="text-[10px] text-gray-400 bg-black/40 p-2 rounded border border-gray-700 space-y-1">
                                <p className="text-red-300 font-bold">សូម Banned Prompt ពាក្យទាំងអស់ កុំអោយមានក្នុង Generator Videos:</p>
                                <p>កុំរ៉េកុំអោយដើ ទៅមុខ កុំ Zoom in Zoom out មានន័យថា សាច់Videos ដូចរូបភាព 1 សន្លឹក ចឹង</p>
                                <div className="pt-2 mt-2 border-t border-gray-700">
                                    <p className="text-blue-300 font-bold underline"> formulas applied:</p>
                                    <p>• Veo 3: "Cinematography: Static shot, no movement"</p>
                                    <p>• Luma: Added "--static" command</p>
                                    <p>• Kling: Motion scale set to lowest</p>
                                </div>
                            </div>
                        </div>

                        {/* Camera Lock Control */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-teal-500/30">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={lockCamera} 
                                        onChange={e => setLockCamera(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${lockCamera ? 'bg-teal-600' : 'bg-gray-700'}`}></div>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${lockCamera ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-teal-400 flex items-center gap-1">
                                        <LockIcon /> Lock the Camera (ចាក់សោកាមេរ៉ា)
                                    </span>
                                    <span className="text-[10px] text-gray-500 italic">"I want a static camera shot." (ខ្ញុំចង់បានប្លង់កាមេរ៉ានៅស្ងៀម)</span>
                                </div>
                            </label>
                            <p className="text-[10px] text-gray-400 mt-2 italic leading-tight">
                                Videos ដើទៅមុខ សូមកុំបិត អោយនៅ ស្ងាម មួយកន្លែង (Let the video progress forward, but keep the camera still in one place).
                            </p>
                        </div>

                        {/* Synopsis */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">2. Atmosphere Synopsis (សាច់រឿងសង្ខេប)</label>
                            <textarea 
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Describe the relaxing environment..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>

                        {/* Scene Count */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">3. Senses / Scenes (1-99)</label>
                            <input 
                                type="number" min="1" max="99" 
                                value={sceneCount}
                                onChange={(e) => setSceneCount(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-teal-500 outline-none text-center font-bold text-lg"
                            />
                        </div>

                        {isProcessing ? (
                            <div className="space-y-2">
                                <button onClick={handleStop} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition">Stop Generation</button>
                                <p className="text-center text-xs text-teal-300 animate-pulse">{statusText}</p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleStart} 
                                disabled={visualReferences.length === 0 || !synopsis}
                                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                🚀 Get Go (Auto Create)
                            </button>
                        )}
                        
                        {isProcessing && (
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Results Gallery */}
                <div className="lg:col-span-2 space-y-4 h-[85vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex justify-between items-center sticky top-0 z-10 backdrop-blur">
                        <h3 className="text-xl font-bold text-white">Relaxing Studio Storyboard</h3>
                        <div className="flex gap-2">
                             {musicPrompt && (
                                <button 
                                    onClick={() => handleCopy(musicPrompt, 'musicPrompt')}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md transition text-xs font-bold"
                                >
                                    {copyState === 'musicPrompt' ? 'Copied!' : '🎵 Copy Music Prompt'}
                                </button>
                            )}
                            {scenes.length > 0 && (
                                <button onClick={handleGenerateMetadata} disabled={isGeneratingMeta} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition disabled:opacity-50 text-sm font-bold">
                                    {isGeneratingMeta ? <Spinner className="h-4 w-4"/> : <YouTubeIcon />} YouTube Info
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Pro Tips Section */}
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 animate-fade-in text-xs space-y-2">
                        <h4 className="font-bold text-blue-300 flex items-center gap-1 uppercase tracking-wider">
                            <SparklesIcon /> Pro Tips: How to Lock the Camera (In Blender)
                        </h4>
                        <ol className="list-decimal list-inside text-gray-400 space-y-1">
                            <li>Select your Camera in the 3D viewport or the Outliner.</li>
                            <li>Press <strong>N</strong> to open the side menu.</li>
                            <li>Go to the <strong>Item</strong> tab.</li>
                            <li>Look for <strong>Transform</strong> (Location, Rotation, and Scale).</li>
                            <li>Click and drag down over all the <strong>Padlock Icons (🔒)</strong> to lock them.</li>
                            <li><strong>Disable "Camera to View":</strong> Go to View tab -> Uncheck "Camera to View".</li>
                        </ol>
                        <p className="text-[10px] text-teal-400 italic mt-2">"I want the video to look like a still photo." (ខ្ញុំចង់ឱ្យវីដេអូមើលទៅដូចរូបភាពមួយសន្លឹកដែលនៅស្ងៀម)</p>
                    </div>

                    {/* Music Prompt Display */}
                    {musicPrompt && (
                        <div className="bg-gray-900 p-4 rounded-lg border border-purple-500/30 animate-fade-in mb-4">
                            <h4 className="text-sm font-bold text-purple-400 mb-2 uppercase tracking-wider">Ambient Music Prompt (Start to Finish)</h4>
                            <p className="text-gray-300 text-xs bg-black/30 p-3 rounded italic font-mono leading-relaxed">{musicPrompt}</p>
                        </div>
                    )}

                    {youtubeMeta && (
                        <div className="bg-gray-900 p-4 rounded-lg border border-red-500/30 animate-fade-in mb-4">
                            <h4 className="text-sm font-bold text-red-400 mb-3 uppercase tracking-wider">YouTube Metadata</h4>
                            <div className="space-y-3 text-xs">
                                <div className="bg-black/30 p-2 rounded border border-gray-700">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-500 font-bold uppercase">Title</span>
                                        <button onClick={() => handleCopy(youtubeMeta.title, 'metaTitle')} className="text-gray-400 hover:text-white">{copyState === 'metaTitle' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <p className="text-white font-bold">{youtubeMeta.title}</p>
                                </div>
                                <div className="bg-black/30 p-2 rounded border border-gray-700">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-500 font-bold uppercase">Description</span>
                                        <button onClick={() => handleCopy(youtubeMeta.description, 'metaDesc')} className="text-gray-500 hover:text-white">{copyState === 'metaDesc' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                    <p className="text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">{youtubeMeta.description}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {scenes.length === 0 && !isProcessing && (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
                                <span className="text-4xl mb-2 opacity-30">🧘</span>
                                <p>Select a Content Preset or upload your visuals to start.</p>
                                <p className="text-xs mt-2 text-gray-600">Note: Camera is locked by default for professional ambience.</p>
                            </div>
                        )}
                        
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-md flex flex-col">
                                <div className="aspect-video bg-black relative flex items-center justify-center group">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} alt={`Sense ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                <button 
                                                    onClick={() => handleDownloadImage(scene.imageUrl!, idx)}
                                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110"
                                                >
                                                    <DownloadIcon />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-500">
                                            {scene.isLoading ? (
                                                <>
                                                    <Spinner className="h-8 w-8 text-teal-500 mb-2" />
                                                    <span className="text-xs animate-pulse">Rendering Sense {scene.sceneNumber}...</span>
                                                </>
                                            ) : (
                                                <span className="text-xs">Waiting...</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded border border-gray-600/50">
                                        Sense {scene.sceneNumber}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-gray-300 text-xs line-clamp-2 mb-2 min-h-[2.5em] italic font-serif">"{scene.description}"</p>
                                    
                                    <div className="flex justify-end gap-2 border-t border-gray-800 pt-2">
                                         <button 
                                            onClick={() => handleCopy(scene.promptUsed || '', `prompt-${idx}`)}
                                            className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-1 rounded transition"
                                            disabled={!scene.promptUsed}
                                        >
                                            {copyState === `prompt-${idx}` ? <span className="text-green-400 font-bold">Copied!</span> : <><CopyIcon /> Copy Prompt</>}
                                         </button>
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

export default RelaxingContentsGenerator;
