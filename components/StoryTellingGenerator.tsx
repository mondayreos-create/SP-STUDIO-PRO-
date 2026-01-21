import React, { useState, useRef, useEffect } from 'react';
import { generateStoryChapter, generateVisualPromptFromText, generateImage, generateStoryOutlineJson, DetailedOutline } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const PasteIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
    </svg>
);

const ImageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
);

const StoryTellingGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [chapterLimit, setChapterLimit] = useState(10);
    const [currentChapter, setCurrentChapter] = useState(1);
    const [chapters, setChapters] = useState<Record<number, string>>({});
    const [chapterImages, setChapterImages] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [outline, setOutline] = useState<DetailedOutline | null>(null);
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

    // Auto-scroll to chapter list
    const chapterListRef = useRef<HTMLDivElement>(null);

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setTopic(text);
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    const handleGenerateOutline = async () => {
        if (!topic.trim()) {
            setError("Please enter a story idea first.");
            return;
        }
        setIsGeneratingOutline(true);
        setError(null);
        setOutline(null);
        
        try {
            const outlineData = await generateStoryOutlineJson(topic, chapterLimit);
            setOutline(outlineData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate outline');
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleWrite = async (chapterNum: number) => {
        if (!outline) {
            setError("Please generate an outline first.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setCurrentChapter(chapterNum);

        // Calculate context: Summary of previous chapters
        let context = "";
        if (chapterNum > 1) {
            const prevText = chapters[chapterNum - 1] || ""; 
            context = `Previous chapter ending: "...${prevText.slice(-800)}"`;
        }

        // Get specific plan for this chapter
        const plan = outline.chapters.find(c => c.chapter === chapterNum);

        try {
            const chapterContent = await generateStoryChapter(topic, chapterNum, chapterLimit, context, plan);
            
            setChapters(prev => ({
                ...prev,
                [chapterNum]: chapterContent
            }));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate chapter');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async () => {
        const text = chapters[currentChapter];
        if (!text) {
            setError("Please generate the chapter text first.");
            return;
        }

        setIsGeneratingImage(true);
        setError(null);

        try {
            // 1. Get Prompt
            const prompt = await generateVisualPromptFromText(text);
            // 2. Generate Image
            const imageUrl = await generateImage(prompt, '16:9');
            
            setChapterImages(prev => ({
                ...prev,
                [currentChapter]: imageUrl
            }));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate image');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleDownload = (content: string, chapterNum: number) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chapter-${chapterNum}-${outline?.title || 'story'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadImage = (url: string, chapterNum: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `chapter-${chapterNum}-art.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleNextChapter = () => {
        if (currentChapter < chapterLimit) {
            setCurrentChapter(prev => prev + 1);
        }
    };

    const handleClear = () => {
        setTopic('');
        setChapters({});
        setChapterImages({});
        setCurrentChapter(1);
        setOutline(null);
        setError(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col h-full">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Left Panel: Controls & Outline */}
                <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-fit space-y-6 flex flex-col max-h-[85vh]">
                    <div>
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Story Telling
                        </h2>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-300">Story Idea</label>
                            <button onClick={handlePaste} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition">
                                <PasteIcon /> Paste
                            </button>
                        </div>
                        <textarea 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Write me a story about..."
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 h-24 resize-y focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-500 text-sm"
                            disabled={!!outline}
                        />
                    </div>

                    {!outline ? (
                        <>
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Structure Limit (Chapters)</label>
                                <div className="flex items-center">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="20" 
                                        value={chapterLimit}
                                        onChange={(e) => setChapterLimit(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 text-center font-bold"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateOutline}
                                disabled={isGeneratingOutline || !topic.trim()}
                                className="w-full py-3 px-6 font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {isGeneratingOutline ? <><Spinner /> Planning...</> : 'Create Outline'}
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col flex-grow overflow-hidden">
                            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider border-b border-gray-700 pb-2">
                                {outline.title}
                            </h3>
                            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-2" ref={chapterListRef}>
                                {outline.chapters.map((chap) => {
                                    const isDone = !!chapters[chap.chapter];
                                    const isCurrent = currentChapter === chap.chapter;
                                    const hasImage = !!chapterImages[chap.chapter];
                                    
                                    return (
                                        <div 
                                            key={chap.chapter}
                                            onClick={() => setCurrentChapter(chap.chapter)}
                                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                                isCurrent 
                                                    ? 'bg-indigo-900/40 border-indigo-500 shadow-md' 
                                                    : 'bg-gray-800/40 border-transparent hover:bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`font-bold text-sm ${isCurrent ? 'text-indigo-300' : 'text-gray-300'}`}>
                                                    Chapter {chap.chapter}
                                                </span>
                                                <div className="flex gap-1">
                                                    {hasImage && <span className="text-xs" title="Image Generated">🖼️</span>}
                                                    {isDone && <span className="text-green-400 text-xs font-bold">✓</span>}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 line-clamp-1 font-medium">{chap.title}</p>
                                            
                                            {isCurrent && !isDone && !isLoading && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleWrite(chap.chapter); }}
                                                    className="mt-2 w-full py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition"
                                                >
                                                    Write Chapter
                                                </button>
                                            )}
                                            {isCurrent && isLoading && (
                                                <div className="mt-2 text-xs text-indigo-400 animate-pulse flex items-center justify-center">
                                                    <Spinner className="h-3 w-3 mr-1" /> Writing...
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Content */}
                <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col h-[85vh]">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                        <div>
                            <h3 className="text-xl font-bold text-gray-200">
                                {outline ? (
                                    <>Chapter {currentChapter}: <span className="text-indigo-400">{outline.chapters.find(c => c.chapter === currentChapter)?.title}</span></>
                                ) : (
                                    `Chapter ${currentChapter}`
                                )}
                            </h3>
                        </div>
                        
                        {chapters[currentChapter] && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage || !!chapterImages[currentChapter]}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition shadow-sm ${chapterImages[currentChapter] ? 'bg-gray-600 cursor-default' : 'bg-pink-600 hover:bg-pink-500'}`}
                                >
                                    {isGeneratingImage ? <Spinner className="h-3 w-3" /> : <ImageIcon />}
                                    {chapterImages[currentChapter] ? 'Image Ready' : 'Generate Art'}
                                </button>
                                <button 
                                    onClick={() => handleDownload(chapters[currentChapter], currentChapter)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-xs font-semibold shadow-sm"
                                >
                                    <DownloadIcon /> Text
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                        {/* Display Image if Generated */}
                        {chapterImages[currentChapter] && (
                            <div className="mb-6 relative group">
                                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                                    <img 
                                        src={chapterImages[currentChapter]} 
                                        alt={`Chapter ${currentChapter} Art`} 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleDownloadImage(chapterImages[currentChapter], currentChapter)}
                                    className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"
                                    title="Download Image"
                                >
                                    <DownloadIcon />
                                </button>
                            </div>
                        )}

                        {/* Display Outline Context if writing hasn't started */}
                        {outline && !chapters[currentChapter] && !isLoading && (
                            <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                                <h4 className="text-sm font-bold text-indigo-300 mb-2">Chapter Plan</h4>
                                <p className="text-gray-300 text-sm mb-2"><strong className="text-gray-400">Purpose:</strong> {outline.chapters.find(c => c.chapter === currentChapter)?.purpose}</p>
                                <p className="text-gray-300 text-sm"><strong className="text-gray-400">Summary:</strong> {outline.chapters.find(c => c.chapter === currentChapter)?.summary}</p>
                                <div className="mt-4 flex justify-center">
                                    <button 
                                        onClick={() => handleWrite(currentChapter)}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg transition"
                                    >
                                        Start Writing Chapter {currentChapter}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 relative min-h-[300px]">
                            {isLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <Spinner className="h-10 w-10 text-indigo-500 mb-4" />
                                    <p className="text-indigo-300 animate-pulse">Crafting your story...</p>
                                </div>
                            ) : chapters[currentChapter] ? (
                                <div className="font-serif text-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                                    {chapters[currentChapter]}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 italic pt-10">
                                    <span className="text-4xl mb-4 opacity-30">📖</span>
                                    <p>Chapter content will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Footer Navigation */}
                    {chapters[currentChapter] && currentChapter < chapterLimit && (
                        <div className="pt-4 border-t border-gray-700 flex justify-end">
                             <button 
                                onClick={handleNextChapter}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition text-sm font-bold shadow-sm"
                            >
                                Go to Chapter {currentChapter + 1} →
                            </button>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-center text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryTellingGenerator;