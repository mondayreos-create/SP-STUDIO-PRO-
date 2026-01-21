
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateConsistentStoryScript, generateImage, generateRoomDesignIdeas, CarIdea, generateYouTubeMetadata, YouTubeMetadata } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <TrashIcon /> Clear Project | សម្អាត
        </button>
    </div>
);

interface Scene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    imageUrl?: string;
    isLoadingImage: boolean;
}

const DesignRoomXGenerator: React.FC = () => {
    const [masterPrompt, setMasterPrompt] = useState('Design Room X (ASMR): Transform an old room into a high-tech modern studio. Focus on satisfying deep cleaning and high-gloss renovation steps.');
    const [sceneCount, setSceneCount] = useState(10);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

    const handleGenerateScript = async () => {
        if (!masterPrompt.trim()) {
            setError("Please enter a master prompt.");
            return;
        }
        setIsGeneratingScript(true);
        setError(null);
        setScenes([]);
        setYoutubeMeta(null);

        try {
            const result = await generateConsistentStoryScript(
                `ROOM X TRANSFORMATION ASMR. Context: ${masterPrompt}. Style: 100% Realistic, Professional Cinematic Interior Photography.`,
                sceneCount
            );
            setScenes(result.map(s => ({ ...s, isLoadingImage: false })));
        } catch (err) {
            setError("Failed to generate script.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateImage = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;

        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: true } : s));
        try {
            const prompt = `100% Realistic, professional interior photography, 8k. Action: ${scene.action}. Setting: ${scene.consistentContext}. Cinematic lighting.`;
            const url = await generateImage(prompt, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isLoadingImage: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoadingImage: false } : s));
            setError("Image generation failed.");
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleDownload = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `RoomX_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setMasterPrompt('');
        setScenes([]);
        setError(null);
        setYoutubeMeta(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in">
            <ClearProjectButton onClick={handleClear} />
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">Design Room X</h2>
                    <textarea 
                        value={masterPrompt}
                        onChange={(e) => setMasterPrompt(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-48 resize-none outline-none"
                        placeholder="Enter transformation description..."
                    />
                    <button 
                        onClick={handleGenerateScript} 
                        disabled={isGeneratingScript || !masterPrompt.trim()}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-xl shadow-xl transition disabled:opacity-50"
                    >
                        {isGeneratingScript ? <Spinner /> : 'Get Sense Script'}
                    </button>
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-xs">{error}</div>}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center">
                                    {scene.imageUrl ? (
                                        <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Render" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            {scene.isLoadingImage ? <Spinner className="h-6 w-6 text-emerald-500" /> : <button onClick={() => handleGenerateImage(idx)} className="px-3 py-1 bg-gray-800 text-[10px] text-gray-400 hover:text-white rounded uppercase font-bold">Render Scene</button>}
                                        </div>
                                    )}
                                    {scene.imageUrl && (
                                        <button onClick={() => handleDownload(scene.imageUrl!, scene.sceneNumber)} className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-cyan-600"><DownloadIcon className="h-3 w-3" /></button>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-black">Sense {scene.sceneNumber}</div>
                                </div>
                                <div className="p-4">
                                    <p className="text-gray-300 text-xs italic">"{scene.action}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignRoomXGenerator;
