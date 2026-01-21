
import React, { useState, useRef, useEffect } from 'react';
import { generatePromptFromImage, generateCloneImage } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';

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

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

interface ClonedImage {
    url: string;
    prompt: string;
}

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

const CloneImageXGenerator: React.FC = () => {
    const [refImage, setRefImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [count, setCount] = useState(1);
    const [clones, setClones] = useState<ClonedImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progressStep, setProgressStep] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPromptIndex, setShowPromptIndex] = useState<number | null>(null);
    
    // New Options
    const [selectedRatio, setSelectedRatio] = useState('1:1');
    
    // Overlay Options
    const [overlayText, setOverlayText] = useState('');
    const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
    const [overlayLogo, setOverlayLogo] = useState<string | null>(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState<number | null>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setRefImage({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
                setClones([]); // Reset previous results
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setOverlayLogo(url);
        }
    };

    const handleGenerate = async () => {
        if (!refImage) {
            setError("Please upload a sample image first.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setClones([]);
        
        try {
            // Step 1: Analyze Image to get detailed prompt
            setProgressStep('Analyzing image structure (99% match)...');
            const prompt = await generatePromptFromImage(refImage.base64, refImage.mimeType);
            
            // Step 2: Generate Clones
            for (let i = 0; i < count; i++) {
                setProgressStep(`Creating clone ${i + 1}/${count}...`);
                const clonedUrl = await generateCloneImage(refImage.base64, refImage.mimeType, prompt, selectedRatio);
                setClones(prev => [...prev, { url: clonedUrl, prompt: prompt }]);
                
                // Small delay to be polite to API if not the last one
                if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
            }
            
        } catch (err) {
            setError(err instanceof Error ? err.message : "Cloning failed.");
        } finally {
            setIsLoading(false);
            setProgressStep('');
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

                // Determine target dimensions
                let targetWidth = img.width;
                let targetHeight = img.height;

                if (resolutionConfig.width) {
                    // Calculate based on width, maintaining aspect ratio
                    const ratio = img.height / img.width;
                    targetWidth = resolutionConfig.width;
                    targetHeight = Math.round(targetWidth * ratio);
                } else if (resolutionConfig.scale) {
                    targetWidth = img.width * resolutionConfig.scale;
                    targetHeight = img.height * resolutionConfig.scale;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // 1. Draw Image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // 2. Draw Text (Centered at bottom)
                if (overlayText) {
                    const fontSize = Math.max(20, targetHeight * 0.05);
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    // Text Shadow/Stroke for visibility
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = fontSize * 0.1;
                    ctx.strokeText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                    
                    ctx.fillStyle = overlayTextColor;
                    ctx.fillText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                }

                // 3. Draw Logo (Top Right)
                if (overlayLogo) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = "anonymous";
                    logoImg.onload = () => {
                        const logoSize = Math.min(targetWidth, targetHeight) * 0.15; // 15% of min dimension
                        const padding = logoSize * 0.2;
                        ctx.drawImage(logoImg, targetWidth - logoSize - padding, padding, logoSize, logoSize);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    logoImg.onerror = () => {
                        // If logo fails, resolve with just image/text
                        resolve(canvas.toDataURL('image/png'));
                    };
                    logoImg.src = overlayLogo;
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            };
            img.onerror = (e) => reject(e);
            img.src = imageUrl;
        });
    };

    const handleDownload = async (url: string, index: number, resConfig: any) => {
        try {
            const finalDataUrl = await processImageForDownload(url, resConfig);
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = `cloned_image_${index + 1}_${resConfig.label}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowDownloadMenu(null);
        } catch (e) {
            console.error("Download processing failed", e);
            alert("Failed to process image for download.");
        }
    };

    const handleCopyPrompt = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Prompt copied!');
    };

    const handleClear = () => {
        setRefImage(null);
        setClones([]);
        setCount(1);
        setError(null);
        setOverlayText('');
        setOverlayLogo(null);
        setSelectedRatio('1:1');
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 flex items-center gap-2">
                        <span>🧬</span> Clone Image X
                    </h2>
                    
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">1. Upload Reference (Sample)</label>
                        <div className="relative w-full aspect-square bg-gray-900 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden hover:border-emerald-500 transition-colors">
                            {refImage ? (
                                <img src={`data:${refImage.mimeType};base64,${refImage.base64}`} alt="Reference" className="w-full h-full object-cover" />
                            ) : (
                                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                    <span className="text-4xl mb-2">🖼️</span>
                                    <span className="text-xs text-gray-500">Upload Image / Icon / GIF</span>
                                    <input type="file" accept="image/*,.ico" onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Aspect Ratio (Panel Size)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {aspectRatios.map(ratio => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setSelectedRatio(ratio.value)}
                                        className={`px-2 py-1.5 text-[10px] font-bold rounded border transition ${selectedRatio === ratio.value ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
                                    >
                                        {ratio.label.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Add Text & Logo</label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add Text Overlay..." 
                                        value={overlayText}
                                        onChange={(e) => setOverlayText(e.target.value)}
                                        className="flex-grow bg-gray-800 border border-gray-600 rounded text-xs px-2 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                    <input 
                                        type="color" 
                                        value={overlayTextColor}
                                        onChange={(e) => setOverlayTextColor(e.target.value)}
                                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                                        title="Text Color"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="flex-grow flex items-center justify-center px-3 py-1.5 bg-gray-800 rounded border border-gray-600 cursor-pointer hover:bg-gray-700 transition">
                                        <span className="text-[10px] text-gray-300 truncate">{overlayLogo ? 'Logo Added' : 'Add Logo (Top Right)'}</span>
                                        <input type="file" accept="image/*,.ico" onChange={handleLogoUpload} className="hidden" />
                                    </label>
                                    {overlayLogo && (
                                        <button onClick={() => setOverlayLogo(null)} className="p-1.5 bg-red-900/50 text-red-400 rounded hover:bg-red-900 transition">
                                            <TrashIcon />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                            <div className="flex items-center bg-gray-800 rounded-lg border border-gray-600 overflow-hidden w-32">
                                <button onClick={() => setCount(Math.max(1, count - 1))} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white font-bold">-</button>
                                <input type="number" min="1" max="4" value={count} readOnly className="w-full text-center bg-transparent text-white font-bold outline-none text-sm" />
                                <button onClick={() => setCount(Math.min(4, count + 1))} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !refImage}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Spinner /> : '🚀'} 
                        {isLoading ? progressStep : 'Get New (Auto Create)'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm text-center">{error}</div>}
                </div>

                {/* Right: Results */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-bold text-gray-200">Cloned Images ({clones.length})</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
                        {clones.map((clone, idx) => (
                            <div key={idx} className="bg-gray-800 rounded-xl overflow-visible border border-gray-700 shadow-md relative group">
                                <div className="aspect-square bg-black relative flex items-center justify-center rounded-t-xl overflow-hidden">
                                    <img src={clone.url} alt={`Clone ${idx + 1}`} className="w-full h-full object-contain" />
                                    
                                    {/* Preview Overlay of Text/Logo */}
                                    {(overlayText || overlayLogo) && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            {overlayLogo && <div className="absolute top-2 right-2 w-12 h-12 bg-white/10 border border-white/30 rounded-full flex items-center justify-center text-[8px] text-white">Logo</div>}
                                            {overlayText && <div className="absolute bottom-4 w-full text-center text-white text-sm font-bold drop-shadow-md">{overlayText}</div>}
                                        </div>
                                    )}

                                    {/* Action Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                        <div className="relative">
                                            <button 
                                                onClick={() => setShowDownloadMenu(showDownloadMenu === idx ? null : idx)}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold flex items-center gap-2 shadow-lg transition"
                                            >
                                                <DownloadIcon /> Download ▾
                                            </button>
                                            
                                            {showDownloadMenu === idx && (
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-20 overflow-hidden">
                                                    {resolutions.map(res => (
                                                        <button
                                                            key={res.label}
                                                            onClick={() => handleDownload(clone.url, idx, res)}
                                                            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition block"
                                                        >
                                                            {res.label} {res.width ? `(${res.width}w)` : ''}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => setShowPromptIndex(showPromptIndex === idx ? null : idx)}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-bold flex items-center gap-2 shadow-lg transition"
                                        >
                                            <span>📝</span> Get Prompt
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 bg-gray-900 text-center text-xs text-gray-400 font-mono rounded-b-xl border-t border-gray-800">
                                    Clone #{idx + 1} • {selectedRatio}
                                </div>

                                {/* Prompt Modal Overlay */}
                                {showPromptIndex === idx && (
                                    <div className="absolute inset-0 bg-gray-900/95 p-4 flex flex-col justify-center items-center text-center z-10 rounded-xl animate-fade-in">
                                        <h4 className="text-emerald-400 font-bold mb-2">Prompt Used:</h4>
                                        <p className="text-gray-300 text-xs overflow-y-auto max-h-40 mb-4 text-left p-2 border border-gray-700 rounded bg-black/50 custom-scrollbar">
                                            {clone.prompt}
                                        </p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCopyPrompt(clone.prompt)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500">Copy</button>
                                            <button onClick={() => setShowPromptIndex(null)} className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500">Close</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {clones.length === 0 && !isLoading && (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
                                <span className="text-4xl mb-2">🧬</span>
                                <p>Upload a sample image to start cloning.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloneImageXGenerator;
