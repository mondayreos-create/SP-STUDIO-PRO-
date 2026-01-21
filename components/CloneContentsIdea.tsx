
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { generatePromptFromImage, generateImage } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

interface StoryIdeaItem {
    id: number;
    title: string;
    description: string;
    thumbnailUrl?: string;
    isGeneratingThumbnail: boolean;
}

const CloneContentsIdea: React.FC = () => {
    const [refImage, setRefImage] = useState<{ base64: string, mimeType: string, url: string } | null>(null);
    const [characterDetail, setCharacterDetail] = useState<string>('');
    const [ideas, setIdeas] = useState<StoryIdeaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<number | string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                const url = URL.createObjectURL(file);
                setRefImage({ base64, mimeType: file.type, url });
                setIdeas([]);
                setCharacterDetail('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetIdeas = async () => {
        if (!refImage) {
            setError("Please upload an image model first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setIdeas([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // 1. Analyze the character
            const analysis = await generatePromptFromImage(refImage.base64, refImage.mimeType);
            setCharacterDetail(analysis);

            // 2. Generate 5 ideas
            const prompt = `
                Character Context: "${analysis}"
                Generate 5 creative, unique, and viral short story ideas (synopses) that would work perfectly for a 3D animation or comic series featuring this character.
                Output as a JSON object with:
                "ideas": Array of objects with "title" and "description" fields.
                "characterProfile": A slightly more condensed and reusable character description string (for consistent AI art generation).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            ideas: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        description: { type: Type.STRING }
                                    },
                                    required: ["title", "description"]
                                }
                            },
                            characterProfile: { type: Type.STRING }
                        },
                        required: ["ideas", "characterProfile"]
                    }
                }
            });

            const data = JSON.parse(response.text || "{}");
            if (data.characterProfile) setCharacterDetail(data.characterProfile);

            const newIdeas = (data.ideas || []).map((item: any, idx: number) => ({
                id: idx + 1,
                title: item.title,
                description: item.description,
                isGeneratingThumbnail: false
            }));
            
            setIdeas(newIdeas);

            // 3. Automatically trigger thumbnail generation for each idea using the refined profile
            newIdeas.forEach((_, idx: number) => {
                generateThumbnail(idx, newIdeas[idx].title, newIdeas[idx].description, data.characterProfile || analysis);
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate ideas.");
        } finally {
            setIsLoading(false);
        }
    };

    const generateThumbnail = async (index: number, title: string, description: string, profile: string) => {
        setIdeas(prev => prev.map((item, idx) => idx === index ? { ...item, isGeneratingThumbnail: true } : item));
        
        try {
            const prompt = `
                Professional 3D Animation Thumbnail for story: "${title}".
                Action: ${description}
                Model Details: ${profile}
                Style: 3D Pixar Disney Style, cinematic lighting, extreme high detail, 8k, vibrant colors.
                Constraint: Character face and clothing must be identical to description. No text.
            `;
            const imageUrl = await generateImage(prompt, '16:9');
            setIdeas(prev => prev.map((item, idx) => idx === index ? { ...item, thumbnailUrl: imageUrl, isGeneratingThumbnail: false } : item));
        } catch (err) {
            setIdeas(prev => prev.map((item, idx) => idx === index ? { ...item, isGeneratingThumbnail: false } : item));
        }
    };

    const handleCopy = (text: string, id: number | string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleClear = () => {
        setRefImage(null);
        setCharacterDetail('');
        setIdeas([]);
        setError(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Upload & Character Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800/80 p-6 rounded-3xl border border-gray-700 shadow-2xl backdrop-blur-md">
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 uppercase tracking-tighter mb-4">
                            1. Story Model Upload
                        </h2>
                        <div className="relative aspect-square bg-gray-900 rounded-2xl border-2 border-dashed border-gray-700 overflow-hidden group hover:border-purple-500 transition-all flex items-center justify-center">
                            {refImage ? (
                                <>
                                    <img src={refImage.url} className="w-full h-full object-cover" />
                                    <button onClick={() => setRefImage(null)} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition">✕</button>
                                </>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center p-4 text-center">
                                    <span className="text-4xl mb-2 opacity-30">🖼️</span>
                                    <span className="text-xs text-gray-500 font-bold uppercase">Upload Character / Model</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>

                        {/* Character Details Setup */}
                        {(characterDetail || isLoading) && (
                            <div className="mt-6 space-y-2 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🎭 Characters Detail Setup</label>
                                    {characterDetail && (
                                        <button onClick={() => handleCopy(characterDetail, 'char-copy')} className="text-[10px] text-purple-400 hover:text-white transition uppercase font-bold">
                                            {copyStatus === 'char-copy' ? '✓ Copied' : 'Copy'}
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <textarea 
                                        value={characterDetail}
                                        onChange={(e) => setCharacterDetail(e.target.value)}
                                        placeholder="AI is analyzing character..."
                                        className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-[11px] text-gray-300 h-32 resize-none focus:ring-1 focus:ring-purple-500 outline-none leading-relaxed italic custom-scrollbar"
                                        disabled={isLoading}
                                    />
                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-[1px]">
                                            <Spinner className="h-6 w-6 text-purple-500 m-0" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[9px] text-gray-500 leading-tight">These details are used to keep the character consistent across all generated story paths.</p>
                            </div>
                        )}

                        <button 
                            onClick={handleGetIdeas}
                            disabled={isLoading || !refImage}
                            className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-2xl shadow-xl transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
                        >
                            {isLoading ? <><Spinner /> Architecting...</> : 'Get Ideas Story 🚀'}
                        </button>
                    </div>

                    {error && <div className="p-4 bg-red-900/20 border border-red-700 text-red-300 rounded-2xl text-center text-sm animate-shake">{error}</div>}
                    
                    <button onClick={handleClear} className="w-full py-3 bg-gray-900/50 text-gray-500 hover:text-red-400 rounded-2xl text-xs font-bold transition">Clear Studio</button>
                </div>

                {/* Right side: Results */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-gray-800/80 p-6 rounded-3xl border border-gray-700 shadow-2xl min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                <span className="text-2xl">✨</span> 5 Content Ideas For You
                            </h2>
                            {ideas.length > 0 && (
                                <button 
                                    onClick={() => handleCopy(ideas.map(i => `${i.title}\n${i.description}`).join('\n\n'), 'all-ideas')}
                                    className="text-[10px] bg-gray-900 text-gray-400 px-3 py-1.5 rounded-full border border-gray-700 hover:text-white transition font-black uppercase"
                                >
                                    {copyStatus === 'all-ideas' ? '✓ All Copied' : 'Copy All Ideas'}
                                </button>
                            )}
                        </div>

                        <div className="space-y-8 flex-grow overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar pb-10">
                            {ideas.length > 0 ? (
                                ideas.map((idea, idx) => (
                                    <div key={idx} className="bg-gray-900/50 rounded-3xl border border-gray-800 overflow-hidden flex flex-col md:flex-row group hover:border-purple-500/50 transition-all duration-300 shadow-xl">
                                        <div className="w-full md:w-56 aspect-video md:aspect-square bg-black shrink-0 relative overflow-hidden flex items-center justify-center">
                                            {idea.thumbnailUrl ? (
                                                <img src={idea.thumbnailUrl} className="w-full h-full object-cover transition transform group-hover:scale-105" alt="Thumbnail" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    {idea.isGeneratingThumbnail ? (
                                                        <><Spinner className="h-8 w-8 text-purple-500 mb-2"/><span className="text-[10px] text-gray-500 font-black uppercase animate-pulse tracking-widest">Rendering...</span></>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Awaiting Studio</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-700">Thumbnail {idx + 1}</div>
                                        </div>
                                        <div className="p-6 flex flex-col flex-grow">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-black text-purple-400 uppercase leading-tight">{idea.title}</h3>
                                                <button onClick={() => handleCopy(`${idea.title}\n\n${idea.description}`, idea.id)} className="text-gray-600 hover:text-white transition">
                                                    {copyStatus === idea.id ? <span className="text-[10px] font-bold text-green-500 uppercase">Copied</span> : <CopyIcon />}
                                                </button>
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed font-serif italic mb-4">"{idea.description}"</p>
                                            <div className="mt-auto pt-3 border-t border-gray-800 flex gap-2">
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-2 py-1 bg-gray-800 rounded">Idea #{idx + 1}</span>
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-2 py-1 bg-indigo-900/20 rounded border border-indigo-900/50">3D Consistent model</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center opacity-20 py-20">
                                    <span className="text-8xl mb-4 grayscale">💡</span>
                                    <p className="text-xl font-black uppercase tracking-[0.4em]">Studio Floor Empty</p>
                                    <p className="text-xs mt-2 uppercase font-bold tracking-widest">Upload your model to trigger 5 unique production paths.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloneContentsIdea;
