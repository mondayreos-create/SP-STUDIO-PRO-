import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateHollywoodMvScript, 
    generateVideo, 
    HollywoodMvScene, 
    generateYouTubeMetadata, 
    YouTubeMetadata,
    analyzeCharacterReference,
    generateHollywoodNarration,
    generateHollywoodMusicPrompt,
    generateCharacters,
    generateSimpleStory,
    ImageReference
} from '../services/geminiService.ts';
import { GoogleGenAI, Type } from "@google/genai";

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const JsonIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const hollywoodStyles = [
    'Realistic – Cinematic / Climatic',
    'National Geographic Nature 8K',
    'IMAX Large Format Realism',
    'Gritty War Correspondent Style',
    'Documentary Raw Handheld',
    'Historical Period Authenticity',
    'Underwater Deep Sea 4K',
    'High-Fashion Editorial Gloss',
    'GoPro Action POV Realism',
    'Architectural Interior Mastery',
    'Technicolor Heritage Glow',
    'Cinematic Epic',
    'Hollywood Blockbuster',
    'Dark Noir Thriller',
    'Sci-Fi Futurism',
    'Romantic Drama',
    'Action High Octane',
    'Musical Broadway',
    'Vintage 1950s',
    '80s Retro Wave'
];

interface CharacterSlot {
    id: number;
    name: string;
    description: string;
    image: ImageReference | null;
    isAnalyzing: boolean;
}

const HollywoodMvGenerator: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'trailer' | 'best_story'>('trailer');

    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState(hollywoodStyles[0]);
    const [targetSceneCount, setTargetSceneCount] = useState(25);
    const [isFullMv, setIsFullMv] = useState(false);
    
    const [scenes, setScenes] = useState<HollywoodMvScene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isWritingStory, setIsWritingStory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<number | string | null>(null);

    // Character State
    const [charCount, setCharCount] = useState(1);
    const [characters, setCharacters] = useState<CharacterSlot[]>([
        { id: 1, name: 'Main Character', description: '', image: null, isAnalyzing: false }
    ]);
    const [isAutoGeneratingChars, setIsAutoGeneratingChars] = useState(false);
    const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);

    // Visual Reference State
    const [useRefImage, setUseRefImage] = useState(false);
    const [refImages, setRefImages] = useState<{base64: string, mimeType: string}[]>([]);
    const [refStyle, setRefStyle] = useState('');
    const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);

    // Extra Assets State
    const [narrationScript, setNarrationScript] = useState('');
    const [musicPrompt, setMusicPrompt] = useState('');
    const [isGeneratingExtras, setIsGeneratingExtras] = useState(false);
    const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

    // Scene Extension State
    const [isRegeneratingScene, setIsRegeneratingScene] = useState<number | null>(null);

    // History State
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'hollywood-mv') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'hollywood-mv',
                category: 'vip',
                title: topic.substring(0, 30) || "Movie Trailer Project",
                data: { topic, style, targetSceneCount, isFullMv, scenes, characters, useRefImage, refImages, refStyle }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
            loadLocalHistory();
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'hollywood-mv') return;
            const d = e.detail.data;
            if (d.topic) setTopic(d.topic);
            if (d.style) setStyle(d.style);
            if (d.targetSceneCount) setTargetSceneCount(d.targetSceneCount);
            if (d.isFullMv !== undefined) setIsFullMv(d.isFullMv);
            if (d.scenes) setScenes(d.scenes);
            if (d.characters) setCharacters(d.characters);
            if (d.useRefImage !== undefined) setUseRefImage(d.useRefImage);
            if (d.refImages) setRefImages(d.refImages);
            if (d.refStyle) setRefStyle(d.refStyle);
            setShowHistory(false);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [topic, style, targetSceneCount, isFullMv, scenes, characters, useRefImage, refImages, refStyle]);

    useEffect(() => {
        loadLocalHistory();
    }, []);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'hollywood-mv');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Handle character count change
    useEffect(() => {
        setCharacters(prev => {
            if (charCount > prev.length) {
                const newChars = [];
                for (let i = prev.length; i < charCount; i++) {
                    newChars.push({ id: Date.now() + i, name: `Character ${i + 1}`, description: '', image: null, isAnalyzing: false });
                }
                return [...prev, ...newChars];
            } else if (charCount < prev.length) {
                return prev.slice(0, charCount);
            }
            return prev;
        });
    }, [charCount]);

    const handleCharImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const imageRef = { base64, mimeType: file.type };
                setCharacters(prev => prev.map((c, i) => i === index ? { ...c, image: imageRef, isAnalyzing: true } : c));
                try {
                    const analysis = await analyzeCharacterReference(imageRef.base64, imageRef.mimeType);
                    setCharacters(prev => prev.map((c, i) => i === index ? { ...c, description: analysis.characterDescription, isAnalyzing: false } : c));
                } catch (err) {
                    setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isAnalyzing: false } : c));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRefImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (refImages.length >= 5) {
                setError("You can upload a maximum of 5 images.");
                return;
            }
            setIsAnalyzingRef(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const newRef = { base64, mimeType: file.type };
                setRefImages(prev => [...prev, newRef]);
                if (refImages.length === 1) {
                    try {
                        const analysis = await analyzeCharacterReference(base64, file.type);
                        setRefStyle(analysis.artStyle);
                    } catch (e) {
                        console.error("Analysis failed", e);
                    }
                }
                setIsAnalyzingRef(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeRefImage = (index: number) => {
        setRefImages(prev => prev.filter((_, i) => i !== index));
        if (refImages.length <= 1) setRefStyle('');
    };

    const handleUpdateCharacter = (index: number, field: keyof CharacterSlot, value: string) => {
        setCharacters(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const handleGetCharacters = async () => {
        if (!topic.trim()) {
            setError("Please enter a Title/Topic first.");
            return;
        }
        setIsAutoGeneratingChars(true);
        setError(null);
        try {
            const styleContext = useRefImage && refStyle ? refStyle : style;
            const generatedChars = await generateCharacters(`Hollywood movie characters for: ${topic}. Style: ${styleContext}`, charCount);
            setCharacters(prev => prev.map((c, i) => {
                if (!c.description || autoGenerateEnabled) {
                     if (generatedChars[i]) {
                        return { ...c, name: generatedChars[i].name, description: generatedChars[i].description };
                    }
                }
                return c;
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to auto-generate characters.");
        } finally {
            setIsAutoGeneratingChars(false);
        }
    };

    const handleWriteBestStory = async () => {
        setIsWritingStory(true);
        try {
            const prompt = `Create a high-quality, professional Hollywood film synopsis. Include start, conflict, development, climax, and resolution. Engaging and detailed.`;
            const result = await generateSimpleStory({ topic: prompt, style: "Cinematic Thriller/Drama" });
            setTopic(result.storyContent);
        } catch (e) {
            setError("Failed to generate best story.");
        } finally {
            setIsWritingStory(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Please enter a Title/Topic first.");
            return;
        }
        const hasCharacters = characters.some(c => c.description.trim());
        if (!useRefImage && !hasCharacters) {
             setError("Please generate or describe characters first.");
             return;
        }

        setIsLoading(true);
        setError(null);
        setScenes([]);
        setProgress(0);

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 98) return prev;
                return prev + Math.floor(Math.random() * 3) + 1;
            });
        }, 300);
        
        try {
            const combinedCharDesc = characters
                .map((c, i) => c.description ? `Character ${i+1} (${c.name}): ${c.description}` : null)
                .filter(Boolean)
                .join('\n\n');

            let styleToUse = style;
            let consistencyPrompt = "";

            if (style === 'Realistic – Cinematic / Climatic') {
                styleToUse = `Realistic – Cinematic / Climatic. 
                Attributes: Ultra-realistic lighting, film grain, Golden hour, Volumetric light, Handheld camera feel, High-detail environments.`;
            }

            if (useRefImage) {
                styleToUse = style === 'Realistic – Cinematic / Climatic' ? styleToUse : "3D Render Style";
                consistencyPrompt = "Use the provided visual reference for consistency.";
            }

            const BATCH_SIZE = 10;
            const numBatches = Math.ceil(targetSceneCount / BATCH_SIZE);
            let allGeneratedScenes: HollywoodMvScene[] = [];

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            for (let b = 0; b < numBatches; b++) {
                const startSceneNum = b * BATCH_SIZE + 1;
                const scenesToGen = Math.min(BATCH_SIZE, targetSceneCount - allGeneratedScenes.length);
                
                const narrativeBeats = isFullMv ? `
                STRICT NARRATIVE STRUCTURE (Full MV Mode):
                - Scenes 1 to ${Math.ceil(targetSceneCount * 0.2)}: Opening conflict, establish crisis.
                - Scenes ${Math.ceil(targetSceneCount * 0.2) + 1} to ${Math.floor(targetSceneCount * 0.7)}: Struggle, action, intensity.
                - Scenes ${Math.floor(targetSceneCount * 0.7) + 1} to ${targetSceneCount}: Resolution, success.
                ` : "Create a cinematic trailer sequence.";

                const prompt = `
                TASK: Generate Hollywood MV Script for scenes ${startSceneNum} to ${startSceneNum + scenesToGen - 1} of ${targetSceneCount}.
                STORY: ${topic}
                STYLE: ${styleToUse}
                CHARACTERS: ${combinedCharDesc}
                ${narrativeBeats}
                ${consistencyPrompt}
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    scene_number: { type: Type.INTEGER },
                                    time_range: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    video_prompt: { type: Type.STRING }
                                },
                                required: ["scene_number", "time_range", "description", "video_prompt"]
                            }
                        }
                    }
                });

                const batch = JSON.parse(response.text || "[]") as HollywoodMvScene[];
                const correctedBatch = batch.map((s, idx) => ({
                    ...s,
                    scene_number: startSceneNum + idx,
                    video_prompt: `Character Detail: ${combinedCharDesc}\nStyle: ${styleToUse}\nAction: ${s.description}\n${consistencyPrompt}\nConstraint: 100% face consistency across all ${targetSceneCount} scenes.`
                }));

                allGeneratedScenes = [...allGeneratedScenes, ...correctedBatch];
                setScenes([...allGeneratedScenes]);
                setProgress(Math.round(((b + 1) / numBatches) * 100));
            }

            clearInterval(progressInterval);
            setProgress(100);
        } catch (err) {
            clearInterval(progressInterval);
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateScenePrompt = async (idx: number) => {
        const scene = scenes[idx];
        setIsRegeneratingScene(idx);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const charContext = characters.map((c, i) => `Character ${i + 1}: ${c.name} - ${c.description}`).join('\n\n');
            const promptForAi = `Regenerate Scene Prompt: #${scene.scene_number}. Story: ${topic}. Action: ${scene.description}. Chars: ${charContext}. Style: ${style}. JSON: { "description": "new", "video_prompt": "new" }`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptForAi,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            video_prompt: { type: Type.STRING }
                        }
                    }
                }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.description) {
                const updated = [...scenes];
                updated[idx] = { ...scene, description: result.description, video_prompt: result.video_prompt };
                setScenes(updated);
            }
        } catch (err) {
            setError("Regeneration failed.");
        } finally {
            setIsRegeneratingScene(null);
        }
    };

    const handleGetVoiceoverText = async () => {
        if (!topic.trim()) return;
        setIsGeneratingExtras(true);
        try {
            const styleToUse = useRefImage && refStyle ? refStyle : style;
            const script = await generateHollywoodNarration(topic, styleToUse);
            setNarrationScript(script);
        } catch (err) {
            setError("Narration generation failed.");
        } finally {
            setIsGeneratingExtras(false);
        }
    };

    const handleGetMusicPrompt = async () => {
        if (!topic.trim()) return;
        setIsGeneratingExtras(true);
        try {
            const styleToUse = useRefImage && refStyle ? refStyle : style;
            const prompt = await generateHollywoodMusicPrompt(topic, styleToUse);
            setMusicPrompt(prompt);
        } catch (err) {
            setError("Music prompt generation failed.");
        } finally {
            setIsGeneratingExtras(false);
        }
    };

    const handleReloadHistory = (project: any) => {
        window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: project }));
        setShowHistory(false);
    };

    const handleCopyText = (text: string, id: number | string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleDownloadSenses = () => {
        const text = scenes.map(s => `Sense ${s.scene_number}: ${s.description}`).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Hollywood_MV_Senses_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadJson = () => {
        const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Hollywood_MV_Storyboard_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setTopic('');
        setTargetSceneCount(25);
        setIsFullMv(false);
        setStyle(hollywoodStyles[0]);
        setScenes([]);
        setError(null);
        setNarrationScript('');
        setMusicPrompt('');
        setMetadata(null);
        setCharCount(1);
        setCharacters([{ id: Date.now(), name: 'Main Character', description: '', image: null, isAnalyzing: false }]);
        setUseRefImage(false);
        setRefImages([]);
        setRefStyle('');
        setProgress(0);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            {/* Action Bar */}
            <div className="w-full flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            loadLocalHistory();
                            setShowHistory(!showHistory);
                        }} 
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 border ${showHistory ? 'bg-red-600 border-red-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                    >
                        <HistoryIcon /> {showHistory ? 'Hide History' : 'Reload History | ប្រវត្តផលិត'}
                    </button>
                </div>
                <button 
                    onClick={handleClear} 
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200"
                >
                    <RefreshIcon /> Reset Project | សម្អាត
                </button>
            </div>

            {/* History Overlay */}
            {showHistory && (
                <div className="w-full bg-gray-900/90 border-2 border-red-500/50 p-6 rounded-2xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                            <HistoryIcon /> Trailer History Vault
                        </h4>
                        <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-xl">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {localHistory.length > 0 ? (
                            localHistory.map((project, idx) => (
                                <div 
                                    key={project.id} 
                                    onClick={() => handleReloadHistory(project)}
                                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-4 rounded-xl cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded font-black border border-red-800/50 uppercase">#{localHistory.length - idx}</span>
                                        <span className="text-[9px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">Movie Trailer</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic">"{project.data.topic}"</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-red-400 font-black uppercase">Click to Reload ➜</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 lg:col-span-1 shadow-2xl">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 mb-2 flex items-center gap-2">
                        <span>🎬</span> Movie Trailer
                    </h2>
                    
                    <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 mb-4">
                        <button onClick={() => setActiveTab('trailer')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'trailer' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Trailer Mode</button>
                        <button onClick={() => setActiveTab('best_story')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'best_story' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Best Story</button>
                    </div>

                    {activeTab === 'trailer' ? (
                        <>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-gray-300">Story Title / Synopsis</label>
                                    <button onClick={handleWriteBestStory} disabled={isWritingStory} className="text-[10px] bg-gradient-to-r from-yellow-600 to-red-600 text-white px-3 py-1 rounded font-bold">{isWritingStory ? <Spinner className="h-3 w-3 m-0"/> : '✨'} Write Best Story</button>
                                </div>
                                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. A spy thriller in Paris..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none outline-none text-sm"/>
                            </div>

                             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={isFullMv} onChange={e => setIsFullMv(e.target.checked)} className="w-5 h-5 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-red-400 uppercase tracking-widest">Full MV (Professional Film)</span>
                                        <span className="text-[10px] text-gray-500 italic">Auto-structure: Conflict, Struggle, Success, Fights.</span>
                                    </div>
                                </label>

                                 <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-700/50">
                                    <input type="checkbox" checked={useRefImage} onChange={e => setUseRefImage(e.target.checked)} className="w-4 h-4 text-cyan-500 rounded bg-gray-800 border-gray-600 focus:ring-cyan-500"/>
                                    <span className="font-bold text-cyan-400 text-sm">Use Visual Reference</span>
                                </label>
                                {useRefImage && (
                                    <div className="animate-fade-in pt-2">
                                        <div className="grid grid-cols-5 gap-2">
                                            {refImages.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square bg-gray-800 rounded border border-gray-600 group">
                                                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt="Ref" className="w-full h-full object-cover rounded" />
                                                    <button onClick={() => removeRefImage(idx)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition text-[10px]">✕</button>
                                                </div>
                                            ))}
                                            {refImages.length < 5 && (
                                                <label className="flex flex-col items-center justify-center aspect-square bg-gray-800 rounded border border-gray-600 cursor-pointer hover:bg-gray-700 transition"><span className="text-xl">📷</span><input type="file" accept="image/*" onChange={handleRefImageUpload} className="hidden"/></label>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-sm font-bold text-gray-300">Cast Characters</label>
                                    <button onClick={handleGetCharacters} disabled={isAutoGeneratingChars || !topic.trim()} className="text-[10px] bg-yellow-600 text-white px-3 py-1 rounded font-bold">{isAutoGeneratingChars ? <Spinner className="h-3 w-3"/> : '✨'} Auto-Gen Cast</button>
                                </div>
                                <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                    {characters.map((char, index) => (
                                        <div key={char.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 w-16">
                                                    <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition relative overflow-hidden group">
                                                        {char.image ? <img src={`data:${char.image.mimeType};base64,${char.image.base64}`} alt="Actor" className="w-full h-full object-cover" /> : <span className="text-xl">👤</span>}
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCharImageUpload(index, e)} />
                                                    </label>
                                                </div>
                                                <div className="flex-grow space-y-1">
                                                    <input value={char.name} onChange={e => handleUpdateCharacter(index, 'name', e.target.value)} placeholder="Actor Name" className="w-full bg-gray-900 border-none rounded p-1 text-[10px] text-yellow-400 font-bold"/>
                                                    <textarea value={char.description} onChange={(e) => handleUpdateCharacter(index, 'description', e.target.value)} placeholder="Appearance traits..." className="w-full h-10 bg-gray-900 border-none rounded p-1 text-[10px] text-gray-300 resize-none outline-none"/>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!useRefImage && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Visual Style</label>
                                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm outline-none">
                                        {hollywoodStyles.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Number of Scenes (1-350)</label>
                                <div className="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-700">
                                    <span className="text-xs text-gray-500 font-bold">Limit: 350</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="350" 
                                        value={targetSceneCount} 
                                        onChange={(e) => setTargetSceneCount(parseInt(e.target.value) || 25)}
                                        className="w-20 bg-gray-800 border border-gray-700 rounded text-center text-red-500 font-black text-lg focus:ring-1 focus:ring-red-500 outline-none"
                                    />
                                    <span className="text-xs text-gray-500 font-bold">Senses</span>
                                </div>
                            </div>

                            <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                                {isLoading ? <Spinner /> : '🎬'} 
                                {isLoading ? 'Directing...' : 'Generate Trailer Script'}
                            </button>
                            
                            <div className="pt-4 border-t border-gray-700 grid grid-cols-2 gap-3">
                                <button onClick={handleGetVoiceoverText} disabled={isGeneratingExtras || !topic.trim()} className="py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold rounded-lg transition uppercase">🎙️ Voiceover</button>
                                <button onClick={handleGetMusicPrompt} disabled={isGeneratingExtras || !topic.trim()} className="py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold rounded-lg transition uppercase">🎵 Sound Prompt</button>
                            </div>
                        </>
                    ) : (
                         <div className="space-y-6 animate-fade-in text-center p-8">
                             <div className="text-5xl mb-4 opacity-20">📜</div>
                             <p className="text-gray-400 text-sm italic mb-6">Write a cinematic masterpiece script directly.</p>
                             <button onClick={handleWriteBestStory} disabled={isWritingStory} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2">
                                 {isWritingStory ? <Spinner /> : '✨'} Generate Best Story
                             </button>
                         </div>
                    )}
                </div>

                {/* Right: Output */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800/60 p-4 rounded-xl border border-gray-700 shadow-2xl flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 backdrop-blur gap-4">
                        <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">
                            Storyboard Canvas ({scenes.length} Scenes)
                        </h3>
                        <div className="flex gap-2">
                             <button onClick={handleDownloadSenses} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md">
                                <DownloadIcon /> Download all Senses
                            </button>
                            <button onClick={handleDownloadJson} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm">
                                <JsonIcon /> Download JSON all senses
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-900 p-5 rounded-2xl border border-gray-700 shadow-xl group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 bg-gray-800 text-yellow-400 font-black rounded-full flex items-center justify-center border border-gray-700 shadow-inner">
                                            {scene.scene_number}
                                        </span>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sense {scene.scene_number}</h4>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleRegenerateScenePrompt(idx)}
                                            className={`text-[10px] px-3 py-1.5 rounded-lg font-black uppercase transition border bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300`}
                                        >
                                            {isRegeneratingScene === idx ? <Spinner className="h-3 w-3 m-0"/> : <RefreshIcon />}
                                            Extension
                                        </button>
                                        <button onClick={() => handleCopyText(scene.video_prompt, idx)} className="bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-500 hover:text-white p-1.5 rounded-lg transition">
                                            {copyStatus === idx ? <span className="text-green-400 font-bold px-1 text-xs">✓</span> : <CopyIcon />}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm mb-4 font-serif italic leading-relaxed border-l-2 border-yellow-500 pl-4 bg-white/5 py-2 rounded-r-lg">"{scene.description}"</p>
                                <div className="bg-black/40 p-4 rounded-xl border border-gray-800"><p className="text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">Rendering Prompt</p><p className="text-gray-400 text-[11px] font-mono leading-relaxed">{scene.video_prompt}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HollywoodMvGenerator;