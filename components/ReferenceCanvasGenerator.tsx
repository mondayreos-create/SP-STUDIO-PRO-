import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateImageWithReferences, generateImage, ImageReference } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || '-ml-1 mr-3 h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const XIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

interface GeneratedScene {
    id: number;
    url: string;
    prompt: string;
    sceneNumber: number;
    ratio: string;
}

const ReferenceCanvasGenerator: React.FC = () => {
    const [subjectImages, setSubjectImages] = useState<ImageReference[]>([]);
    const [sceneImage, setSceneImage] = useState<ImageReference | null>(null);
    const [styleImage, setStyleImage] = useState<ImageReference | null>(null);
    const [prompt, setPrompt] = useState('');
    const [selectedRatio, setSelectedRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
    const [generatedHistory, setGeneratedHistory] = useState<GeneratedScene[]>([]);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCharGenModal, setShowCharGenModal] = useState(false);
    const [charGenPrompt, setCharGenPrompt] = useState('');
    const [isGeneratingChar, setIsGeneratingChar] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'ref-canvas') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'ref-canvas',
                category: 'vip',
                title: prompt.substring(0, 30) || "Canvas Project",
                data: { subjectImages, sceneImage, styleImage, prompt, selectedRatio, generatedHistory, generatedImage }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
            loadLocalHistory();
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'ref-canvas') return;
            const d = e.detail.data;
            if (d.subjectImages) setSubjectImages(d.subjectImages);
            if (d.sceneImage) setSceneImage(d.sceneImage);
            if (d.styleImage) setStyleImage(d.styleImage);
            if (d.prompt) setPrompt(d.prompt);
            if (d.selectedRatio) setSelectedRatio(d.selectedRatio);
            if (d.generatedHistory) setGeneratedHistory(d.generatedHistory);
            if (d.generatedImage) setGeneratedImage(d.generatedImage);
            setShowHistory(false);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [subjectImages, sceneImage, styleImage, prompt, selectedRatio, generatedHistory, generatedImage]);

    useEffect(() => {
        loadLocalHistory();
    }, []);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'ref-canvas');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleReloadHistory = (project: any) => {
        window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: project }));
        setShowHistory(false);
    };

    const handleFileChange = (setter: (file: ImageReference) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setter({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const addSubjectImage = (file: ImageReference) => { if (subjectImages.length < 3) setSubjectImages([...subjectImages, file]); };
    const removeSubjectImage = (index: number) => { const newImages = [...subjectImages]; newImages.splice(index, 1); setSubjectImages(newImages); };

    const handleGenerateRefImage = async () => {
        if (!charGenPrompt.trim()) return;
        setIsGeneratingChar(true);
        try {
            const imageUrl = await generateImage(charGenPrompt, '1:1');
            const [header, base64Data] = imageUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            addSubjectImage({ base64: base64Data, mimeType: mimeType });
            setShowCharGenModal(false);
            setCharGenPrompt('');
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to generate character reference");
        } finally {
            setIsGeneratingChar(false);
        }
    };

    const handleGenerate = async () => {
        if (subjectImages.length === 0 && !sceneImage && !styleImage && !prompt.trim()) {
            setError("Please provide at least one reference image or a prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const result = await generateImageWithReferences(prompt, { 
                subjects: subjectImages.length > 0 ? subjectImages : undefined, 
                scene: sceneImage || undefined, 
                style: styleImage || undefined 
            }, selectedRatio);
            setGeneratedImage(result);
            setGeneratedHistory(prev => [...prev, { id: Date.now(), url: result, prompt: prompt, sceneNumber: prev.length + 1, ratio: selectedRatio }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadRefImage = (image: ImageReference, name: string) => {
        const url = `data:${image.mimeType};base64,${image.base64}`;
        handleDownload(url, `${name}_Reference.png`);
    };

    const handleDownloadAllScenes = () => {
        generatedHistory.forEach((scene, index) => {
            setTimeout(() => handleDownload(scene.url, `Scene_${scene.sceneNumber}.png`), index * 500);
        });
    };

    const handleClear = () => {
        setSubjectImages([]);
        setSceneImage(null);
        setStyleImage(null);
        setPrompt('');
        setSelectedRatio('1:1');
        setGeneratedImage(null);
        setGeneratedHistory([]);
        setError(null);
    };

    const ReferenceSlot: React.FC<{ title: string, image: ImageReference | null, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, onClear: () => void, color: string, onGenerate?: () => void }> = ({ title, image, onUpload, onClear, color, onGenerate }) => (
        <div className={`p-4 rounded-xl border border-gray-700 bg-gray-800/50 flex flex-col h-full relative group transition-colors duration-300`}>
            <div className="flex justify-between items-center mb-3">
                <h3 className={`font-bold text-sm uppercase tracking-wider text-${color}-400`}>{title}</h3>
                <div className={`p-1 rounded bg-${color}-500/20`}>{title.includes('SUBJECT') && '👤'}{title === 'SCENE' && '🏞️'}{title === 'STYLE' && '🎨'}</div>
            </div>
            <div className="flex-grow bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors relative overflow-hidden flex items-center justify-center">
                {image ? (
                    <>
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt={title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition duration-200">
                            <button onClick={() => handleDownloadRefImage(image, title.replace(/\s+/g, '_'))} className="bg-black/60 hover:bg-emerald-600 text-white p-1.5 rounded-full shadow-lg backdrop-blur-sm transition" title="Download Reference"><DownloadIcon /></button>
                            <button onClick={onClear} className="bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg backdrop-blur-sm transition" title="Remove"><TrashIcon /></button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 w-full h-full p-2">
                        <label className="cursor-pointer flex flex-col items-center justify-center text-center w-full h-1/2 hover:bg-gray-800/50 rounded transition">
                            <span className="text-xl mb-1 text-gray-500">📁</span>
                            <span className="text-[10px] text-gray-500">Upload Image</span>
                            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
                        </label>
                        {onGenerate && (<><div className="text-gray-600 text-[10px]">- OR -</div><button onClick={onGenerate} className="flex flex-col items-center justify-center text-center w-full h-1/2 hover:bg-gray-800/50 rounded transition text-gray-500 hover:text-gray-300"><span className="text-xl mb-1">✨</span><span className="text-[10px]">Paste Prompt</span></button></>)}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col h-full relative">
            {/* Action Bar */}
            <div className="w-full flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            loadLocalHistory();
                            setShowHistory(!showHistory);
                        }} 
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 border ${showHistory ? 'bg-orange-600 border-orange-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
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
                <div className="w-full bg-gray-900/90 border-2 border-orange-500/50 p-6 rounded-2xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                            <HistoryIcon /> Canvas History Vault
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
                                        <span className="text-[10px] bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded font-black border border-orange-800/50 uppercase">#{localHistory.length - idx}</span>
                                        <span className="text-[9px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">Canvas Project</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic">"{project.data.prompt}"</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-orange-400 font-black uppercase">Click to Reload ➜</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[85vh] pr-2 custom-scrollbar">
                    <div className="space-y-4 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50">
                        <div className="flex justify-between items-center"><h4 className="text-sm font-bold text-yellow-400">SUBJECTS ({subjectImages.length}/3)</h4>{subjectImages.length < 3 && (<span className="text-[10px] text-gray-500">Add up to 3</span>)}</div>
                        {subjectImages.map((img, idx) => (<div key={idx} className="h-40"><ReferenceSlot title={`SUBJECT ${idx + 1}`} image={img} onUpload={() => {}} onClear={() => removeSubjectImage(idx)} color="yellow" /></div>))}
                        {subjectImages.length < 3 && (<div className="h-40"><ReferenceSlot title={`SUBJECT ${subjectImages.length + 1}`} image={null} onUpload={handleFileChange(addSubjectImage)} onClear={() => {}} color="yellow" onGenerate={() => setShowCharGenModal(true)} /></div>)}
                    </div>
                    <div className="h-48"><ReferenceSlot title="SCENE" image={sceneImage} onUpload={handleFileChange(setSceneImage)} onClear={() => setSceneImage(null)} color="green" /></div>
                    <div className="h-48"><ReferenceSlot title="STYLE" image={styleImage} onUpload={handleFileChange(setStyleImage)} onClear={() => setStyleImage(null)} color="pink" /></div>
                </div>
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="flex-grow bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden relative flex items-center justify-center min-h-[500px]">
                        {generatedImage ? (<div className="w-full h-full relative group"><img src={generatedImage} alt="Generated" className="w-full h-full object-contain" /><a href={generatedImage} download={`Scene_${generatedHistory.length}.png`} className="absolute bottom-4 right-4 bg-gray-900/80 text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-lg font-bold flex items-center gap-2 hover:bg-emerald-600"><DownloadIcon /> Download Scene {generatedHistory.length}</a></div>) : (<div className="text-center text-gray-600"><span className="text-6xl block mb-4 opacity-30">✨</span><p className="text-lg font-semibold">Ready to Create</p></div>)}
                        {isLoading && (<div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm"><Spinner /><p className="text-white mt-4 font-semibold animate-pulse">Synthesizing References...</p></div>)}
                    </div>
                    {generatedHistory.length > 0 && (
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-bold text-gray-300">Generated History ({generatedHistory.length})</h4>
                                <button onClick={handleDownloadAllScenes} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded hover:bg-emerald-500 transition shadow-sm">
                                    <DownloadIcon /> Download All
                                </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {generatedHistory.map((scene) => (
                                    <div key={scene.id} className={`flex-shrink-0 w-32 relative cursor-pointer group rounded-lg overflow-hidden border-2 transition ${generatedImage === scene.url ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-500'}`} onClick={() => setGeneratedImage(scene.url)}>
                                        <img src={scene.url} alt="Scene" className="w-full h-20 object-cover" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] p-1 text-center truncate">{scene.ratio} • Sense {scene.sceneNumber}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 flex flex-col gap-4 shadow-lg backdrop-blur-sm sticky bottom-4 z-20">
                        <div className="flex flex-col md:flex-row gap-4 items-center"><div className="flex flex-col gap-2 w-full md:w-auto"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Aspect Ratio</label><div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 shadow-inner">{(['1:1', '16:9', '9:16'] as const).map((ratio) => (<button key={ratio} onClick={() => setSelectedRatio(ratio)} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${selectedRatio === ratio ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{ratio}</button>))}</div></div><div className="relative flex-grow w-full"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Visual Prompt / Idea</label><div className="relative"><input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your idea..." className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-4 pr-10 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none" onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}/>{prompt && (<button onClick={() => setPrompt('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"><XIcon /></button>)}</div></div><div className="flex flex-col justify-end h-full"><div className="h-[21px] mb-2"></div><button onClick={handleGenerate} disabled={isLoading} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">{isLoading ? 'Creating...' : 'Generate ➜'}</button></div></div>
                        {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-center text-sm">{error}</div>}
                    </div>
                </div>
            </div>
            {showCharGenModal && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl"><h3 className="text-lg font-bold text-white mb-2">Create Reference Character</h3><p className="text-sm text-gray-400 mb-4">Describe the character you want to use as a reference.</p><textarea value={charGenPrompt} onChange={(e) => setCharGenPrompt(e.target.value)} placeholder="e.g. A cute blue robot..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none focus:ring-2 focus:ring-yellow-500 outline-none mb-4"/><div className="flex gap-3 justify-end"><button onClick={() => setShowCharGenModal(false)} className="px-4 py-2 text-gray-300 hover:text-white transition">Cancel</button><button onClick={handleGenerateRefImage} disabled={isGeneratingChar || !charGenPrompt.trim()} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-2">{isGeneratingChar ? <Spinner className="h-4 w-4 text-white" /> : '✨ Generate'}</button></div></div></div>)}
        </div>
    );
};

export default ReferenceCanvasGenerator;