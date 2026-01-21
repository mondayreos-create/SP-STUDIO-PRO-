import React, { useState, useCallback, useEffect } from 'react';
import { 
    generateScenesFromStory, 
    VisualScene, 
    generateImage, 
    generateCharacters, 
    Character,
    generateSimpleStory 
} from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

// Added missing RefreshIcon component definition to resolve the compilation error.
const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <TrashIcon /> Clear Project
        </button>
    </div>
);

const ImageStoryV1Generator: React.FC = () => {
    // Inputs
    const [story, setStory] = useState('');
    const [minutes, setMinutes] = useState(2);
    
    // Characters
    const [characters, setCharacters] = useState<(Character & { id: string })[]>([]);
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);
    const [charCount, setCharCount] = useState(2);
    
    // Results
    const [scenes, setScenes] = useState<VisualScene[]>([]);
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sceneImages, setSceneImages] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});
    const [copyStatus, setCopyStatus] = useState<number | null>(null);

    // PERSISTENCE LISTENERS
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'image-story-v1') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'image-story-v1',
                title: summary || story.substring(0, 30) || "3D Image Story",
                data: { story, minutes, characters, scenes, summary }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'image-story-v1') return;
            const d = e.detail.data;
            if (d.story) setStory(d.story);
            if (d.minutes) setMinutes(d.minutes);
            if (d.characters) setCharacters(d.characters);
            if (d.scenes) setScenes(d.scenes);
            if (d.summary) setSummary(d.summary);
            setError(null);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [story, minutes, characters, scenes, summary]);

    const handleAutoGenerateCharacters = async () => {
        if (!story.trim()) {
            setError("Please paste a story first to generate characters.");
            return;
        }
        setIsGeneratingChars(true);
        setError(null);
        try {
            const prompt = `Based on this story: "${story}", create ${charCount} key characters for a 3D animated film. Describe their appearance, clothing, and facial features in extreme detail for 3D render consistency.`;
            const gen = await generateCharacters(prompt, charCount);
            setCharacters(gen.map(c => ({ ...c, id: crypto.randomUUID() })));
        } catch (err) {
            setError("Failed to generate characters.");
        } finally {
            setIsGeneratingChars(false);
        }
    };

    const handleCreateStory = async () => {
        if (!story.trim()) {
            setError("Please paste a story.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setScenes([]);
        setSummary('');
        
        try {
            // 1. Generate Story Summary First
            const summaryRes = await generateSimpleStory({
                topic: `Analyze and summarize this story for a 3D animated film project: "${story}"`,
                style: "3D Animation Script Style",
                length: "Short"
            });
            setSummary(summaryRes.storyContent);

            // 2. Prepare Context for Scenes
            const charContext = characters.map(c => `${c.name} (${c.gender}, ${c.age}): ${c.description}`).join('\n');
            const totalSeconds = minutes * 60;
            const sceneCount = Math.ceil(totalSeconds / 8);
            
            const contextPrompt = `
                STORY: ${story}
                SYNOPSIS: ${summaryRes.storyContent}
                CHARACTERS: ${charContext}
                VISUAL STYLE: 3D Pixar/Disney Animation Style, 4K High Detail, Vibrant.
                
                CRITICAL: Every scene description and prompt MUST follow a 3D animated movie sense. 
                Keep character appearances 100% consistent across all prompts.
            `;

            const generatedScenes = await generateScenesFromStory(contextPrompt, sceneCount);
            setScenes(generatedScenes);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate story production.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async (sceneNumber: number, prompt: string) => {
        setSceneImages(prev => ({ ...prev, [sceneNumber]: { loading: true, url: null, error: null } }));
        try {
            // Force 3D Style in every individual image generation
            const finalPrompt = `3D Pixar Disney Style Animation, High Quality 4K Render. ${prompt}. No text in image.`;
            const imageUrl = await generateImage(finalPrompt, '16:9');
            setSceneImages(prev => ({ ...prev, [sceneNumber]: { loading: false, url: imageUrl, error: null } }));
        } catch (err) {
            setSceneImages(prev => ({ ...prev, [sceneNumber]: { loading: false, url: null, error: "Render failed" } }));
        }
    };

    const handleCopyPrompt = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(index);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleClear = () => {
        setStory('');
        setMinutes(2);
        setScenes([]);
        setSummary('');
        setCharacters([]);
        setSceneImages({});
        setError(null);
    };

    const updateChar = (id: string, field: keyof Character, value: string) => {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input & Config */}
                <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 lg:col-span-1 shadow-xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-1 uppercase tracking-tighter">
                            Image Story V1 Pro
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">3D Production Studio</p>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Paste Full Story</label>
                        <textarea 
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            placeholder="Once upon a time in a magical land..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white h-40 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                        />
                    </div>

                    {/* Character Section */}
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-blue-400 uppercase">🎭 Characters</h3>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={charCount} 
                                    onChange={e => setCharCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                                    className="w-10 bg-gray-800 border border-gray-600 rounded text-center text-xs text-white" 
                                />
                                <button 
                                    onClick={handleAutoGenerateCharacters}
                                    disabled={isGeneratingChars || !story.trim()}
                                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-black px-3 py-1 rounded transition flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isGeneratingChars ? <Spinner className="h-3 w-3 m-0"/> : <SparklesIcon />} Auto Gen
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {characters.map((char, index) => (
                                <div key={char.id} className="bg-gray-800 p-2 rounded-lg border border-gray-700 space-y-2">
                                    <div className="flex justify-between">
                                        <input 
                                            value={char.name} 
                                            onChange={e => updateChar(char.id, 'name', e.target.value)}
                                            placeholder="Name" 
                                            className="bg-transparent border-none text-xs font-bold text-white w-1/2 focus:ring-0" 
                                        />
                                        <button onClick={() => setCharacters(prev => prev.filter(c => c.id !== char.id))} className="text-gray-500 hover:text-red-500"><TrashIcon /></button>
                                    </div>
                                    <textarea 
                                        value={char.description}
                                        onChange={e => updateChar(char.id, 'description', e.target.value)}
                                        placeholder="Appearance..."
                                        className="w-full bg-black/30 border-none rounded p-1 text-[10px] text-gray-400 h-10 resize-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                            {characters.length === 0 && (
                                <p className="text-[10px] text-gray-600 italic text-center py-4">No characters defined. Use Auto-Gen above.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Video Duration (Minutes)</label>
                        <div className="flex items-center bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                            <button onClick={() => setMinutes(Math.max(1, minutes - 1))} className="px-5 py-3 bg-gray-700 hover:bg-gray-600 transition text-white font-bold">-</button>
                            <input type="number" readOnly value={minutes} className="w-full text-center bg-transparent outline-none text-white font-black text-xl" />
                            <button onClick={() => setMinutes(Math.min(10, minutes + 1))} className="px-5 py-3 bg-gray-700 hover:bg-gray-600 transition text-white font-bold">+</button>
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateStory} 
                        disabled={isLoading || characters.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-xl shadow-2xl transition transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg group"
                    >
                        {isLoading ? <Spinner /> : <span className="group-hover:scale-125 transition-transform">🎬</span>} 
                        {isLoading ? 'Directing...' : 'Craters Story'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-center text-xs animate-shake">{error}</div>}
                </div>

                {/* Right: Output & Results */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Story Summary Block */}
                    {summary && (
                        <div className="bg-blue-900/10 p-6 rounded-2xl border border-blue-500/20 animate-fade-in shadow-lg">
                            <h3 className="text-sm font-black text-blue-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                                <span className="text-xl">📝</span> 3D Story Synopsis
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed font-serif italic border-l-2 border-blue-500/50 pl-4">
                                {summary}
                            </p>
                        </div>
                    )}

                    <div className="bg-gray-800/60 p-4 rounded-2xl border border-gray-700 min-h-[600px] flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Storyboard Results</h3>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-black bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full border border-purple-800 uppercase">3D Theme Active</span>
                                {scenes.length > 0 && <span className="text-[10px] font-black bg-green-900/30 text-green-400 px-3 py-1 rounded-full border border-green-800 uppercase">{scenes.length} Senses Produced</span>}
                            </div>
                        </div>
                        
                        {scenes.length === 0 && !isLoading && (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-900/30">
                                <span className="text-6xl mb-4 opacity-10">🎞️</span>
                                <p className="text-lg font-bold opacity-30">Production awaits your script.</p>
                                <p className="text-xs mt-2 opacity-20">Set up your characters and click Craters Story.</p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex-grow flex flex-col items-center justify-center p-12">
                                <Spinner className="h-16 w-16 text-blue-500 mb-6" />
                                <h4 className="text-xl font-bold text-white mb-2 animate-pulse">Rendering Senses...</h4>
                                <p className="text-gray-500 text-xs text-center max-w-xs uppercase tracking-widest">Analyzing characters and enforcing 3D visual consistency</p>
                            </div>
                        )}

                        <div className="space-y-8 overflow-y-auto max-h-[1000px] custom-scrollbar pr-2 pb-10">
                            {scenes.map((scene, idx) => (
                                <div key={idx} className="bg-gray-900/80 rounded-2xl border border-gray-700 shadow-xl overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                                    <div className="bg-gray-800/80 px-5 py-3 border-b border-gray-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 font-black flex items-center justify-center border border-blue-700 text-xs shadow-inner">{scene.scene_number}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sense {scene.scene_number}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleCopyPrompt(scene.visual_prompt, idx)}
                                            className="text-gray-500 hover:text-white transition-colors"
                                            title="Copy 3D Image Prompt"
                                        >
                                            {copyStatus === idx ? <span className="text-green-400 text-[10px] font-bold">✓ Copied!</span> : <CopyIcon />}
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2">
                                        {/* Narrative */}
                                        <div className="p-6 space-y-4 border-b md:border-b-0 md:border-r border-gray-700 bg-black/10">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-[0.2em]">Narrative Detail</h4>
                                                <p className="text-sm text-gray-200 leading-relaxed font-serif italic">
                                                    "{scene.narrative}"
                                                </p>
                                            </div>
                                            <div className="bg-black/40 p-3 rounded-lg border border-gray-800">
                                                <h4 className="text-[9px] font-black text-blue-500 uppercase mb-1 tracking-widest">3D Render Prompt</h4>
                                                <p className="text-[10px] text-gray-400 font-mono leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                                                    {scene.visual_prompt}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Rendering Area */}
                                        <div className="p-4 bg-black flex flex-col items-center justify-center relative group/img">
                                            {sceneImages[scene.scene_number]?.url ? (
                                                <div className="w-full h-full relative">
                                                    <img src={sceneImages[scene.scene_number].url!} alt={`Sense ${scene.scene_number}`} className="w-full h-full object-contain rounded-lg shadow-2xl" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-4">
                                                        <a href={sceneImages[scene.scene_number].url!} download={`3D_Sense_${scene.scene_number}.png`} className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition transform hover:scale-110 shadow-xl">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                        </a>
                                                        <button 
                                                            onClick={() => handleGenerateImage(scene.scene_number, scene.visual_prompt)}
                                                            className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition transform hover:scale-110 shadow-xl"
                                                        >
                                                            <RefreshIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleGenerateImage(scene.scene_number, scene.visual_prompt)}
                                                    disabled={sceneImages[scene.scene_number]?.loading}
                                                    className="w-full py-16 flex flex-col items-center justify-center text-gray-600 hover:text-blue-400 hover:bg-white/5 transition-all duration-300 group/btn rounded-xl"
                                                >
                                                    {sceneImages[scene.scene_number]?.loading ? (
                                                        <div className="flex flex-col items-center gap-4">
                                                            <Spinner className="h-10 w-10 text-blue-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 animate-pulse">Rendering 3D Visual...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-4xl mb-3 opacity-30 group-hover/btn:scale-125 transition-transform">🖼️</div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Render 4K Sense Image</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageStoryV1Generator;
