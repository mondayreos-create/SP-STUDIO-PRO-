
import React, { useState, useCallback, useEffect, useRef } from 'react';
// COMMENT: Fixed imports to use implemented types and functions from geminiService.
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
    ImageReference,
    Character,
    MvDetailedScene,
    StoryIdea,
    generateMvStoryIdeas,
    generateDetailedMvScript,
    generateImage
} from '../services/geminiService.ts';
import { GoogleGenAI, Type } from "@google/genai";

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

// COMMENT: Added missing DownloadIcon component definition.
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project | សម្អាតគម្រោង
        </button>
    </div>
);

const StoryGeneratorMv: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [inputStory, setInputStory] = useState('');
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<StoryIdea | null>(null);
    const [selectedStyle, setSelectedStyle] = useState('3D Pixar/Disney');
    const [charCount, setCharCount] = useState(2);
    const [sceneCount, setSceneCount] = useState(15);
    const [characters, setCharacters] = useState<(Character & { id: number; image?: ImageReference; isAnalyzing?: boolean })[]>([]);
    const [finalScenes, setFinalScenes] = useState<(MvDetailedScene & { isLoading: boolean, imageUrl?: string })[]>([]);
    const [copyStatus, setCopyStatus] = useState<number | string | null>(null);

    // COMMENT: Implemented missing handleClear function.
    const handleClear = () => {
        setStep(1);
        setInputStory('');
        setStoryIdeas([]);
        setSelectedIdea(null);
        setCharacters([]);
        setFinalScenes([]);
        setError(null);
        setProgress(0);
    };

    const handleGenerateIdeas = async () => {
        if (!inputStory.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const ideas = await generateMvStoryIdeas(inputStory);
            setStoryIdeas(ideas);
        } catch (err) {
            setError("Failed to generate ideas.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectIdea = (idea: StoryIdea) => {
        setSelectedIdea(idea);
        setStep(2);
    };

    // COMMENT: Implemented missing handleUpdateCharacter function.
    const handleUpdateCharacter = (index: number, field: keyof Character, value: string) => {
        const updated = [...characters];
        if (updated[index]) {
            updated[index] = { ...updated[index], [field]: value };
            setCharacters(updated);
        }
    };

    // COMMENT: Implemented missing handleCharImageUpload function for visual trait analysis.
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
                    console.error("Analysis failed", err);
                    setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isAnalyzing: false } : c));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateCharacters = async () => {
        if (!selectedIdea) return;
        setIsLoading(true);
        setError(null);
        try {
            const context = `Story: ${selectedIdea.title}. ${selectedIdea.summary}. Style: ${selectedStyle}`;
            const gen = await generateCharacters(context, charCount);
            setCharacters(gen.map((c, i) => ({ ...c, id: Date.now() + i })));
        } catch (err) {
            setError("Failed to generate characters.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateStory = async () => {
        if (!selectedIdea || characters.length === 0) return;
        setIsLoading(true);
        setError(null);
        setFinalScenes([]);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Create a high-speed production storyboard for: ${selectedIdea.title}. Summary: ${selectedIdea.summary}. Visual Style: ${selectedStyle}. Characters: ${JSON.stringify(characters)}. Generate ${sceneCount} scenes.`;
            
            const result = await generateDetailedMvScript(prompt, characters, selectedStyle);
            setFinalScenes(result.map(s => ({ ...s, isLoading: false })));
            setStep(3);
        } catch (err) {
            setError("Storyboard production failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = finalScenes[index];
        if (!scene) return;

        setFinalScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true } : s));
        try {
            const url = await generateImage(scene.full_prompt, '16:9');
            setFinalScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoading: false } : s));
        } catch (err) {
            setFinalScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: false } : s));
        }
    };

    // COMMENT: Implemented missing handleDownloadSingle function.
    const handleDownloadSingle = (url: string, id: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Story_Scene_${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyText = (text: string, id: number | string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input Panel */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 lg:col-span-1 shadow-xl">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                        Story Generator MV
                    </h2>

                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <textarea value={inputStory} onChange={e => setInputStory(e.target.value)} placeholder="Enter story topic..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-48 resize-none focus:ring-2 focus:ring-purple-500 outline-none" />
                            <button onClick={handleGenerateIdeas} disabled={isLoading || !inputStory.trim()} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2">
                                {isLoading ? <Spinner /> : '💡'} Get Story Ideas
                            </button>
                            <div className="space-y-3">
                                {storyIdeas.map((idea, idx) => (
                                    <div key={idx} className="bg-gray-900 p-3 rounded border border-gray-700 hover:border-purple-500 transition cursor-pointer" onClick={() => handleSelectIdea(idea)}>
                                        <h4 className="font-bold text-white text-sm">{idea.title}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">{idea.summary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Subject Count</label>
                                <input type="number" min="1" max="6" value={charCount} onChange={e => setCharCount(parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-center" />
                            </div>
                            <button onClick={handleGenerateCharacters} disabled={isLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2">
                                {isLoading ? <Spinner /> : '👥'} Auto-Generate Cast
                            </button>
                            <div className="space-y-4">
                                {characters.map((char, index) => (
                                    <div key={char.id} className="bg-gray-800 p-3 rounded border border-gray-700">
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
                            <button onClick={handleCreateStory} disabled={isLoading || characters.length === 0} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-3">
                                {isLoading ? <Spinner /> : '🎬'} Start Production 🚀
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center p-6 space-y-4 animate-fade-in">
                            <div className="text-4xl">✅</div>
                            <h3 className="text-xl font-bold text-white">Production Ready</h3>
                            <button onClick={() => setStep(2)} className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg">Edit Cast</button>
                            <button onClick={handleClear} className="w-full py-2 bg-gray-900 text-red-400 rounded-lg border border-red-900/30">Start Over</button>
                        </div>
                    )}
                </div>

                {/* Right: Output Gallery */}
                <div className="lg:col-span-2 space-y-6">
                    {finalScenes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                            {finalScenes.map((scene, idx) => (
                                <div key={idx} className="bg-gray-900 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col group">
                                    <div className="aspect-video bg-black relative flex items-center justify-center">
                                        {scene.imageUrl ? (
                                            <img src={scene.imageUrl} className="w-full h-full object-cover" alt="scene" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                {scene.isLoading ? <Spinner className="h-8 w-8 text-purple-500" /> : <button onClick={() => handleGenerateImage(idx)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-lg">Render Image</button>}
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-700">SENSE {scene.scene_number}</div>
                                        {scene.imageUrl && (
                                            <button onClick={() => handleDownloadSingle(scene.imageUrl!, scene.scene_number)} className="absolute bottom-2 right-2 p-2 bg-white/10 hover:bg-emerald-600 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition shadow-xl"><DownloadIcon /></button>
                                        )}
                                    </div>
                                    <div className="p-4 flex-grow flex flex-col bg-gradient-to-b from-gray-900 to-black">
                                        <p className="text-gray-300 text-xs italic leading-relaxed mb-4">"{scene.action}"</p>
                                        <div className="mt-auto flex justify-between pt-3 border-t border-gray-800">
                                            <button onClick={() => handleCopyText(scene.full_prompt, idx)} className="text-[10px] text-gray-500 hover:text-white transition uppercase font-black">
                                                {copyStatus === idx ? '✓ Copied' : 'Copy Prompt'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
                            <span className="text-5xl mb-4">🎬</span>
                            <p className="text-lg font-semibold">Storyboard Hub</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryGeneratorMv;
