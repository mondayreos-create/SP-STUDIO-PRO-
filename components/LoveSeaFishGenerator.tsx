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

const LoveSeaFishGenerator: React.FC = () => {
    const [fishName, setFishName] = useState('');
    const [sensesCount, setSensesCount] = useState(3);
    const [isSmartThinking, setIsSmartThinking] = useState(false);
    const [includeCameraAngles, setIncludeCameraAngles] = useState(false);
    
    const [content, setContent] = useState<GeneratedContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

    const handleGenerate = async () => {
        if (!fishName.trim()) {
            setError("Please enter a fish name.");
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
                CRITICAL VISUAL INSTRUCTION:
                For EACH "Sense" generated, you MUST strictly assign a unique CINEMATIC CAMERA SHOT/ANGLE for video generation. 
                Use these specifically:
                1. Establishing Shot / Wide Shot (To show the fish in its habitat)
                2. Medium Shot (Standard view of the fish)
                3. Close-up (Focus on eyes, scales, or mouth details - "Impact")
                4. POV (Point of View - e.g., looking at the fish, or fish's view)
                5. Low Angle (To make the fish look powerful/majestic)
                6. B-Roll (Swimming action, eating, environment interaction)
                7. Movement (Pan Right/Left, Tilt Up/Down, Push In).
                
                Format each sense as a high-quality video generation prompt: "[Camera Shot Type]: Description of the visual..."
                `;
            }

            const prompt = `
                Generate exactly ${sensesCount} high-quality, photorealistic video generation prompts for the fish: "${fishName}".
                
                MANDATORY STYLE KEYWORDS:
                "100% Realistic, underwater cinematography, shot 1080, 2k, 4k, 8k, cinematic lighting, macro details, fluid motion."
                
                ${cameraContext}

                REQUIREMENTS:
                1. Subject: ${fishName} in its natural ocean/sea habitat.
                2. Senses: Create exactly ${sensesCount} distinct video prompts.
                
                OUTPUT JSON FORMAT:
                {
                    "mainDescription": "The core visual description of the fish and underwater environment for a cinematic 4K video.",
                    "senses": [
                        "Sense 1: [Video generation code prompt]...",
                        ...
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

            if (isSmartThinking) {
                config.thinkingConfig = { thinkingBudget: 2048 };
            }

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config
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
                throw new Error("Invalid response format.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(key);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllSenses = () => {
        if (!content) return;
        const text = content.senses.map(s => s.text).join('\n\n');
        handleCopyText(text, 'all-senses');
    };

    const handleCopyAllJSON = () => {
        if (!content) return;
        const data = content.senses.map(s => ({
            id: s.id,
            video_prompt: s.text
        }));
        handleCopyText(JSON.stringify(data, null, 2), 'all-json');
    };

    const handleRegenerateSense = async (id: number) => {
        if (!content) return;
        setContent(prev => prev ? ({
            ...prev,
            senses: prev.senses.map(s => s.id === id ? { ...s, isRegenerating: true } : s)
        }) : null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate a new 100% realistic video prompt for Sense #${id} of a "${fishName}" underwater film. Focus on fluid movement and cinematic detail.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const newText = response.text?.trim() || "Failed to regenerate.";
            setContent(prev => prev ? ({
                ...prev,
                senses: prev.senses.map(s => s.id === id ? { ...s, text: newText, isRegenerating: false } : s)
            }) : null);
        } catch (e) {
             setContent(prev => prev ? ({
                ...prev,
                senses: prev.senses.map(s => s.id === id ? { ...s, isRegenerating: false } : s)
            }) : null);
        }
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

    /* FIX: Moved handleClear function definition before the return statement to fix 'Cannot find name' error. */
    const handleClear = () => {
        setFishName('');
        setSensesCount(3);
        setContent(null);
        setYoutubeMeta(null);
        setError(null);
        setIsSmartThinking(false);
        setIncludeCameraAngles(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={() => handleClear()} />
            <div className="w-full bg-gray-800/60 p-8 rounded-xl border border-gray-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 flex items-center justify-center gap-2">
                        <span>🐠</span> Love Sea Fish
                    </h2>
                    <p className="text-gray-400 text-sm">Generate 100% realistic video prompts for underwater films.</p>
                </div>

                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Fish Name</label>
                            <input type="text" value={fishName} onChange={(e) => setFishName(e.target.value)} placeholder="e.g. Clownfish..." className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Senses Qty</label>
                            <input type="number" min="1" max="200" value={sensesCount} onChange={(e) => setSensesCount(parseInt(e.target.value) || 1)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white outline-none" />
                        </div>
                        <div className="md:col-span-5 flex flex-col pt-1 gap-2">
                            <div className="flex gap-2">
                                <label className="flex-1 flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-600 rounded-lg p-2.5 hover:bg-gray-700 transition">
                                    <input type="checkbox" checked={isSmartThinking} onChange={(e) => setIsSmartThinking(e.target.checked)} className="w-4 h-4 text-cyan-600 rounded bg-gray-900 border-gray-500" />
                                    <span className="text-xs font-bold text-cyan-400">Smart Thinking</span>
                                </label>
                                <label className="flex-1 flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-600 rounded-lg p-2.5 hover:bg-gray-700 transition">
                                    <input type="checkbox" checked={includeCameraAngles} onChange={(e) => setIncludeCameraAngles(e.target.checked)} className="w-4 h-4 text-purple-500 rounded bg-gray-900 border-gray-500" />
                                    <span className="text-xs font-bold text-purple-400">Cam Angles</span>
                                </label>
                            </div>
                            <button onClick={handleGenerate} disabled={isLoading || !fishName.trim()} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isLoading ? <Spinner /> : '🌊'} Generate Video Prompts
                            </button>
                        </div>
                    </div>
                </div>

                {content && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center shadow-xl">
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Production Results</span>
                            <div className="flex gap-3">
                                <button onClick={handleCopyAllSenses} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-lg text-xs font-black transition shadow-lg flex items-center gap-2">
                                    <CopyIcon /> {copyStatus === 'all-senses' ? 'COPIED!' : 'COPY ALL SENSES'}
                                </button>
                                <button onClick={handleCopyAllJSON} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white rounded-lg text-xs font-black transition shadow-lg flex items-center gap-2">
                                    <JsonIcon /> {copyStatus === 'all-json' ? 'COPIED!' : 'COPY ALL JSON'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {content.senses.map((sense) => (
                                <div key={sense.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-cyan-900/30 text-cyan-400 text-xs font-black px-2 py-0.5 rounded border border-cyan-800">SENSE {sense.id}</span>
                                            </div>
                                            {sense.isEditing ? (
                                                <textarea value={sense.text} onChange={(e) => updateSenseText(sense.id, e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded text-sm outline-none min-h-[100px] font-mono" />
                                            ) : (
                                                <div className="bg-black/20 p-3 rounded border border-white/5">
                                                    <p className="text-gray-200 text-sm leading-relaxed font-mono whitespace-pre-wrap">{sense.text}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex sm:flex-col gap-2 min-w-[150px]">
                                            <button onClick={() => handleCopyText(sense.text, `s-${sense.id}`)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded transition">
                                                {copyStatus === `s-${sense.id}` ? '✓' : <CopyIcon />} COPY CODE
                                            </button>
                                            <div className="flex gap-2">
                                                <button onClick={() => toggleEdit(sense.id)} className={`flex-1 p-2 rounded transition ${sense.isEditing ? 'bg-blue-600' : 'bg-gray-700'}`}><EditIcon /></button>
                                                <button onClick={() => handleRegenerateSense(sense.id)} disabled={sense.isRegenerating} className="flex-1 p-2 bg-gray-700 rounded transition">{sense.isRegenerating ? <Spinner className="m-0 h-4 w-4"/> : <RefreshIcon />}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {error && <div className="mt-6 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded text-center text-sm">{error}</div>}
            </div>
        </div>
    );
};

export default LoveSeaFishGenerator;