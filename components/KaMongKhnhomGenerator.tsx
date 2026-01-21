
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    analyzeCharacterReference, 
    generateConsistentStoryScript, 
    generateImage, 
    ImageReference, 
    CharacterAnalysis 
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

// Added missing JsonIcon component definition
const JsonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

interface CharacterData extends ImageReference {
    description?: string;
    id: string;
}

interface Scene {
    id: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
    fullVideoPrompt: string;
}

const KaMongKhnhomGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [characterRefs, setCharacterRefs] = useState<CharacterData[]>([]);
    const [synopsis, setSynopsis] = useState('');
    const [sceneCount, setSceneCount] = useState(9);
    const [detectedStyle, setDetectedStyle] = useState<string | null>(null);
    const [showPromptOnly, setShowPromptOnly] = useState(false);
    
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'kamong-khnhom') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'kamong-khnhom',
                category: 'vip',
                title: synopsis.substring(0, 30) || "Character Story",
                data: { synopsis, sceneCount, scenes, detectedStyle, characterRefs, showPromptOnly }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'kamong-khnhom') return;
            const d = e.detail.data;
            if (d.synopsis) setSynopsis(d.synopsis);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.scenes) setScenes(d.scenes);
            if (d.detectedStyle) setDetectedStyle(d.detectedStyle);
            if (d.characterRefs) setCharacterRefs(d.characterRefs);
            if (d.showPromptOnly !== undefined) setShowPromptOnly(d.showPromptOnly);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [synopsis, sceneCount, scenes, detectedStyle, characterRefs, showPromptOnly]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            Array.from(files).slice(0, 6 - characterRefs.length).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64String = reader.result as string;
                    const base64 = base64String.split(',')[1];
                    const id = crypto.randomUUID();
                    
                    setCharacterRefs(prev => [...prev, { base64, mimeType: file.type, id }]);
                    
                    // Auto-analyze character
                    try {
                        const analysis = await analyzeCharacterReference(base64, file.type);
                        if (!detectedStyle) setDetectedStyle(analysis.artStyle);
                        
                        setCharacterRefs(prev => prev.map(c => 
                            c.id === id ? { ...c, description: analysis.characterDescription } : c
                        ));
                    } catch (e) {
                        console.error("Analysis failed", e);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeRefImage = (id: string) => {
        setCharacterRefs(prev => prev.filter((c) => c.id !== id));
        if (characterRefs.length <= 1) {
            setDetectedStyle(null);
        }
    };

    const handleGenerate = async () => {
        if (characterRefs.length === 0 || !synopsis) {
            setError("Please upload at least one character image and enter a story synopsis.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setScenes([]);

        try {
            // 1. Prepare Character Context
            const charactersDescription = characterRefs
                .map((c, i) => `Character ${i + 1}: ${c.description || 'Reference Image Provided'}`)
                .join('\n\n');

            const styleContext = detectedStyle || 'Photorealistic high quality';

            // 2. Generate Storyboard Script
            const scriptContext = `
                ACTOR/CHARACTER REFERENCES:
                ${charactersDescription}
                
                ART STYLE:
                ${styleContext}
                
                STORY IDEA:
                ${synopsis}
                
                CRITICAL INSTRUCTION:
                If TWO OR MORE character references are provided, THEY MUST ALL BE PRESENT in every scene together. They are the main duo/group. Ensure the script describes their interactions.
            `;

            const script = await generateConsistentStoryScript(scriptContext, sceneCount);
            
            const initialScenes = script.map(s => {
                const fullVideoPrompt = `STYLE: ${styleContext}\nCHARACTERS:\n${charactersDescription}\n\nSCENE ACTION:\n${s.action}\n\nVISUAL SETTING:\n${s.consistentContext}\n\nMANDATORY: \n1. Show ALL described characters together in this frame.\n2. Maintain 100% facial, outfit, and height consistency for each character.\n3. High detail, 8k, cinematic lighting. No text.`;
                
                return {
                    id: s.sceneNumber,
                    action: s.action,
                    consistentContext: s.consistentContext,
                    isLoadingImage: !showPromptOnly,
                    fullVideoPrompt: fullVideoPrompt
                };
            });
            setScenes(initialScenes);

            if (showPromptOnly) {
                setIsProcessing(false);
                return;
            }

            // 3. Render Images
            for (let i = 0; i < initialScenes.length; i++) {
                const scene = initialScenes[i];
                try {
                    const url = await generateImage(scene.fullVideoPrompt, '16:9');
                    setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, imageUrl: url, isLoadingImage: false } : s));
                } catch (err) {
                    setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, isLoadingImage: false } : s));
                }
                
                if (i < initialScenes.length - 1) await new Promise(r => setTimeout(r, 1200));
            }

        } catch (err) {
            setError("Production failed. Please check your connection.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllSenses = () => {
        const text = scenes.map(s => `Scene ${s.id}:\n${s.fullVideoPrompt}`).join('\n\n---\n\n');
        handleCopy(text, 'all-senses-copy');
    };

    const handleCopyAllJson = () => {
        const data = scenes.map(s => ({
            scene: s.id,
            prompt: s.fullVideoPrompt
        }));
        handleCopy(JSON.stringify(data, null, 2), 'all-json-copy');
    };

    const handleDownloadAll = () => {
        scenes.forEach((s, i) => {
            if (s.imageUrl) {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = s.imageUrl!;
                    link.download = `Story_Scene_${s.id}.png`;
                    link.click();
                }, i * 500);
            }
        });
    };

    const handleDownloadSingle = (url: string, id: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Story_Scene_${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setCharacterRefs([]);
        setSynopsis('');
        setSceneCount(9);
        setDetectedStyle(null);
        setScenes([]);
        setError(null);
        setShowPromptOnly(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in text-gray-100">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left side: Inputs */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#1e293b]/60 p-6 rounded-2xl border border-gray-700 shadow-2xl space-y-6 backdrop-blur-md">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-500 mb-2 flex items-center gap-2">
                            កាម៉ងខ្ញុំ (Character Story)
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">1. Character Reference (រូបថត) [Max 6]</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {characterRefs.map((char) => (
                                        <div key={char.id} className="relative aspect-square bg-[#0f172a] rounded-xl border border-gray-700 overflow-hidden group">
                                            <img src={`data:${char.mimeType};base64,${char.base64}`} alt="Ref" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeRefImage(char.id)}
                                                className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                    {characterRefs.length < 6 && (
                                        <label className="aspect-square cursor-pointer flex flex-col items-center justify-center bg-[#0f172a] rounded-xl border-2 border-dashed border-gray-700 hover:border-pink-500 transition-all group">
                                            <span className="text-2xl mb-1 opacity-20 group-hover:opacity-40 transition-opacity">👤</span>
                                            <span className="text-[8px] text-gray-500 font-bold uppercase text-center px-1">Add Character</span>
                                            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">2. Story Synopsis (សាច់រឿងសង្ខេប)</label>
                                <textarea 
                                    value={synopsis}
                                    onChange={(e) => setSynopsis(e.target.value)}
                                    placeholder="Describe the adventure with your characters..."
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-4 text-white h-32 resize-none focus:ring-2 focus:ring-pink-500 outline-none text-sm shadow-inner font-khmer leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">3. Scene Count (1-499)</label>
                                <div className="bg-[#0f172a] border border-gray-700 rounded-xl p-2 flex items-center justify-center gap-4">
                                    <input 
                                        type="number" min="1" max="499" 
                                        value={sceneCount}
                                        onChange={(e) => setSceneCount(Math.max(1, Math.min(499, parseInt(e.target.value) || 1)))}
                                        className="bg-transparent text-white font-black text-center text-2xl outline-none w-24"
                                    />
                                </div>
                            </div>

                            <div className="bg-[#0f172a]/80 p-4 rounded-xl border border-[#334155]">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={showPromptOnly} 
                                            onChange={e => setShowPromptOnly(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-10 h-5 rounded-full transition-colors ${showPromptOnly ? 'bg-pink-600' : 'bg-gray-700'}`}></div>
                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${showPromptOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-pink-400 uppercase tracking-tighter leading-tight">Show Prompt, no image</span>
                                        <span className="text-[9px] text-gray-500 italic">Generate only storyboard and visual codes.</span>
                                    </div>
                                </label>
                            </div>

                            {detectedStyle && (
                                <div className="bg-[#0f172a]/80 p-4 rounded-xl border border-cyan-900/30 animate-fade-in">
                                    <label className="block text-[10px] font-black text-cyan-400 uppercase mb-2 tracking-widest flex items-center gap-2">
                                        <span className="text-sm">🎨</span> Detected Art Style:
                                    </label>
                                    <p className="text-xs text-gray-400 leading-relaxed italic">{detectedStyle}</p>
                                </div>
                            )}

                            <button 
                                onClick={handleGenerate} 
                                disabled={isProcessing || characterRefs.length === 0 || !synopsis}
                                className="w-full py-4 bg-gradient-to-r from-pink-500 to-orange-600 hover:brightness-110 text-white font-black rounded-xl shadow-xl transition transform active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-pink-900/20"
                            >
                                {isProcessing ? <Spinner /> : '🚀'}
                                {isProcessing ? 'Processing...' : 'Get Go (Auto Create)'}
                            </button>
                        </div>
                    </div>
                    {error && <div className="p-4 bg-red-950/40 border border-red-700 text-red-300 rounded-xl text-xs font-bold text-center animate-shake shadow-lg">{error}</div>}
                </div>

                {/* Right side: Scene Storyboard */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#111827]/60 p-6 rounded-3xl border border-gray-800 shadow-2xl flex flex-col h-full min-h-[700px] backdrop-blur-sm">
                        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Story Scenes ({scenes.length})</h3>
                            <div className="flex flex-wrap gap-2">
                                {scenes.length > 0 && (
                                    <>
                                        <button 
                                            onClick={handleCopyAllSenses}
                                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase rounded-xl transition shadow-lg border border-gray-700 ${copyStatus === 'all-senses-copy' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                                        >
                                            <CopyIcon /> {copyStatus === 'all-senses-copy' ? 'COPIED!' : 'Copy All Senses'}
                                        </button>
                                        <button 
                                            onClick={handleCopyAllJson}
                                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase rounded-xl transition shadow-lg border border-gray-700 ${copyStatus === 'all-json-copy' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-400 hover:text-indigo-300'}`}
                                        >
                                            <JsonIcon /> {copyStatus === 'all-json-copy' ? '✓ Done' : 'Copy All JSON Code'}
                                        </button>
                                        {!showPromptOnly && (
                                            <button 
                                                onClick={handleDownloadAll}
                                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg active:scale-95"
                                            >
                                                <DownloadIcon /> Download All
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar pr-2 pb-20">
                            {scenes.length > 0 ? (
                                scenes.map((scene, idx) => (
                                    <div key={idx} className={`bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-700 shadow-xl flex flex-col group hover:border-pink-500/30 transition-all duration-300 ${showPromptOnly ? 'h-fit' : ''}`}>
                                        {!showPromptOnly && (
                                            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                                {scene.imageUrl ? (
                                                    <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`Scene ${scene.id}`} />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        {scene.isLoadingImage ? (
                                                            <>
                                                                <Spinner className="h-10 w-10 text-pink-500 m-0" />
                                                                <span className="text-[10px] text-gray-500 font-black uppercase animate-pulse">Rendering...</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Awaiting Queue</span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full border border-white/10 uppercase tracking-tighter shadow-md">Scene {scene.id}</div>
                                                {scene.imageUrl && (
                                                    <button onClick={() => handleDownloadSingle(scene.imageUrl!, scene.id)} className="absolute bottom-3 right-3 p-2.5 bg-white/10 hover:bg-emerald-600 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition shadow-xl transform active:scale-90 border border-white/5">
                                                        <DownloadIcon />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div className="p-5 flex flex-col flex-grow bg-gradient-to-b from-gray-900/50 to-black/50">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-pink-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-lg">Scene {scene.id}</span>
                                                <span className="text-[9px] font-bold text-gray-500 truncate italic">"{scene.action}"</span>
                                            </div>
                                            
                                            <div className="bg-black/40 p-3 rounded-lg border border-gray-800 mb-4 shadow-inner flex-grow overflow-hidden">
                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Visual Generation Code:</span>
                                                <p className="text-[10px] text-cyan-400/80 font-mono leading-relaxed break-words line-clamp-4 group-hover:line-clamp-none transition-all">{scene.fullVideoPrompt}</p>
                                            </div>

                                            <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-gray-700/50">
                                                <button 
                                                    onClick={() => handleCopy(scene.fullVideoPrompt, `p-${idx}`)}
                                                    className={`px-3 py-2 text-[9px] font-black uppercase rounded-lg transition-all border ${copyStatus === `p-${idx}` ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white hover:border-gray-600'}`}
                                                >
                                                    {copyStatus === `p-${idx}` ? '✓ Copied' : 'Copy Prompt'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const miniJson = JSON.stringify({ prompt: scene.fullVideoPrompt }, null, 2);
                                                        handleCopy(miniJson, `j-${idx}`);
                                                    }}
                                                    className={`px-3 py-2 text-[9px] font-black uppercase rounded-lg transition-all border ${copyStatus === `j-${idx}` ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-indigo-400 hover:text-white hover:border-indigo-600'}`}
                                                >
                                                    {copyStatus === `j-${idx}` ? '✓ Done' : '</> JSON code'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full h-full flex flex-col items-center justify-center text-gray-600 opacity-20 pointer-events-none select-none py-32">
                                    <span className="text-9xl mb-6 grayscale transform -rotate-6">🎬</span>
                                    <p className="text-3xl font-black uppercase tracking-[0.5em]">Awaiting Studio Data</p>
                                    <p className="text-xs mt-4 font-bold tracking-widest uppercase">Upload characters to begin production</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KaMongKhnhomGenerator;
