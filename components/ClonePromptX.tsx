import React, { useState, useCallback } from 'react';
import { generatePromptFromUrl } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
);

// --- Official SVG Logos ---

const YouTubeLogo = () => (
    <svg className="w-10 h-10 mb-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
);

const FacebookLogo = () => (
    <svg className="w-10 h-10 mb-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const PinterestLogo = () => (
    <svg className="w-10 h-10 mb-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.261 7.929-7.261 4.162 0 7.397 2.965 7.397 6.93 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C24.02 5.367 18.624 0 12.017 0z"/>
    </svg>
);

const InstagramLogo = () => (
    <svg className="w-10 h-10 mb-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);

const TikTokLogo = () => (
    <svg className="w-10 h-10 mb-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a6.34 6.34 0 0 1-2.22-2.02V15.5c.01 1.62-.35 3.25-1.15 4.66-.8 1.41-2.03 2.58-3.5 3.31-1.47.72-3.14 1.08-4.77 1.03-1.63-.05-3.26-.51-4.71-1.31-1.45-.8-2.69-1.98-3.5-3.39C.8 18.39.4 16.78.4 15.15c-.01-1.62.35-3.24 1.15-4.66.8-1.41 2.02-2.58 3.5-3.31 1.47-.72 3.14-1.08 4.77-1.03.16.01.32.02.48.04v4.01a7.11 7.11 0 0 0-1.72.03c-.93.18-1.78.63-2.45 1.28-.66.65-1.14 1.48-1.36 2.4-.22.92-.17 1.89.14 2.78.31.89.89 1.67 1.63 2.25.74.58 1.63.95 2.58 1.04.94.09 1.91-.03 2.79-.34.88-.31 1.65-.89 2.22-1.63.57-.74.93-1.63 1.02-2.58.08-.85.04-1.7-.12-2.53V0z"/>
    </svg>
);

const platforms = [
    { name: 'YouTube', icon: <YouTubeLogo />, color: 'hover:border-red-600 hover:text-red-500' },
    { name: 'Facebook', icon: <FacebookLogo />, color: 'hover:border-blue-600 hover:text-blue-500' },
    { name: 'Pinterest', icon: <PinterestLogo />, color: 'hover:border-red-700 hover:text-red-600' },
    { name: 'Instagram', icon: <InstagramLogo />, color: 'hover:border-pink-500 hover:text-pink-400' },
    { name: 'TikTok', icon: <TikTokLogo />, color: 'hover:border-cyan-400 hover:text-cyan-300' },
];

const ClonePromptX: React.FC = () => {
    const { t } = useLanguage();
    const [videoUrl, setVideoUrl] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState(platforms[0].name);
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGetPrompt = useCallback(async () => {
        if (!videoUrl.trim()) {
            setError('Please paste a video link.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedPrompt(null);

        try {
            const result = await generatePromptFromUrl(videoUrl, selectedPlatform);
            setGeneratedPrompt(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [videoUrl, selectedPlatform]);

    const handleCopy = () => {
        if (generatedPrompt) {
            navigator.clipboard.writeText(generatedPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-fade-in p-4">
            <div className="w-full bg-gray-800/60 p-8 rounded-3xl border border-gray-700 shadow-2xl backdrop-blur-xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                        Clone Prompt X 🔗
                    </h2>
                    <p className="text-gray-400 font-medium">
                        {t('copy_link_instruction')}
                    </p>
                </div>

                <div className="space-y-8">
                    {/* URL Input */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                Video Link / URL
                            </label>
                            {videoUrl && (
                                <button onClick={() => setVideoUrl('')} className="text-xs text-red-400 hover:underline">Clear Link</button>
                            )}
                        </div>
                        <div className="relative">
                             <input 
                                type="text" 
                                value={videoUrl} 
                                onChange={(e) => setVideoUrl(e.target.value)} 
                                placeholder="Paste YouTube, Facebook, Pinterest, Instagram, or TikTok link here..."
                                className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl p-4 pr-12 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder-gray-600"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">🔗</div>
                        </div>
                    </div>

                    {/* Platform Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 text-center">
                            {t('select_platform')}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {platforms.map((p) => (
                                <button
                                    key={p.name}
                                    onClick={() => setSelectedPlatform(p.name)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                                        selectedPlatform === p.name 
                                        ? 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                                        : `bg-gray-900/40 border-gray-700 text-gray-500 ${p.color}`
                                    }`}
                                >
                                    {p.icon}
                                    <span className="text-[10px] font-bold uppercase">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGetPrompt} 
                        disabled={isLoading || !videoUrl.trim()}
                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
                    >
                        {isLoading ? <Spinner className="h-6 w-6" /> : <span className="text-2xl">✨</span>} 
                        {isLoading ? 'Cloning Prompt...' : t('get_prompt_btn')}
                    </button>
                    
                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-700 text-red-300 rounded-2xl text-center text-sm animate-shake">
                            {error}
                        </div>
                    )}
                </div>

                {/* Result Section */}
                {generatedPrompt && (
                    <div className="mt-10 pt-10 border-t border-gray-700/50 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-cyan-400">📝</span> Cloned Prompt Result
                            </h3>
                            <button 
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition shadow-md"
                            >
                                {copied ? <span className="text-green-400 font-bold">Copied!</span> : <><CopyIcon /> Copy Text</>}
                            </button>
                        </div>
                        <div className="bg-black/40 rounded-2xl p-6 border border-gray-700 shadow-inner">
                            <p className="text-gray-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                                {generatedPrompt}
                            </p>
                        </div>
                        <p className="mt-4 text-center text-xs text-gray-500 italic">
                            * This prompt is optimized for high-quality AI Image & Video generation.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center text-[10px] text-gray-500 uppercase tracking-[0.2em] opacity-40">
                AI Prompt Cloning Technology • 2026
            </div>
        </div>
    );
};

export default ClonePromptX;
