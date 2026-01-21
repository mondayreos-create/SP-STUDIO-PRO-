import React, { useState, useRef, useEffect } from 'react';
import { generateHomeDesign } from '../services/geminiService.ts';
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

type Mode = 'Interiors' | 'Exteriors' | 'Gardens';

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

const HomeDesignGenerator: React.FC = () => {
    const [mode, setMode] = useState<Mode>('Interiors');
    const [inputImage, setInputImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [roomType, setRoomType] = useState('Living Room');
    const [style, setStyle] = useState('Modern');
    const [additionalPrompt, setAdditionalPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // New Options
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [overlayText, setOverlayText] = useState('');
    const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
    const [overlayLogo, setOverlayLogo] = useState<string | null>(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    // Options based on mode
    const roomOptions: Record<Mode, string[]> = {
        'Interiors': ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Home Office', 'Kids Room', 'Walk-in Closet', 'Gaming Room'],
        'Exteriors': ['House Facade', 'Porch', 'Terrace', 'Pool Area', 'Balcony', 'Roof Top', 'Garage'],
        'Gardens': ['Backyard', 'Front Yard', 'Zen Garden', 'Patio', 'Vegetable Garden', 'Flower Garden']
    };

    const styleOptions = [
        'Modern', 'Minimalist', 'Scandinavian', 'Industrial', 'Bohemian', 'Traditional', 
        'Farmhouse', 'Luxury', 'Coastal', 'Rustic', 'Mid-Century Modern', 'Japanese Zen', 
        'Cyberpunk', 'Futuristic', 'Art Deco'
    ];

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setInputImage({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
                setGeneratedImage(null);
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
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await generateHomeDesign(
                inputImage,
                mode,
                roomType,
                style,
                additionalPrompt,
                aspectRatio
            );
            setGeneratedImage(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Design generation failed.");
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

                // Determine target dimensions
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

    const handleDownload = async (resConfig: any) => {
        if (!generatedImage) return;
        try {
            const finalDataUrl = await processImageForDownload(generatedImage, resConfig);
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = `home-design-${Date.now()}-${resConfig.label}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowDownloadMenu(false);
        } catch (e) {
            console.error("Download processing failed", e);
            alert("Failed to process image for download.");
        }
    };

    const handleClear = () => {
        setInputImage(null);
        setGeneratedImage(null);
        setError(null);
        setAdditionalPrompt('');
        setMode('Interiors');
        setRoomType('Living Room');
        setStyle('Modern');
        setOverlayText('');
        setOverlayLogo(null);
        setAspectRatio('16:9');
    };

    const inputSelectClass = "w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none";

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Controls */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-2 flex items-center gap-2">
                        <span>🏠</span> Home Design X
                    </h2>
                    
                    {/* Tabs */}
                    <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                        {(['Interiors', 'Exteriors', 'Gardens'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setRoomType(roomOptions[m][0]); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mode === m ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Upload Room Image (Optional)</label>
                            <div className="relative w-full aspect-video bg-gray-900 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden hover:border-red-500 transition-colors">
                                {inputImage ? (
                                    <img src={`data:${inputImage.mimeType};base64,${inputImage.base64}`} alt="Input" className="w-full h-full object-cover" />
                                ) : (
                                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                        <span className="text-4xl mb-2">📷</span>
                                        <span className="text-xs text-gray-500">Click to Upload</span>
                                        <input type="file" accept="image/*,.ico" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                                {inputImage && (
                                    <button onClick={() => setInputImage(null)} className="absolute top-2 right-2 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-600 text-xs">✕</button>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Leave empty to generate from scratch.</p>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Aspect Ratio (Panel Size)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {aspectRatios.map(ratio => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setAspectRatio(ratio.value)}
                                        className={`px-2 py-1.5 text-[10px] font-bold rounded border transition ${aspectRatio === ratio.value ? 'bg-red-600 text-white border-red-500' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
                                    >
                                        {ratio.label.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Room Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Room / Space Type</label>
                            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={inputSelectClass}>
                                {roomOptions[mode].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Style */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Design Style</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputSelectClass}>
                                {styleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Overlay Options */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Add Text & Logo</label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add Text Overlay..." 
                                        value={overlayText}
                                        onChange={(e) => setOverlayText(e.target.value)}
                                        className="flex-grow bg-gray-800 border border-gray-600 rounded text-xs px-2 py-1.5 text-white focus:outline-none focus:border-red-500"
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

                        {/* Additional Prompt */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Additional Requirements</label>
                            <textarea 
                                value={additionalPrompt}
                                onChange={(e) => setAdditionalPrompt(e.target.value)}
                                placeholder="e.g. Add more plants, change wall color to sage green, add a large rug..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                            />
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Spinner /> : '✨'} 
                            {isLoading ? 'Designing...' : 'Generate Design'}
                        </button>
                    </div>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>

                {/* Right: Output */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Design Result</h3>
                            {generatedImage && (
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition shadow-md"
                                    >
                                        <DownloadIcon /> Download ▾
                                    </button>
                                    {showDownloadMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-40 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-20 overflow-hidden">
                                            {resolutions.map(res => (
                                                <button
                                                    key={res.label}
                                                    onClick={() => handleDownload(res)}
                                                    className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition block"
                                                >
                                                    {res.label} {res.width ? `(${res.width}w)` : ''}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex-grow bg-black rounded-lg overflow-hidden border border-gray-700 relative flex items-center justify-center min-h-[500px]">
                            {generatedImage ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={generatedImage} alt="Generated Design" className="w-full h-full object-contain" />
                                    
                                    {/* Preview Overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {overlayLogo && <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 border border-white/30 rounded-full flex items-center justify-center text-[10px] text-white">Logo</div>}
                                        {overlayText && <div className="absolute bottom-8 w-full text-center text-white text-lg font-bold drop-shadow-md">{overlayText}</div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-600">
                                    <span className="text-6xl block mb-4 opacity-30">🛋️</span>
                                    <p className="text-lg">Your dream design will appear here.</p>
                                </div>
                            )}
                            
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <Spinner className="h-10 w-10 text-red-500 mb-4" />
                                    <p className="text-white font-semibold animate-pulse">Architecting your space...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeDesignGenerator;