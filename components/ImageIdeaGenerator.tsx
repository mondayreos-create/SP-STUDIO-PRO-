
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateImage } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PasteIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const aspectRatios = [
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
    { label: '1:1', value: '1:1' },
    { label: '4:3', value: '4:3' },
    { label: '3:4', value: '3:4' },
    { label: '4:5', value: '4:5' },
    { label: '5:4', value: '5:4' },
];

const resolutions = [
    { label: 'Original', scale: 1 },
    { label: '720p', width: 1280 },
    { label: '1080p', width: 1920 },
    { label: '2K', width: 2560 },
    { label: '4K', width: 3840 },
    { label: '8K', width: 7680 },
];

interface GeneratedResult {
    id: number;
    url: string;
}

const ImageIdeaGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [batchSize, setBatchSize] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [overlayText, setOverlayText] = useState('');
    const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [results, setResults] = useState<GeneratedResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState<number | null>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
        }
    };

    const handlePastePrompt = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setPrompt(text);
        } catch (err) {
            console.error("Failed to read clipboard:", err);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Please enter an image idea.");
            return;
        }
        setIsLoading(true);
        setError(null);
        
        try {
            const newResults: GeneratedResult[] = [];
            for (let i = 0; i < batchSize; i++) {
                const imageUrl = await generateImage(prompt, aspectRatio);
                newResults.push({ id: Date.now() + i, url: imageUrl });
                
                // Keep UI updated if generating multiple
                if (batchSize > 1) {
                    setResults(prev => {
                        const combined = [...newResults, ...prev];
                        return combined.slice(0, 6); // Limit 6 results
                    });
                }
            }
            
            if (batchSize === 1) {
                setResults(prev => [{ id: Date.now(), url: newResults[0].url }, ...prev].slice(0, 6));
            }
            
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const processImageForDownload = async (imageUrl: string, resolutionConfig: { label: string; scale?: number; width?: number }): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject("Canvas context error");
                    return;
                }

                let targetWidth = img.width;
                let targetHeight = img.height;

                if (resolutionConfig.width) {
                    const ratio = img.height / img.width;
                    targetWidth = resolutionConfig.width;
                    targetHeight = Math.round(targetWidth * ratio);
                } else if (resolutionConfig.scale) {
                    targetWidth = img.width * resolutionConfig.scale;
                    targetHeight = img.height * resolutionConfig.scale;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                if (overlayText) {
                    const fontSize = Math.max(24, targetHeight * 0.05);
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = fontSize * 0.15;
                    ctx.strokeText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                    ctx.fillStyle = overlayTextColor;
                    ctx.fillText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                }

                if (logoUrl) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = "anonymous";
                    logoImg.onload = () => {
                        const logoSize = Math.min(targetWidth, targetHeight) * 0.15; 
                        const padding = logoSize * 0.2;
                        ctx.drawImage(logoImg, targetWidth - logoSize - padding, padding, logoSize, logoSize);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    logoImg.onerror = () => resolve(canvas.toDataURL('image/png')); 
                    logoImg.src = logoUrl;
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            };
            img.onerror = (e) => reject(e);
            img.src = imageUrl;
        });
    };

    const handleDownload = async (url: string, resConfig: any) => {
        try {
            const finalDataUrl = await processImageForDownload(url, resConfig);
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = `image-idea-${Date.now()}-${resConfig.label}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowDownloadMenu(null);
        } catch (e) {
            console.error(e);
            alert("Download failed.");
        }
    };

    const handleClear = () => {
        setPrompt('');
        setResults([]);
        setError(null);
        setOverlayText('');
        setLogoUrl(null);
    };

    const removeResult = (id: number) => {
        setResults(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center animate-fade-in">
            <div className="w-full flex justify-end gap-3 mb-4">
                 <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
                    <TrashIcon /> Clear All
                </button>
            </div>
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Configuration */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 flex items-center gap-2">
                        <span>💡</span> Image Idea
                    </h2>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-300">Your Idea / Prompt</label>
                            <div className="flex gap-2">
                                <button onClick={handlePastePrompt} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-gray-700 hover:bg-gray-600 text-cyan-400 rounded transition border border-gray-600">
                                    <PasteIcon /> PASTE
                                </button>
                                <button onClick={() => setPrompt('')} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-gray-700 hover:bg-gray-600 text-red-400 rounded transition border border-gray-600">
                                    <TrashIcon /> CLEAR
                                </button>
                            </div>
                        </div>
                        <textarea 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)} 
                            placeholder="Describe your creative image idea..."
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Panel Size</label>
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-xs outline-none">
                                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Create Count (1-4)</label>
                            <div className="flex items-center bg-gray-900 border border-gray-600 rounded overflow-hidden">
                                <button onClick={() => setBatchSize(Math.max(1, batchSize - 1))} className="px-3 py-1.5 bg-gray-700 text-white font-bold">-</button>
                                <input type="number" readOnly value={batchSize} className="w-full text-center bg-transparent text-white text-xs font-bold outline-none" />
                                <button onClick={() => setBatchSize(Math.min(4, batchSize + 1))} className="px-3 py-1.5 bg-gray-700 text-white font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-medium text-gray-400">Add Text Overlay</label>
                            {overlayText && (
                                <button onClick={() => setOverlayText('')} className="text-[10px] text-red-400 hover:underline">Remove Text</button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={overlayText} onChange={e => setOverlayText(e.target.value)} placeholder="Enter text..." className="flex-grow bg-gray-900 border border-gray-600 rounded p-2.5 text-white text-sm outline-none" />
                            <input type="color" value={overlayTextColor} onChange={e => setOverlayTextColor(e.target.value)} className="w-10 h-10 bg-transparent border-0 cursor-pointer p-0" />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-medium text-gray-400">Add Logo (PNG/JPG/ICO/GIF)</label>
                            {logoUrl && (
                                <button onClick={() => setLogoUrl(null)} className="text-[10px] text-red-400 hover:underline">Remove Logo</button>
                            )}
                        </div>
                        <label className="flex items-center justify-center w-full h-10 bg-gray-900 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                            <span className="text-xs text-gray-400 truncate px-2">{logoUrl ? "Logo Loaded" : "Upload File"}</span>
                            <input type="file" accept="image/*,.ico,.gif" onChange={handleLogoUpload} className="hidden" />
                        </label>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !prompt.trim()}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Spinner /> : '🚀'} 
                        {isLoading ? 'Generating Batch...' : `Create ${batchSize} Image${batchSize > 1 ? 's' : ''}`}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>

                {/* Right Panel: Output Gallery */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-full flex flex-col min-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Results <span className="text-xs text-gray-500 font-normal ml-2">(Max 6)</span></h3>
                        </div>

                        {results.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                                {results.map((result) => (
                                    <div key={result.id} className="relative group bg-black rounded-lg border border-gray-700 overflow-hidden aspect-square flex items-center justify-center">
                                        <img src={result.url} alt="Result" className="w-full h-full object-contain" />
                                        
                                        {/* Overlays for Real-time Preview */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            {logoUrl && <img src={logoUrl} className="absolute top-4 right-4 w-[15%] aspect-square object-contain drop-shadow-lg" />}
                                            {overlayText && (
                                                <div className="absolute bottom-8 w-full text-center px-4">
                                                    <span className="font-bold text-white drop-shadow-lg break-words" style={{ color: overlayTextColor, fontSize: 'clamp(1rem, 4vw, 2rem)', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                                                        {overlayText}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-10">
                                            <div className="relative">
                                                <button onClick={() => setShowDownloadMenu(showDownloadMenu === result.id ? null : result.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition shadow-lg transform hover:scale-105">
                                                    <DownloadIcon /> Download ▾
                                                </button>
                                                {showDownloadMenu === result.id && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-20 overflow-hidden border border-gray-600">
                                                        {resolutions.map(res => (
                                                            <button key={res.label} onClick={() => handleDownload(result.url, res)} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition block border-b border-gray-800 last:border-none">
                                                                {res.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => removeResult(result.id)} className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition shadow-lg transform hover:scale-105">
                                                <TrashIcon /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                     <div className="aspect-square bg-gray-900/50 rounded-lg border border-cyan-500/30 flex flex-col items-center justify-center animate-pulse">
                                        <Spinner className="h-10 w-10 text-cyan-500 mb-4" />
                                        <p className="text-white text-xs font-semibold">Creating Art...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-700 rounded-xl">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <Spinner className="h-16 w-16 text-cyan-500 mb-6" />
                                        <p className="text-white text-xl font-semibold animate-pulse">Rendering your ideas...</p>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-8xl block mb-6 opacity-20">🖼️</span>
                                        <p className="text-xl">Generated art will appear here.</p>
                                        <p className="text-sm mt-2">Up to 6 images stored in session history.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageIdeaGenerator;
