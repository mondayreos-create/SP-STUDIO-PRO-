
import React, { useState } from 'react';
import { generateYouTubeMetadata, YouTubeMetadata } from '../services/geminiService.ts';
import { GoogleGenAI, Type } from "@google/genai"; 

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const JsonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const SaveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const VideoCameraIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
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

interface GeneratedContent {
    mainDescription: string;
    senses: { id: number; text: string; isEditing: boolean; isRegenerating: boolean }[];
}

const LoveForestRiverGenerator: React.FC = () => {
    const [sceneryName, setSceneryName] = useState('');
    const [sensesCount, setSensesCount] = useState(3);
    const [isSmartThinking, setIsSmartThinking] = useState(false);
    const [includeCameraAngles, setIncludeCameraAngles] = useState(false);
    
    const [content, setContent] = useState<GeneratedContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    
    // YouTube Metadata State
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

    const handleGenerate = async () => {
        if (!sceneryName.trim()) {
            setError("Please enter a scenery or forest name.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setContent(null);
        setYoutubeMeta(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = 'gemini-2.5-flash';
            
            let cameraContext = "";
            if (includeCameraAngles) {
                cameraContext = `
                CRITICAL VISUAL INSTRUCTION (CINEMATIC SHOTS):
                For EACH "Sense" generated, you MUST strictly assign a unique CINEMATIC CAMERA SHOT/ANGLE. 
                Vary them to create a professional sequence. Use these specifically:
                1. Establishing Shot / Wide Shot (To show the vastness of the forest/river)
                2. Medium Shot (To focus on a specific tree, rock, or river bend)
                3. Close-up (Focus on leaves, water texture, moss, ripples - "Impact")
                4. POV (Point of View - e.g., walking through the path or kayaking)
                5. Low Angle (To make trees look majestic and tall)
                6. Aerial / Drone Shot (Top-down view of the river winding through forest)
                7. B-Roll (Water flowing, leaves falling, wind blowing)
                
                Format each sense as: "[Camera Shot Type]: Description..."
                `;
            }

            const prompt = `
                Generate a highly detailed, 100% photorealistic image prompt for the scenery: "${sceneryName}".
                
                MANDATORY STYLE KEYWORDS:
                "100% Realistic, realistic, shot 1080, 2k, 4k, 8k, landscape photography, nature documentary, cinematic lighting, lush details."
                
                ${cameraContext}

                REQUIREMENTS:
                1. Subject: ${sceneryName} (Focus on Forest and River elements).
                2. Senses: Create exactly ${sensesCount} distinct sensory details (visual, texture, light, water movement, atmosphere).
                
                OUTPUT JSON FORMAT:
                {
                    "mainDescription": "The core visual description of the forest and river environment (1 paragraph) including the mandatory style keywords.",
                    "senses": [
                        "Sense 1: [Detail about water/trees/light]...",
                        "Sense 2: [Detail about atmosphere/rocks]...",
                        ... (Create exactly ${sensesCount} items)
                    ]
                }
            `;

            const config: any = {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainDescription: { type: Type.STRING },
                        senses: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            };

            // Enable thinking if checked
            if (isSmartThinking) {
                config.thinkingConfig = { thinkingBudget: 2048 };
            }

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: config
            });

            const json = JSON.parse(response.text || "{}");
            
            if (json.mainDescription && Array.isArray(json.senses)) {
                setContent({
                    mainDescription: json.mainDescription,
                    senses: json.senses.map((text: string, index: number) => ({
                        id: index + 1,
                        text: text,
                        isEditing: false,
                        isRegenerating: false
                    }))
                });
            } else {
                throw new Error("Invalid response format from AI.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateMetadata = async () => {
        if (!sceneryName || !content) return;
        setIsGeneratingMeta(true);
        setYoutubeMeta(null);
        try {
            const context = `Scenery: ${sceneryName}\nDescription: ${content.mainDescription}`;
            const meta = await generateYouTubeMetadata(
                `Relaxing ${sceneryName} Nature 4K`, 
                context, 
                'Nature Documentary'
            );
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate YouTube Metadata");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleRegenerateSense = async (id: number) => {
        if (!content) return;
        
        setContent(prev => prev ? ({
            ...prev,
            senses: prev.senses.map(s => s.id === id ? { ...s, isRegenerating: true } : s)
        }) : null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let cameraPrompt = "";
            if (includeCameraAngles) {
                cameraPrompt = "Include a specific CINEMATIC CAMERA SHOT (e.g., Close-up, Low Angle, Wide Shot) at the beginning.";
            }

            const prompt = `
                Context: A 100% realistic, 8k forest and river image prompt for "${sceneryName}".
                Main Description: ${content.mainDescription}
                
                Task: Rewrite or generate a NEW detailed "Sense" description (Sense #${id}) focusing on a specific detail (water reflection, mossy rocks, sunlight through trees, mist).
                ${cameraPrompt}
                Style Keywords: realistic, shot 1080, 2k, 4k, 8k.
                Output: Just the text of the new sense description.
            `;

            const config: any = {};
            if (isSmartThinking) {
                 config.thinkingConfig = { thinkingBudget: 1024 };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: config
            });

            const newText = response.text?.trim() || "Failed to regenerate.";

            setContent(prev => prev ? ({
                ...prev,
                senses: prev.senses.map(s => s.id === id ? { ...s, text: newText, isRegenerating: false } : s)
            }) : null);

        } catch (e) {
            console.error(e);
             setContent(prev => prev ? ({
                ...prev,
                senses: prev.senses.map(s => s.id === id ? { ...s, isRegenerating: false } : s)
            }) : null);
        }
    };

    const handleCopyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(key);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyJSON = (sense: { id: number, text: string }) => {
        const data = JSON.stringify({
            scenery: sceneryName,
            sense_number: sense.id,
            description: sense.text,
            style: "100% Realistic, 8k"
        }, null, 2);
        handleCopyText(data, `json-${sense.id}`);
    };

    const toggleEdit = (id: number) => {
        setContent(prev => prev ? ({
            ...prev,
            senses: prev.senses.map(s => s.id === id ? { ...s, isEditing: !s.isEditing } : s)
        }) : null);
    };

    const updateSenseText = (id: number, newText: string) => {
        setContent(prev => prev ? ({
            ...prev,
            senses: prev.senses.map(s => s.id === id ? { ...s, text: newText } : s)
        }) : null);
    };

    const handleClear = () => {
        setSceneryName('');
        setSensesCount(3);
        setContent(null);
        setYoutubeMeta(null);
        setError(null);
        setIsSmartThinking(false);
        setIncludeCameraAngles(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full bg-gray-800/60 p-8 rounded-xl border border-gray-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2 flex items-center justify-center gap-2">
                        <span>🏞️</span> Beautiful Forest & River
                    </h2>
                    <p className="text-gray-400 text-sm">Generate 100% realistic nature landscape prompts.</p>
                </div>

                {/* Input Section */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Scenery Name</label>
                            <input 
                                type="text" 
                                value={sceneryName} 
                                onChange={(e) => setSceneryName(e.target.value)} 
                                placeholder="e.g. Mystic Amazon River, Pine Forest..." 
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Sense Count (1-200)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="200" 
                                value={sensesCount}
                                onChange={(e) => setSensesCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                            />
                        </div>
                        <div className="md:col-span-5 flex flex-col justify-end h-full pt-1 gap-2">
                            <div className="flex flex-wrap gap-2">
                                <label className="flex-1 flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-600 rounded-lg p-2.5 hover:bg-gray-700 transition">
                                    <input 
                                        type="checkbox" 
                                        checked={isSmartThinking} 
                                        onChange={(e) => setIsSmartThinking(e.target.checked)} 
                                        className="w-4 h-4 text-emerald-600 rounded bg-gray-900 border-gray-500 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs font-bold text-emerald-400">
                                        Auto Smart Thinking
                                    </span>
                                </label>
                                <label className="flex-1 flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-600 rounded-lg p-2.5 hover:bg-gray-700 transition">
                                    <input 
                                        type="checkbox" 
                                        checked={includeCameraAngles} 
                                        onChange={(e) => setIncludeCameraAngles(e.target.checked)} 
                                        className="w-4 h-4 text-purple-500 rounded bg-gray-900 border-gray-500 focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                                        <VideoCameraIcon />
                                        Cinematic Shots
                                    </span>
                                </label>
                            </div>
                            <button 
                                onClick={handleGenerate} 
                                disabled={isLoading || !sceneryName.trim()}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Spinner /> : '🌲'} Generate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Output Section */}
                {content && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Main Description */}
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Main Description</span>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={handleGenerateMetadata}
                                        disabled={isGeneratingMeta}
                                        className="text-xs flex items-center gap-1 text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition font-bold disabled:opacity-50"
                                    >
                                        {isGeneratingMeta ? <Spinner className="h-3 w-3"/> : '📺 Get YouTube Kit'}
                                    </button>
                                    <button 
                                        onClick={() => handleCopyText(content.mainDescription, 'main')}
                                        className="text-gray-500 hover:text-white text-xs bg-gray-800 px-2 py-1 rounded border border-gray-600"
                                    >
                                        {copyStatus === 'main' ? <span className="text-green-400 font-bold">Copied!</span> : <><CopyIcon /> Copy</>}
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">{content.mainDescription}</p>
                        </div>
                        
                        {/* YouTube Metadata Section */}
                        {youtubeMeta && (
                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 animate-fade-in">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                        <YouTubeIcon /> YouTube Kit
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                        <div className="bg-gray-900 p-2 rounded border border-gray-600">
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                            <span>TITLE</span>
                                            <button onClick={() => handleCopyText(youtubeMeta.title, 'metaTitle')} className="hover:text-white text-[10px]">{copyStatus === 'metaTitle' ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                        <div className="text-white text-xs font-bold">{youtubeMeta.title}</div>
                                    </div>
                                    <div className="bg-gray-900 p-2 rounded border border-gray-600">
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                            <span>DESCRIPTION</span>
                                            <button onClick={() => handleCopyText(youtubeMeta.description, 'metaDesc')} className="hover:text-white text-[10px]">{copyStatus === 'metaDesc' ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                        <div className="text-gray-300 text-[10px] whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar">{youtubeMeta.description}</div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-gray-900 p-2 rounded border border-gray-600">
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                <span>HASHTAGS</span>
                                                <button onClick={() => handleCopyText(youtubeMeta.hashtags.join(' '), 'metaTags')} className="hover:text-white text-[10px]">{copyStatus === 'metaTags' ? 'Copied!' : 'Copy'}</button>
                                            </div>
                                            <div className="text-blue-400 text-[10px]">{youtubeMeta.hashtags.join(' ')}</div>
                                        </div>
                                        <div className="bg-gray-900 p-2 rounded border border-gray-600">
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                <span>KEYWORDS</span>
                                                <button onClick={() => handleCopyText(youtubeMeta.keywords.join(', '), 'metaKeys')} className="hover:text-white text-[10px]">{copyStatus === 'metaKeys' ? 'Copied!' : 'Copy'}</button>
                                            </div>
                                            <div className="text-gray-400 text-[10px]">{youtubeMeta.keywords.join(', ')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Senses List */}
                        <div className="space-y-4">
                            {content.senses.map((sense) => (
                                <div key={sense.id} className="bg-gray-800 p-4 rounded-lg border border-gray-600 hover:border-emerald-500/50 transition duration-200">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {/* Sense Content */}
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-emerald-900/30 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded border border-emerald-800">
                                                    Sense {sense.id}
                                                </span>
                                            </div>
                                            {sense.isEditing ? (
                                                <textarea 
                                                    value={sense.text}
                                                    onChange={(e) => updateSenseText(sense.id, e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm focus:ring-1 focus:ring-emerald-500 outline-none min-h-[80px]"
                                                />
                                            ) : (
                                                <p className="text-gray-200 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                                                    {sense.text}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action Buttons Column */}
                                        <div className="flex sm:flex-col gap-2 min-w-[140px]">
                                            <button 
                                                onClick={() => handleCopyText(sense.text, `sense-${sense.id}`)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition"
                                            >
                                                {copyStatus === `sense-${sense.id}` ? <span className="text-green-400">Copied!</span> : <><CopyIcon /> Copy Prompt</>}
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleCopyJSON(sense)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition"
                                            >
                                                {copyStatus === `json-${sense.id}` ? <span className="text-green-400">Copied!</span> : <><JsonIcon /> JSON</>}
                                            </button>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => toggleEdit(sense.id)}
                                                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold rounded transition ${sense.isEditing ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                                                >
                                                    {sense.isEditing ? <SaveIcon /> : <EditIcon />}
                                                    {sense.isEditing ? 'Save' : 'Edit'}
                                                </button>
                                                <button 
                                                    onClick={() => handleRegenerateSense(sense.id)}
                                                    disabled={sense.isRegenerating}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition disabled:opacity-50"
                                                    title="Get New Prompt"
                                                >
                                                    {sense.isRegenerating ? <Spinner className="h-3 w-3 m-0"/> : <RefreshIcon />}
                                                    {sense.isRegenerating ? '' : 'New'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoveForestRiverGenerator;
