
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateImage, generateImageWithReferences, ImageReference } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

const stylesList = [
    'Viral / MrBeast Style',
    'Gaming / Streamer',
    'Vlog / Lifestyle',
    'Tech Review / Clean',
    'Educational / Documentary',
    'Minimalist / Aesthetic',
    'Dramatic / High Contrast',
    'Horror / Mystery',
    'Comedy / Fun',
    'Business / Professional',
    '3D Render',
    'Anime',
    'Cinematic',
    'Cyberpunk'
];

const aspectRatios = [
    { label: '16:9 (Video)', value: '16:9' },
    { label: '9:16 (Shorts)', value: '9:16' },
    { label: '1:1 (Square)', value: '1:1' },
    { label: '4:3 (Classic)', value: '4:3' },
    { label: '3:4 (Portrait)', value: '3:4' },
    { label: '4:5 (IG)', value: '4:5' },
    { label: '5:4 (Landscape)', value: '5:4' },
];

const resolutions = [
    { label: 'Original', scale: 1 },
    { label: '720p', width: 1280 },
    { label: '1080p', width: 1920 },
    { label: '2K', width: 2560 },
    { label: '4K', width: 3840 },
    { label: '8K', width: 7680 },
];

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

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const ThumbnailGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [style, setStyle] = useState(stylesList[0]);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    
    // Advanced State
    const [refImage, setRefImage] = useState<ImageReference | null>(null);
    const [overlayText, setOverlayText] = useState('');
    const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
    const [overlayLogo, setOverlayLogo] = useState<string | null>(null);

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    const handleRefImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setRefImage({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
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

    const handleGenerate = useCallback(async () => {
        if (!title.trim() && !description.trim() && !refImage) {
            setError('Please enter a title, description, or upload a reference image.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            let prompt = `Cover Image/Thumbnail. Title: "${title}". Description: ${description}. Style: ${style}. High quality, catchy, vibrant, 8k resolution.`;
            
            let imageUrl: string;

            if (refImage) {
                // Use reference image to guide generation
                imageUrl = await generateImageWithReferences(
                    prompt + " Use the reference image for composition/subject.", 
                    { subjects: [refImage] }, 
                    aspectRatio
                );
            } else {
                imageUrl = await generateImage(prompt, aspectRatio);
            }
            
            setGeneratedImage(imageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [title, description, style, aspectRatio, refImage]);

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

                // 1. Draw Generated Image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // 2. Draw Overlay Text (Bottom Center)
                if (overlayText) {
                    const fontSize = Math.max(24, targetHeight * 0.05);
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    // Shadow/Stroke
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = fontSize * 0.15;
                    ctx.strokeText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                    
                    ctx.fillStyle = overlayTextColor;
                    ctx.fillText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                }

                // 3. Draw Overlay Logo (Top Right)
                if (overlayLogo) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = "anonymous";
                    logoImg.onload = () => {
                        const logoSize = Math.min(targetWidth, targetHeight) * 0.15; 
                        const padding = logoSize * 0.2;
                        ctx.drawImage(logoImg, targetWidth - logoSize - padding, padding, logoSize, logoSize);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    logoImg.onerror = () => resolve(canvas.toDataURL('image/png')); // Continue even if logo fails
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
            link.download = `cover-image-${Date.now()}-${resConfig.label}.png`;
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
        setTitle('');
        setDescription('');
        setStyle(stylesList[0]);
        setGeneratedImage(null);
        setError(null);
        setRefImage(null);
        setOverlayText('');
        setOverlayLogo(null);
        setAspectRatio('16:9');
    };

    const inputClasses = "w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-500";

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 space-y-6 h-fit lg:col-span-1">
                    <div className="text-center mb-2">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-1">
                            {t('tool_thumbnail_generator')}
                        </h2>
                        <p className="text-xs text-gray-400">Generate Cover Images for any platform.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">1. Settings</label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={inputClasses}>
                                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputClasses}>
                                {stylesList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">2. Content</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Main Title (e.g. My Podcast)"
                            className={`${inputClasses} mb-3`}
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Visual Description (e.g. Neon city, cyberpunk vibe...)"
                            className={`${inputClasses} h-24 resize-none`}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">3. Overlays</label>
                        
                        {/* Text & Logo */}
                        <div className="grid grid-cols-5 gap-2">
                            <div className="col-span-3 flex gap-1">
                                <input 
                                    type="text" 
                                    value={overlayText} 
                                    onChange={(e) => setOverlayText(e.target.value)} 
                                    placeholder="Overlay Text..." 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 text-white text-xs focus:outline-none focus:border-red-500" 
                                />
                                <input 
                                    type="color" 
                                    value={overlayTextColor} 
                                    onChange={(e) => setOverlayTextColor(e.target.value)} 
                                    className="w-8 h-full rounded border-none cursor-pointer bg-transparent" 
                                />
                            </div>
                            <div className="col-span-2 relative">
                                <label className="flex items-center justify-center w-full h-full bg-gray-900 border border-gray-600 rounded cursor-pointer hover:bg-gray-700">
                                    <span className="text-[10px] text-gray-400">{overlayLogo ? '✅ Logo' : '📷 Logo'}</span>
                                    <input type="file" accept="image/*,.ico" onChange={handleLogoUpload} className="hidden" />
                                </label>
                                {overlayLogo && (
                                    <button onClick={() => setOverlayLogo(null)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 text-white w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg hover:from-red-700 hover:to-orange-700 transform transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <Spinner /> : '🚀'} 
                        {isLoading ? ' Creating...' : ' Generate Cover Image'}
                    </button>
                    
                    {error && <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-xs">{error}</div>}
                </div>

                {/* Output */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Preview</h3>
                            {generatedImage && (
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition shadow-md"
                                    >
                                        <DownloadIcon /> Download ▾
                                    </button>
                                    {showDownloadMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-20 overflow-hidden">
                                            {resolutions.map(res => (
                                                <button
                                                    key={res.label}
                                                    onClick={() => handleDownload(res)}
                                                    className="w-full text-left px-4 py-3 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition block border-b border-gray-800 last:border-none"
                                                >
                                                    {res.label} {res.width ? `(${res.width}px)` : ''}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex-grow bg-black rounded-lg border border-gray-700 overflow-hidden relative flex items-center justify-center min-h-[500px]">
                            {generatedImage ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={generatedImage} alt="Generated Cover" className="w-full h-full object-contain" />
                                    
                                    {/* Preview Overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {overlayLogo && (
                                            <div className="absolute top-4 right-4 w-[15%] aspect-square bg-white/10 border border-white/30 rounded-lg flex items-center justify-center overflow-hidden">
                                                <img src={overlayLogo} className="w-full h-full object-contain" alt="Logo"/>
                                            </div>
                                        )}
                                        {overlayText && (
                                            <div className="absolute bottom-8 w-full text-center">
                                                <span 
                                                    style={{ 
                                                        color: overlayTextColor, 
                                                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                                                        fontSize: '2rem',
                                                        fontWeight: 'bold',
                                                        fontFamily: 'Arial, sans-serif'
                                                    }}
                                                >
                                                    {overlayText}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-600">
                                    <span className="text-6xl block mb-4 opacity-30">🖼️</span>
                                    <p className="text-lg">Your generated cover will appear here.</p>
                                </div>
                            )}
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                                    <Spinner className="h-10 w-10 text-red-500 mb-4" />
                                    <p className="text-white font-semibold animate-pulse">Designing Cover...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThumbnailGenerator;
