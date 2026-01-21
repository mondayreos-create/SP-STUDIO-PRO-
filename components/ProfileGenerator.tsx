
import React, { useState, useCallback } from 'react';
import { generateImage } from '../services/geminiService.ts';
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

const ProfileGenerator: React.FC = () => {
    const [count, setCount] = useState(4);
    const [basePrompt, setBasePrompt] = useState('Realistic portrait of a person, distinct facial features');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!basePrompt.trim()) {
            setError("Please enter a base style or prompt.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setGeneratedImages([]);
        setProgress(0);

        const newImages: string[] = [];
        
        try {
            // Generate sequentially to manage rate limits and state updates better
            for (let i = 0; i < count; i++) {
                // Add variety to the prompt to ensure uniqueness
                const variationSeed = Math.random().toString(36).substring(7);
                
                // Construct a strict prompt for single-person profile pictures
                const variedPrompt = `
                    Generate a single, high-quality profile picture of one person.
                    Subject Description: ${basePrompt}.
                    Composition: Close-up head and shoulders portrait, facing the camera (passport style or social media avatar), centered.
                    Details: Realistic facial features, distinct human appearance, sharp focus on eyes.
                    Constraint: Ensure there is only ONE person in the image.
                    Random Seed ID: ${variationSeed}
                `;
                
                try {
                    const imageUrl = await generateImage(variedPrompt, '1:1');
                    newImages.push(imageUrl);
                    setGeneratedImages([...newImages]);
                    setProgress(Math.round(((i + 1) / count) * 100));
                } catch (err) {
                    console.error("Failed to generate image", i, err);
                    // Continue even if one fails
                }
                
                // Small delay between requests
                if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Batch generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadAll = () => {
        generatedImages.forEach((url, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = `profile_${index + 1}_${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 300);
        });
    };

    const handleClear = () => {
        setGeneratedImages([]);
        setError(null);
        setProgress(0);
        setBasePrompt('Realistic portrait of a person, distinct facial features');
        setCount(4);
    };

    const handleDownloadSingle = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `profile_${index + 1}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full bg-gray-800/60 p-6 rounded-xl border border-gray-700 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 border-b border-gray-700 pb-6">
                    <div className="w-full md:w-auto flex-grow space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">👤</span> Profile Image Generator
                        </h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Base Style / Prompt</label>
                            <input 
                                type="text" 
                                value={basePrompt}
                                onChange={(e) => setBasePrompt(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Professional woman in suit, Cyberpunk man, Cute anime girl"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-900 p-3 rounded-lg border border-gray-700">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="20" 
                                value={count}
                                onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                className="w-16 bg-gray-800 border border-gray-600 rounded p-1.5 text-center text-white"
                            />
                        </div>
                        
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !basePrompt}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg transition disabled:opacity-50 shadow-lg h-full"
                        >
                            {isGenerating ? <Spinner /> : '⚡'} 
                            {isGenerating ? `Generating ${progress}%` : 'Generate Batch'}
                        </button>
                        
                        <button 
                            onClick={handleDownloadAll}
                            disabled={generatedImages.length === 0}
                            className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition disabled:opacity-50 shadow-lg h-full"
                        >
                            <DownloadIcon /> Save All
                        </button>
                    </div>
                </div>

                {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded text-center">{error}</div>}

                {/* Grid Display */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[400px]">
                    {/* Placeholders while generating if empty */}
                    {generatedImages.length === 0 && !isGenerating && (
                        Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-800/50 rounded-lg border border-gray-700 border-dashed flex items-center justify-center text-gray-600">
                                <span className="text-4xl opacity-20">👤</span>
                            </div>
                        ))
                    )}

                    {/* Generated Images */}
                    {generatedImages.map((img, idx) => (
                        <div key={idx} className="aspect-square relative group rounded-lg overflow-hidden border border-gray-700 shadow-md">
                            <img src={img} alt={`Profile ${idx}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={() => handleDownloadSingle(img, idx)}
                                    className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full hover:bg-white/20 text-white transition"
                                    title="Download"
                                >
                                    <DownloadIcon />
                                </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
                                #{idx + 1}
                            </div>
                        </div>
                    ))}
                    
                    {/* Loading Placeholders for remaining slots */}
                    {isGenerating && generatedImages.length < count && (
                        <div className="aspect-square bg-gray-900 rounded-lg border border-blue-500/50 flex flex-col items-center justify-center animate-pulse">
                            <Spinner className="h-8 w-8 text-blue-500 mb-2"/>
                            <span className="text-xs text-blue-400">Rendering...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileGenerator;
