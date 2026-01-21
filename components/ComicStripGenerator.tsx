
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    generateConsistentStoryScript, 
    generateImage, 
    generateCharacters, 
    analyzeCharacterReference,
    Character,
    generateSimpleStory,
    ImageReference
} from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const JsonIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <TrashIcon /> Clear Project
        </button>
    </div>
);

interface GeneratedSense {
    id: number;
    description: string;
    imageUrl?: string;
    isLoading: boolean;
    promptUsed?: string;
}

const ComicStripGenerator: React.FC = () => {
    const [synopsis, setSynopsis] = useState('');
    const [sceneCount, setSceneCount] = useState(5);
    const [charImages, setCharImages] = useState<ImageReference[]>([]);
    
    // Process States
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [scenes, setScenes] = useState<GeneratedSense[]>([]);
    const [copyState, setCopyState] = useState<string | null>(null);
    const stopSignal = useRef(false);

    // PERSISTENCE LISTENERS
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'comic-strip-x') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'comic-strip-x',
                title: synopsis.substring(0, 30) || "3D Comic Project",
                data: { synopsis, sceneCount, charImages, scenes }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'comic-strip-x') return;
            const d = e.detail.data;
            if (d.synopsis) setSynopsis(d.synopsis);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.charImages) setCharImages(d.charImages);
            if (d.scenes) setScenes(d.scenes);
            setError(null);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [synopsis, sceneCount, charImages, scenes]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (charImages.length >= 7) {
                setError("Character limit reached (Max 7).");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setCharImages(prev => [...prev, {
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                }]);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStart = async () => {
        if (!synopsis.trim()) {
            setError("Please provide a story synopsis first.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setScenes([]);
        setProgress(0);
        stopSignal.current = false;

        try {
            // 1. Analyze Character Images (Up to 7)
            setStatusText('Analyzing Character Vision...');
            setProgress(5);
            
            const analyzedTraits: string[] = [];
            for (let i = 0; i < charImages.length; i++) {
                if (stopSignal.current) break;
                setStatusText(`Scanning character ${i + 1}/${charImages.length}...`);
                const analysis = await analyzeCharacterReference(charImages[i].base64, charImages[i].mimeType);
                analyzedTraits.push(analysis.characterDescription);
                setProgress(5 + Math.round(((i + 1) / charImages.length) * 10));
            }
            
            const charContext = analyzedTraits.length > 0 
                ? analyzedTraits.join('\n\n')
                : "Generate unique 3D characters as needed for the story.";

            // 2. Generate Multi-Scene Script
            setStatusText('Architecting 3D Storyboard...');
            const script = await generateConsistentStoryScript(synopsis, sceneCount);
            
            const initialScenes: GeneratedSense[] = script.map(s => ({
                id: s.sceneNumber,
                description: s.action,
                isLoading: true
            }));
            setScenes(initialScenes);
            setProgress(25);

            // 3. Render Images Sequentially
            const consistencyInstruction = `
                STYLE: 3D Pixar Disney Style Animation. 4K High Detail.
                CRITICAL: Keep character faces and outfits 100% identical in every scene.
                DO NOT change the character features or art style. 
                Everything must follow a consistent 3D world sense.
            `;

            for (let i = 0; i < initialScenes.length; i++) {
                if (stopSignal.current) break;
                setStatusText(`Rendering Sense ${i + 1} of ${sceneCount}...`);

                const scene = initialScenes[i];
                const fullPrompt = `
                    ${consistencyInstruction}
                    CHARACTERS: ${charContext}
                    SCENE: ${script[i].action}
                    SETTING: ${script[i].consistentContext}
                `;

                try {
                    const imageUrl = await generateImage(fullPrompt, '1:1');
                    setScenes(prev => prev.map(s => 
                        s.id === scene.id 
                            ? { ...s, imageUrl: imageUrl, isLoading: false, promptUsed: fullPrompt } 
                            : s
                    ));
                } catch (err) {
                    console.error(`Sense ${scene.id} failed`, err);
                    setScenes(prev => prev.map(s => 
                        s.id === scene.id 
                            ? { ...s, isLoading: false, promptUsed: fullPrompt } 
                            : s
                    ));
                }

                setProgress(25 + Math.round(((i + 1) / initialScenes.length) * 75));
                if (i < initialScenes.length - 1) await new Promise(r => setTimeout(r, 1500));
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Production error.");
        } finally {
            setIsProcessing(false);
            setStatusText('');
        }
    };

    const handleStop = () => {
        stopSignal.current = true;
        setIsProcessing(false);
        setStatusText('Production Paused.');
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyState(id);
        setTimeout(() => setCopyState(null), 2000);
    };

    const handleDownload = (url: string, id: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `3D_Sense_${id}_Production.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setSynopsis('');
        setSceneCount(5);
        setCharImages([]);
        setScenes([]);
        setError(null);
        setProgress(0);
        setStatusText('');
    };

    const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input Panel */}
                <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-1 uppercase tracking-tighter">
                            Comic Strip X (3D)
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Autonomous 3D Scripting</p>
                    </div>

                    <div className="space-y-6">
                        {/* 7 Image Character Vault */}
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-3">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                                🎭 Character Reference Vault ({charImages.length}/7)
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {charImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} alt="Char" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => setCharImages(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <TrashIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                {charImages.length < 7 && (
                                    <label className="cursor-pointer aspect-square bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-cyan-500 transition-colors">
                                        <span className="text-xl text-gray-500">+</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                            <p className="text-[9px] text-gray-600 italic">Upload 3D style character images for 100% facial consistency.</p>
                        </div>

                        {/* Synopsis */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Story Synopsis (សាច់រឿងសង្ខេប)</label>
                            <textarea 
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Describe the story from beginning to end..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-40 resize-none focus:ring-2 focus:ring-blue-500 outline-none shadow-inner text-sm"
                            />
                        </div>

                        {/* Sense Count */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Production Volume (1-99 Senses)</label>
                            <input 
                                type="number" min="1" max="99" 
                                value={sceneCount}
                                onChange={(e) => setSceneCount(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {isProcessing ? (
                            <div className="space-y-3">
                                <button 
                                    onClick={handleStop}
                                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 text-sm uppercase tracking-widest"
                                >
                                    Stop Production
                                </button>
                                <div className="text-center">
                                    <p className="text-[10px] text-cyan-400 font-bold animate-pulse uppercase tracking-tighter">{statusText}</p>
                                    <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleStart} 
                                disabled={synopsis === ''}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-black rounded-xl shadow-2xl transition transform active:scale-[0.98] disabled:opacity-50 text-lg flex items-center justify-center gap-3 uppercase tracking-widest"
                            >
                                🚀 Get Go (Auto Create)
                            </button>
                        )}
                    </div>
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-xs animate-shake">{error}</div>}
                </div>

                {/* Right: Output Gallery */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 sticky top-0 z-10 backdrop-blur shadow-xl flex justify-between items-center">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Production Canvas ({scenes.length} Senses)</h3>
                        <div className="flex gap-2">
                             {scenes.length > 0 && (
                                <button onClick={() => handleCopy(JSON.stringify(scenes, null, 2), 'project-json')} className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-bold transition border border-gray-700 flex items-center gap-2">
                                    {/* FIX: Corrected variable name from copyStatus to copyState to match state definition. */}
                                    {copyState === 'project-json' ? <span className="text-green-400">Copied!</span> : <><JsonIcon /> Project JSON</>}
                                </button>
                             )}
                        </div>
                    </div>

                    {isProcessing && scenes.length === 0 && (
                        <div className="bg-gray-900/50 p-20 rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center animate-pulse">
                            <Spinner className="h-16 w-16 text-blue-500 mb-6" />
                            <p className="text-white font-black text-xl uppercase tracking-widest">{statusText}</p>
                            <p className="text-xs text-gray-500 mt-2">Initializing 3D Style Engine...</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                                <div className="aspect-square bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <img src={scene.imageUrl} className="w-full h-full object-cover" alt={`Sense ${scene.id}`} />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            {scene.isLoading ? (
                                                <>
                                                    <Spinner className="h-10 w-10 text-cyan-500" />
                                                    <span className="text-[10px] text-gray-500 font-black uppercase animate-pulse">Rendering 3D...</span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Queue Position #{scene.id}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-700 shadow-md">SENSE {scene.id}</div>
                                    {scene.imageUrl && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                            <button 
                                                onClick={() => handleDownload(scene.imageUrl!, scene.id)} 
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110 shadow-xl" 
                                                title="Download Sense Image"
                                            >
                                                <DownloadIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleCopy(scene.promptUsed || '', `copy-p-${idx}`)} 
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110 shadow-xl" 
                                                title="Copy AI Prompt"
                                            >
                                                {/* FIX: Corrected variable name from copyStatus to copyState to match state definition. */}
                                                {copyState === `copy-p-${idx}` ? <span className="text-[10px] font-bold">✓</span> : <CopyIcon />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-grow flex flex-col bg-gradient-to-b from-gray-900 to-black">
                                    <p className="text-gray-300 text-xs leading-relaxed italic border-l-2 border-cyan-500 pl-3 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                                        "{scene.description}"
                                    </p>
                                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-800">
                                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">3D Style Verified</span>
                                        <button 
                                            onClick={() => handleCopy(JSON.stringify(scene, null, 2), `json-${idx}`)} 
                                            className="text-[10px] text-cyan-400 hover:text-cyan-300 transition font-black uppercase flex items-center gap-1"
                                        >
                                            {/* FIX: Corrected variable name from copyStatus to copyState to match state definition. */}
                                            {copyState === `json-${idx}` ? <span className="text-green-400">✓ Done</span> : <><JsonIcon /> JSON Code</>}
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

export default ComicStripGenerator;
