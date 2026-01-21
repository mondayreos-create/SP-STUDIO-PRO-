import React, { useState, useCallback, useEffect } from 'react';
import { generateMvScript, generateVideo, generateLyricsFromTitle, generateSongMusicPrompt, MvScene } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const MotionIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const JsonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const SongMvGenerator: React.FC = () => {
    const [songTitle, setSongTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [scenes, setScenes] = useState<MvScene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
    const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<number | string | null>(null);
    const [sceneVideos, setSceneVideos] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});
    
    // Extra assets
    const [fullLyrics, setFullLyrics] = useState('');
    const [musicPrompt, setMusicPrompt] = useState('');

    // History state
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'song-mv') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'song-mv',
                category: 'vip',
                title: songTitle || "Song MV Project",
                data: { songTitle, artist, scenes, fullLyrics, musicPrompt }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
            loadLocalHistory();
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'song-mv') return;
            const d = e.detail.data;
            if (d.songTitle) setSongTitle(d.songTitle);
            if (d.artist) setArtist(d.artist);
            if (d.scenes) setScenes(d.scenes);
            if (d.fullLyrics) setFullLyrics(d.fullLyrics);
            if (d.musicPrompt) setMusicPrompt(d.musicPrompt);
            setShowHistory(false);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [songTitle, artist, scenes, fullLyrics, musicPrompt]);

    useEffect(() => {
        loadLocalHistory();
    }, []);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'song-mv');
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

    useEffect(() => {
        return () => {
            Object.values(sceneVideos).forEach((v: { loading: boolean; url: string | null; error: string | null }) => {
                if (v.url) URL.revokeObjectURL(v.url);
            });
        };
    }, [sceneVideos]);

    const handleGenerateScript = async () => {
        if (!songTitle.trim()) {
            setError("Please enter a song title.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setScenes([]);
        
        try {
            const script = await generateMvScript(songTitle, artist);
            setScenes(script);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate MV script.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetLyrics = async () => {
        if (!songTitle.trim()) {
            setError("Please enter a song title first.");
            return;
        }
        setIsGeneratingLyrics(true);
        setError(null);
        setFullLyrics('');
        try {
            const lyrics = await generateLyricsFromTitle(songTitle);
            setFullLyrics(lyrics);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate lyrics.");
        } finally {
            setIsGeneratingLyrics(false);
        }
    };

    const handleGetMusicPrompt = async () => {
        if (!songTitle.trim()) {
            setError("Please enter a song title first.");
            return;
        }
        setIsGeneratingMusic(true);
        setError(null);
        setMusicPrompt('');
        try {
            const prompt = await generateSongMusicPrompt(songTitle, artist);
            setMusicPrompt(prompt);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate music prompt.");
        } finally {
            setIsGeneratingMusic(false);
        }
    };

    const handleCopyText = (text: string, id: number | string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleGenerateVideo = async (index: number, prompt: string) => {
        setSceneVideos(prev => ({ ...prev, [index]: { loading: true, url: null, error: null } }));
        try {
            const blob = await generateVideo({ 
                prompt: prompt, 
                aspectRatio: '16:9', 
                resolution: '720p' 
            });
            const url = URL.createObjectURL(blob);
            setSceneVideos(prev => ({ ...prev, [index]: { loading: false, url, error: null } }));
        } catch (err) {
            setSceneVideos(prev => ({ ...prev, [index]: { loading: false, url: null, error: err instanceof Error ? err.message : "Video generation failed" } }));
        }
    };

    const handleDownloadSenses = () => {
        const text = scenes.map(s => `Scene ${s.scene_number} [${s.timestamp}]: ${s.lyrics}\nVisual: ${s.visual_description}`).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Song_MV_Senses_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadJson = () => {
        const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Song_MV_Storyboard_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setSongTitle('');
        setArtist('');
        setScenes([]);
        setSceneVideos({});
        setFullLyrics('');
        setMusicPrompt('');
        setError(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            {/* Action Bar */}
            <div className="w-full flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            loadLocalHistory();
                            setShowHistory(!showHistory);
                        }} 
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 border ${showHistory ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
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
                <div className="w-full bg-gray-900/90 border-2 border-indigo-500/50 p-6 rounded-2xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <HistoryIcon /> Song MV History Vault
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
                                        <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded font-black border border-indigo-800/50 uppercase">#{localHistory.length - idx}</span>
                                        <span className="text-[9px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">Song MV</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic">"{project.data.songTitle}"</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-indigo-400 font-black uppercase">Click to Reload ➜</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Inputs */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 lg:col-span-1">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2 flex items-center gap-2">
                        <span>📹</span> Song MV
                    </h2>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Song Title</label>
                        <input 
                            type="text"
                            value={songTitle}
                            onChange={(e) => setSongTitle(e.target.value)}
                            placeholder="e.g. Bohemian Rhapsody"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Artist / Style (Optional)</label>
                        <input 
                            type="text"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            placeholder="e.g. Queen, Rock Opera style"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                        />
                    </div>

                    <button 
                        onClick={handleGenerateScript} 
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Spinner /> : '🎬'} 
                        {isLoading ? 'Planning MV...' : 'Generate MV Plan'}
                    </button>

                    <div className="pt-4 border-t border-gray-700">
                         <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Song Generation Tools</h3>
                         <div className="grid grid-cols-2 gap-3">
                             <button onClick={handleGetLyrics} disabled={isGeneratingLyrics} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">{isGeneratingLyrics ? <Spinner className="h-3 w-3"/> : '📝'} Get Lyric Song</button>
                             <button onClick={handleGetMusicPrompt} disabled={isGeneratingMusic} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">{isGeneratingMusic ? <Spinner className="h-3 w-3"/> : '🎹'} Get Music Prompt</button>
                         </div>
                    </div>
                    
                    {(fullLyrics || musicPrompt) && (
                        <div className="space-y-4 pt-2 animate-fade-in">
                            {musicPrompt && (
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-600">
                                    <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-purple-400">Music Prompt</span><button onClick={() => handleCopyText(musicPrompt, 'musicPrompt')} className="text-gray-500 hover:text-white">{copyStatus === 'musicPrompt' ? <span className="text-green-400 text-[10px]">✓</span> : <CopyIcon />}</button></div>
                                    <p className="text-xs text-gray-300 font-mono">{musicPrompt}</p>
                                </div>
                            )}
                            {fullLyrics && (
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-600">
                                    <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-pink-400">Full Lyrics</span><button onClick={() => handleCopyText(fullLyrics, 'fullLyrics')} className="text-gray-500 hover:text-white">{copyStatus === 'fullLyrics' ? <span className="text-green-400 text-[10px]">✓</span> : <CopyIcon />}</button></div>
                                    <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">{fullLyrics}</div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>

                {/* Right: Output Scenes */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-gray-800/60 p-4 rounded-xl border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">MV Breakdown ({scenes.length} Scenes)</h3>
                            {scenes.length > 0 && (
                                <div className="flex gap-2">
                                     <button onClick={handleDownloadSenses} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm">
                                        <DownloadIcon /> Download all Senses
                                    </button>
                                    <button onClick={handleDownloadJson} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition shadow-sm">
                                        <JsonIcon /> Download JSON all senses
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {scenes.length === 0 && !isLoading && (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                                <span className="text-4xl mb-4 opacity-30">🎵</span>
                                <p>Generated scenes and prompts will appear here.</p>
                            </div>
                        )}

                        <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                            {scenes.map((scene, idx) => (
                                <div key={idx} className="bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-md">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-purple-400 uppercase bg-purple-900/30 px-2 py-0.5 rounded border border-purple-900/50">Scene {scene.scene_number}</span>
                                            <span className="text-xs text-gray-500 font-mono">{scene.timestamp}</span>
                                        </div>
                                        <button onClick={() => handleCopyText(scene.video_prompt, idx)} className="text-gray-500 hover:text-white flex items-center gap-1 text-[10px] bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 transition">
                                            {copyStatus === idx ? <span className="text-green-400 font-bold">Copied!</span> : <><CopyIcon /> Copy Prompt</>}
                                        </button>
                                    </div>
                                    <p className="text-white text-sm mb-3 font-serif italic">"{scene.lyrics}"</p>
                                    <div className="bg-black/30 p-3 rounded border border-gray-800 mb-3"><p className="text-gray-400 text-xs font-bold mb-1">Visual Description:</p><p className="text-gray-300 text-sm mb-3">{scene.visual_description}</p><p className="text-gray-400 text-xs font-bold mb-1">Video Prompt:</p><p className="text-teal-400 text-xs font-mono leading-relaxed bg-black/50 p-2 rounded">{scene.video_prompt}</p></div>
                                    <div className="mt-3">
                                        {sceneVideos[idx]?.url ? (
                                            <div className="w-full aspect-video bg-black rounded overflow-hidden"><video src={sceneVideos[idx].url!} controls className="w-full h-full object-contain" /></div>
                                        ) : (
                                            <button onClick={() => handleGenerateVideo(idx, scene.video_prompt)} disabled={sceneVideos[idx]?.loading} className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg hover:border-purple-500 hover:bg-gray-800/50 transition flex items-center justify-center gap-2 text-gray-500 group">{sceneVideos[idx]?.loading ? <><Spinner className="h-4 w-4 text-purple-500"/> <span className="text-xs">Generating Video...</span></> : <><MotionIcon /> <span className="text-xs font-bold group-hover:text-white">Generate Video Preview</span></>}</button>
                                        )}
                                        {sceneVideos[idx]?.error && <p className="text-red-400 text-xs mt-2 text-center">{sceneVideos[idx].error}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SongMvGenerator;