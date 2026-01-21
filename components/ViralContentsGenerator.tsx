
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { generateImage, generateVoiceover, generateConsistentStoryScript, generatePromptFromUrl, generatePromptFromVideo, analyzeCharacterReference } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

const VideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const spinBoxOptions = [
    { label: "Set 6 Senses (ASMR)", count: 6, icon: "💎", prompt: "Hyper-realistic satisfying deep cleaning and restoration ASMR. Extreme focus on textures like rust, foam, and high-gloss paint. Scene 6 must be 100% clean." },
    { label: "Set 8 Senses (Mystery)", count: 8, icon: "🕵️", prompt: "First-person perspective (POV) finding a hidden secret or mysterious object in an abandoned location. High tension, shaky cam feel. Climax in sense 8." },
    { label: "Set 12 Senses (3D Story)", count: 12, icon: "🌙", prompt: "Cozy 3D Pixar-style bedtime story for kids. Soft lighting, glowing stars, and peaceful forest animals. A long magical journey." },
    { label: "Set 6 Senses (DIY)", count: 6, icon: "🛠️", prompt: "High-speed professional DIY life hack. 100% realistic hands using tools to build something incredible from simple materials." },
    { label: "Set 10 Senses (Dark)", count: 10, icon: "🎬", prompt: "Cinematic dark academic motivation style. Moody lighting, historical library setting, intense intellectual atmosphere." },
    { label: "Set 8 Senses (Hydraulic)", count: 8, icon: "🚜", prompt: "The ultimate power of a 1000-ton hydraulic press vs interesting objects. Extreme detail, slow-motion sparks and debris." }
];

interface ViralScene {
    id: number;
    title: string;
    description: string;
    prompt: string;
    voiceover: string;
    imageUrl?: string;
    isLoading: boolean;
}

const ViralContentsGenerator: React.FC = () => {
    const [mode, setMode] = useState<'clone' | 'manual'>('manual');
    const [cloneSource, setCloneSource] = useState<'link' | 'file'>('link');
    const [inputUrl, setInputUrl] = useState('');
    const [videoFile, setVideoFile] = useState<{ base64: string, mimeType: string, name: string } | null>(null);
    const [masterPrompt, setMasterPrompt] = useState('');
    const [senseCount, setSenseCount] = useState(6);
    const [scenes, setScenes] = useState<ViralScene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [analyzingRef, setAnalyzingRef] = useState(false);

    const [displaySpins, setDisplaySpins] = useState(spinBoxOptions);

    const handleShufflePresets = () => {
        const shuffled = [...spinBoxOptions].sort(() => Math.random() - 0.5);
        setDisplaySpins(shuffled);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setVideoFile({
                    base64: base64String.split(',')[1],
                    mimeType: file.type,
                    name: file.name
                });
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClonePrompt = async () => {
        if (cloneSource === 'link' && !inputUrl.trim()) return;
        if (cloneSource === 'file' && !videoFile) return;

        setAnalyzingRef(true);
        setError(null);
        try {
            let extracted = '';
            if (cloneSource === 'link') {
                extracted = await generatePromptFromUrl(inputUrl, 'Social Media (Auto-Clone)');
            } else if (videoFile) {
                extracted = await generatePromptFromVideo(videoFile.base64, videoFile.mimeType);
            }
            setMasterPrompt(`[CLONE X ACTIVE] Vibe Extracted: ${extracted}\n\nUpdate this architecture for 2026 viral trends: `);
            setMode('manual');
        } catch (err) {
            setError("Failed to clone prompt from source.");
        } finally {
            setAnalyzingRef(false);
        }
    };

    const handleArchitectContent = async () => {
        if (!masterPrompt.trim()) {
            setError("Please enter a concept or clone a prompt first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setScenes([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = 'gemini-3-flash-preview';

            const systemInstruction = `
                You are a Viral Content Architect (X Series). 
                Generate exactly ${senseCount} Senses (scenes) for a high-retention video.
                Structure:
                1. Hook (Sense 1): Must grab attention in 3 seconds.
                2. Buildup: Scenes 2 to ${senseCount - 1}.
                3. The Payoff (Sense ${senseCount}): The final satisfying climax or result.
                
                For each sense, provide:
                - title: Catchy name for the sense.
                - description: Internal action description.
                - prompt: A highly detailed 100% realistic video generation prompt.
                - voiceover: A professional short narration script (max 30 words).
                
                Maintain character and style consistency throughout all ${senseCount} senses.
            `;

            const response = await ai.models.generateContent({
                model,
                contents: masterPrompt,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.INTEGER },
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                prompt: { type: Type.STRING },
                                voiceover: { type: Type.STRING }
                            },
                            required: ["id", "title", "description", "prompt", "voiceover"]
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "[]");
            setScenes(result.map((s: any) => ({ ...s, isLoading: false })));
        } catch (err) {
            setError("Failed to architect scenes.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenderScene = async (index: number) => {
        const scene = scenes[index];
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true } : s));
        try {
            const url = await generateImage(scene.prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoading: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: false } : s));
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllSenses = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.id}:\n${s.prompt}`).join('\n\n');
        handleCopy(text, 'all-senses-bulk');
    };

    const handleCopyAllJSON = () => {
        if (scenes.length === 0) return;
        const data = scenes.map(s => ({
            id: s.id,
            video_prompt: s.prompt
        }));
        handleCopy(JSON.stringify(data, null, 2), 'all-json-bulk');
    };

    const handleClear = () => {
        setMasterPrompt('');
        setScenes([]);
        setInputUrl('');
        setVideoFile(null);
        setError(null);
    };

    const handleSelectSpin = (opt: typeof spinBoxOptions[0]) => {
        setSenseCount(opt.count);
        setMasterPrompt(opt.prompt);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: CONTROLS (THE ARCHITECT) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/90 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 transform -rotate-3">
                                <span className="text-2xl">🧬</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 uppercase tracking-tighter">
                                    Viral Architect X
                                </h2>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Clone • Script • Direct</p>
                            </div>
                        </div>

                        <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-gray-800 mb-6 shadow-inner">
                            <button onClick={() => setMode('manual')} className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all duration-300 ${mode === 'manual' ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>1. Update Idea</button>
                            <button onClick={() => setMode('clone')} className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all duration-300 ${mode === 'clone' ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>2. Clone Content</button>
                        </div>

                        {mode === 'clone' ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex bg-[#0f172a] p-1 rounded-xl border border-gray-800 mb-2">
                                    <button onClick={() => setCloneSource('link')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition ${cloneSource === 'link' ? 'bg-cyan-900/40 text-cyan-400' : 'text-gray-600'}`}>URL Link</button>
                                    <button onClick={() => setCloneSource('file')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition ${cloneSource === 'file' ? 'bg-cyan-900/40 text-cyan-400' : 'text-gray-600'}`}>Load Video</button>
                                </div>

                                {cloneSource === 'link' ? (
                                    <div className="p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-2xl">
                                        <label className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3">Target URL (Video Link)</label>
                                        <input 
                                            type="text" 
                                            value={inputUrl}
                                            onChange={(e) => setInputUrl(e.target.value)} 
                                            placeholder="Paste link to extract Viral DNA..."
                                            className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3.5 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-gray-700"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-2xl">
                                        <label className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3">Upload Source Video</label>
                                        <label className="flex flex-col items-center justify-center w-full h-32 bg-[#0f172a] border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-all">
                                            {videoFile ? (
                                                <div className="text-center px-4">
                                                    <span className="text-2xl block mb-1">🎬</span>
                                                    <span className="text-[10px] text-cyan-400 font-bold truncate block w-full">{videoFile.name}</span>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <span className="text-2xl block mb-1">📁</span>
                                                    <span className="text-[10px] text-gray-500 font-bold">MP4 / WEBM (MAX 5 MIN)</span>
                                                </div>
                                            )}
                                            <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={handleClonePrompt}
                                    disabled={analyzingRef || (cloneSource === 'link' ? !inputUrl : !videoFile)}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                >
                                    {analyzingRef ? <Spinner /> : '⚡'} Extract Viral Vibe
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Spin Box (Pro Niches)</label>
                                        <button onClick={handleShufflePresets} className="p-1 hover:rotate-180 transition-transform duration-500 text-gray-600 hover:text-cyan-400"><RefreshIcon /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {displaySpins.map((opt) => (
                                            <button 
                                                key={opt.label}
                                                onClick={() => handleSelectSpin(opt)}
                                                className={`p-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border shadow-sm ${masterPrompt === opt.prompt ? 'bg-cyan-900/40 border-cyan-500 text-white' : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                                            >
                                                <span className="text-sm">{opt.icon}</span> 
                                                <span className="truncate">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-[#0f172a] rounded-2xl border border-gray-800 shadow-inner">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Master Production Idea</label>
                                    <textarea 
                                        value={masterPrompt}
                                        onChange={(e) => setMasterPrompt(e.target.value)}
                                        placeholder="Enter your concept here..."
                                        className="w-full bg-transparent border-none text-white h-32 resize-none text-xs focus:ring-0 outline-none placeholder-gray-800 leading-relaxed custom-scrollbar"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-800">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Set Senses (Scene Count)</label>
                                <span className="text-cyan-400 font-black text-xs">{senseCount} PARTS</span>
                            </div>
                            <div className="flex items-center bg-[#0f172a] rounded-2xl border border-gray-700 overflow-hidden shadow-inner p-1">
                                <button onClick={() => setSenseCount(Math.max(1, senseCount - 1))} className="flex-1 py-3 bg-[#1e293b] text-white hover:bg-gray-700 transition font-black rounded-xl">-</button>
                                <div className="flex-[2] text-center font-black text-white text-lg">{senseCount}</div>
                                <button onClick={() => setSenseCount(Math.min(50, senseCount + 1))} className="flex-1 py-3 bg-[#1e293b] text-white hover:bg-gray-700 transition font-black rounded-xl">+</button>
                            </div>
                        </div>

                        <button 
                            onClick={handleArchitectContent}
                            disabled={isLoading || !masterPrompt}
                            className="w-full mt-8 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-900/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm border-t border-white/20"
                        >
                            {isLoading ? <Spinner className="h-6 w-6" /> : <span className="text-xl">🛠️</span>} 
                            {isLoading ? 'Architecting...' : 'Build Storyboard'}
                        </button>
                    </div>
                </div>

                {/* RIGHT: THE PRODUCTION CANVAS */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-[700px]">
                    <div className="bg-[#111827]/90 p-8 rounded-[3rem] border border-gray-800 shadow-2xl flex flex-col h-full backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Production Canvas</h3>
                                {scenes.length > 0 && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Ready for 4K Video Generation</p>}
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
                                    </>
                                )}
                                <button onClick={handleClear} className="px-4 py-2 bg-red-950/20 text-red-500 border border-red-900/30 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-900 hover:text-white transition-all flex items-center gap-2">
                                    <TrashIcon /> Reset
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-8 relative z-10 pb-20">
                            {scenes.length > 0 ? (
                                scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-gray-800/20 rounded-[2.5rem] border border-gray-700/50 p-8 hover:border-cyan-500/30 transition-all group shadow-xl">
                                        <div className="flex flex-col xl:flex-row gap-8">
                                            {/* Scene Visual Slot */}
                                            <div className="w-full xl:w-72 aspect-video xl:aspect-square bg-black rounded-[1.5rem] overflow-hidden relative border border-gray-700 shrink-0 flex items-center justify-center shadow-2xl group-hover:border-cyan-500/50 transition-colors">
                                                {scene.imageUrl ? (
                                                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Production Frame" />
                                                ) : (
                                                    <div className="text-center p-6">
                                                        {scene.isLoading ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Spinner className="h-10 w-10 text-cyan-500 m-0" />
                                                                <span className="text-[9px] font-black text-cyan-400 uppercase animate-pulse">Rendering 4K...</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleRenderScene(idx)}
                                                                className="flex flex-col items-center gap-2 group/btn"
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800 group-hover/btn:border-cyan-500 transition-colors">
                                                                    <span className="text-xl text-gray-600 group-hover/btn:text-cyan-400">🖼️</span>
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase text-gray-600 group-hover/btn:text-cyan-400 tracking-widest">Render Visual</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full border border-white/10 uppercase tracking-tighter shadow-xl">
                                                    SENSE {scene.id}
                                                </div>
                                            </div>

                                            {/* Logic & Text */}
                                            <div className="flex-grow space-y-6">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-xl font-black text-cyan-400 uppercase tracking-tight mb-1">{scene.title}</h4>
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Production Phase {idx + 1}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleCopy(scene.prompt, `p-${idx}`)}
                                                            className={`p-2.5 bg-gray-900 rounded-xl text-gray-500 hover:text-white transition border border-gray-700 hover:border-cyan-500/50 shadow-lg`}
                                                            title="Copy Production Prompt"
                                                        >
                                                            {copyStatus === `p-${idx}` ? <span className="text-[10px] font-bold text-green-500">✓</span> : <CopyIcon />}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <p className="text-gray-300 text-sm leading-relaxed font-medium italic bg-white/5 p-4 rounded-2xl border-l-4 border-cyan-500 shadow-inner">
                                                    "{scene.description}"
                                                </p>
                                                
                                                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 relative group/vo">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                            Voiceover Script:
                                                        </span>
                                                        <button onClick={() => handleCopy(scene.voiceover, `v-${idx}`)} className="text-[9px] font-black text-indigo-400 uppercase hover:text-white transition opacity-0 group-hover/vo:opacity-100">Copy Text</button>
                                                    </div>
                                                    <p className="text-gray-400 text-sm font-serif leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                                                        {scene.voiceover}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-10 pointer-events-none grayscale">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-48 w-48 mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-3xl font-black uppercase tracking-[0.6em]">Production Awaiting</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-900/90 border border-red-700 text-red-100 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 z-50 animate-shake">
                    <span className="text-xl">⚠️</span>
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}
        </div>
    );
};

export default ViralContentsGenerator;
