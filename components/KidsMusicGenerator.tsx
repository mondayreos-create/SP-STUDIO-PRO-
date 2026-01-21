
import React, { useState, useCallback, useEffect } from 'react';
import { generateKidsMusicProject, KidsMusicProject, Character } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const JsonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const musicStyles = [
    'Lullaby (Sleep)', 
    'Upbeat / Happy', 
    'Educational / Rhythmic', 
    'Orchestral / Cinematic', 
    'Folk / Acoustic', 
    'Pop / Dance',
    'Ambient / Relaxing'
];

const visualStyles = [
    '3D Render (Pixar Style)',
    '2D Cartoon (Flat)',
    'Anime (Cute/Chibi)',
    'Claymation',
    'Watercolor',
    'Paper Cutout',
    'Pixel Art'
];

const characterTypes = [
    'Mix (People & Animals)',
    'People Only', 
    'Animals Only', 
    'Fantasy Creatures', 
    'Robots'
];

const KidsMusicGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [musicStyle, setMusicStyle] = useState(musicStyles[1]);
    const [characterType, setCharacterType] = useState(characterTypes[0]);
    const [visualStyle, setVisualStyle] = useState(visualStyles[0]);
    const [sceneCount, setSceneCount] = useState(5);
    const [characters, setCharacters] = useState<Character[]>([
        { name: 'Bong', gender: 'Male', age: 'Baby', description: 'A cute little bear with a red hat' }
    ]);
    const [generatedResult, setGeneratedResult] = useState<KidsMusicProject | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    useEffect(() => {
        loadLocalHistory();
    }, []);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'kids-music');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleReloadHistory = (project: any) => {
        if (project.data.topic) setTopic(project.data.topic);
        if (project.data.musicStyle) setMusicStyle(project.data.musicStyle);
        if (project.data.characterType) setCharacterType(project.data.characterType);
        if (project.data.visualStyle) setVisualStyle(project.data.visualStyle);
        if (project.data.sceneCount) setSceneCount(project.data.sceneCount);
        if (project.data.characters) setCharacters(project.data.characters);
        if (project.data.generatedResult) setGeneratedResult(project.data.generatedResult);
        setShowHistory(false);
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Please enter a topic for the song.");
            return;
        }
        
        // Basic validation for characters
        const validChars = characters.filter(c => c.name.trim());
        if (validChars.length === 0) {
             setError("Please add at least one character.");
             return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedResult(null);

        try {
            const result = await generateKidsMusicProject(
                topic,
                musicStyle,
                characterType,
                visualStyle,
                sceneCount,
                validChars
            );
            setGeneratedResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const addCharacter = () => {
        if (characters.length < 4) {
            setCharacters([...characters, { name: '', gender: '', age: '', description: '' }]);
        }
    };

    const removeCharacter = (index: number) => {
        const newChars = [...characters];
        newChars.splice(index, 1);
        setCharacters(newChars);
    };

    const updateCharacter = (index: number, field: keyof Character, value: string) => {
        const newChars = [...characters];
        newChars[index] = { ...newChars[index], [field]: value };
        setCharacters(newChars);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyAllSenses = () => {
        if (!generatedResult) return;
        const text = generatedResult.scenes.map(s => `Scene ${s.sceneNumber} (${s.lyricSegment}): ${s.visualPrompt}`).join('\n\n');
        handleCopy(text, 'all-senses');
    };

    const handleCopyAllJson = () => {
        if (!generatedResult) return;
        handleCopy(JSON.stringify(generatedResult, null, 2), 'all-json');
    };
    
    const handleClear = () => {
        setTopic('');
        setGeneratedResult(null);
        setError(null);
        setCharacters([{ name: 'Bong', gender: 'Male', age: 'Baby', description: 'A cute little bear with a red hat' }]);
        setSceneCount(5);
        setCharacterType(characterTypes[0]);
    };

    const inputClass = "w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none";

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            {/* Header Action Bar */}
            <div className="w-full flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            loadLocalHistory();
                            setShowHistory(!showHistory);
                        }} 
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 border shadow-lg ${showHistory ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-[#1e293b] border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                    >
                        <HistoryIcon /> {showHistory ? 'Hide History' : 'Reload History | ប្រវត្តផលិត'}
                    </button>
                </div>
                <button onClick={handleClear} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-300 bg-red-950/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-colors duration-200">
                    <TrashIcon className="h-4 w-4" /> Reset Studio | សម្អាត
                </button>
            </div>

            {/* History Overlay */}
            {showHistory && (
                <div className="w-full bg-[#0f172a]/95 border-2 border-indigo-500/50 p-6 rounded-3xl mb-8 animate-slide-down shadow-[0_0_50px_rgba(79,70,229,0.2)] relative z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5" /> Kids Music History Vault
                        </h4>
                        <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-3xl transition-colors">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto custom-scrollbar pr-3">
                        {localHistory.length > 0 ? (
                            localHistory.map((project, idx) => (
                                <div 
                                    key={project.id} 
                                    onClick={() => handleReloadHistory(project)}
                                    className="bg-[#1e293b]/60 hover:bg-[#1e293b] border border-gray-700 p-5 rounded-2xl cursor-pointer transition-all group shadow-inner"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2.5 py-1 rounded-full font-black border border-indigo-800/50 uppercase tracking-tighter">#{localHistory.length - idx}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">{project.data.topic || "Untitled Music"}</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-1 italic">{project.data.musicStyle} • {project.data.visualStyle}</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">Click to Reload ➜</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                {/* Left Panel: Configuration */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-5">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
                        បទភ្លេង សម្រាប់កុម៉ា 👶
                    </h2>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Topic (ប្រធានបទ)</label>
                        <input 
                            type="text" 
                            value={topic} 
                            onChange={(e) => setTopic(e.target.value)} 
                            placeholder="e.g. Learning Colors, Brush Teeth..." 
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Music Rhythm</label>
                            <select value={musicStyle} onChange={(e) => setMusicStyle(e.target.value)} className={inputClass}>
                                {musicStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-gray-400 mb-1">Character Type</label>
                             <select value={characterType} onChange={(e) => setCharacterType(e.target.value)} className={inputClass}>
                                {characterTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Visual Style</label>
                             <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className={inputClass}>
                                {visualStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Scenes (Senses)</label>
                             <div className="flex items-center bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
                                <button onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 transition text-white">-</button>
                                <input 
                                    type="number" 
                                    value={sceneCount} 
                                    onChange={(e) => setSceneCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} 
                                    className="w-full text-center bg-transparent outline-none text-white font-bold"
                                />
                                <button onClick={() => setSceneCount(Math.min(20, sceneCount + 1))} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 transition text-white">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Character Setup */}
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-300">Characters ({characters.length}/4)</label>
                            {characters.length < 4 && (
                                <button onClick={addCharacter} className="text-xs text-cyan-400 flex items-center gap-1 hover:text-white transition">
                                    <PlusIcon /> Add
                                </button>
                            )}
                        </div>
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {characters.map((char, idx) => (
                                <div key={idx} className="bg-gray-800 p-2 rounded border border-gray-600 relative">
                                    <div className="absolute top-1 right-1">
                                        <button onClick={() => removeCharacter(idx)} className="text-gray-500 hover:text-red-500"><TrashIcon/></button>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Name" 
                                        value={char.name} 
                                        onChange={(e) => updateCharacter(idx, 'name', e.target.value)} 
                                        className="w-full bg-transparent border-b border-gray-600 text-sm mb-1 focus:border-cyan-500 outline-none font-bold"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Description (Appearance)" 
                                        value={char.description} 
                                        onChange={(e) => updateCharacter(idx, 'description', e.target.value)} 
                                        className="w-full bg-transparent text-xs text-gray-400 outline-none placeholder-gray-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Spinner /> : '🎶'} 
                        {isLoading ? 'Creating Magic...' : 'Generate Music Project'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>

                {/* Right Panel: Output */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col md:flex-row gap-2 mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700 sticky top-0 z-10 backdrop-blur">
                        {generatedResult && (
                            <>
                                <button onClick={handleCopyAllSenses} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition shadow-md">
                                    {copyStatus === 'all-senses' ? '✓ Copied' : 'Copy all Senses'}
                                </button>
                                <button onClick={handleCopyAllJson} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition shadow-md">
                                    {copyStatus === 'all-json' ? '✓ Copied' : 'Copy JSON all senses'}
                                </button>
                            </>
                        )}
                    </div>

                    {generatedResult ? (
                        <>
                             <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{generatedResult.title}</h2>
                                        <p className="text-gray-400 text-sm">Generated Lyrics & Music Prompt</p>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(JSON.stringify(generatedResult, null, 2), 'full-json-legacy')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition"
                                    >
                                        {copyStatus === 'full-json-legacy' ? <span className="text-green-400">Copied!</span> : <><JsonIcon /> Copy All JSON</>}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Music Prompt */}
                                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-bold text-purple-400">🎹 Music Prompt (Suno/Udio)</h4>
                                            <button onClick={() => handleCopy(generatedResult.musicPrompt, 'music')} className="text-gray-400 hover:text-white">
                                                {copyStatus === 'music' ? <span className="text-green-400 text-xs">Copied!</span> : <CopyIcon />}
                                            </button>
                                        </div>
                                        <p className="text-gray-300 text-sm font-mono bg-black/30 p-2 rounded">{generatedResult.musicPrompt}</p>
                                    </div>

                                    {/* Lyrics */}
                                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 row-span-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-bold text-cyan-400">🎤 Lyrics</h4>
                                            <button onClick={() => handleCopy(generatedResult.lyrics, 'lyrics')} className="text-gray-400 hover:text-white">
                                                 {copyStatus === 'lyrics' ? <span className="text-green-400 text-xs">Copied!</span> : <CopyIcon />}
                                            </button>
                                        </div>
                                        <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed h-64 overflow-y-auto custom-scrollbar">
                                            {generatedResult.lyrics}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scenes */}
                            <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-xl font-bold text-white mb-4">Visual Scenes ({generatedResult.scenes.length})</h3>
                                <div className="space-y-4">
                                    {generatedResult.scenes.map((scene, idx) => (
                                        <div key={idx} className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex gap-4 flex-col sm:flex-row">
                                            <div className="flex-grow">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-bold text-purple-400 uppercase">Scene {scene.sceneNumber}</span>
                                                    <span className="text-xs text-gray-500">Lyric Segment</span>
                                                </div>
                                                <p className="text-white text-sm mb-3 italic">"{scene.lyricSegment}"</p>
                                                
                                                <div className="bg-black/30 p-3 rounded border border-gray-800">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-bold text-gray-400">Image Prompt:</span>
                                                        <button onClick={() => handleCopy(scene.visualPrompt, `scene-${idx}`)} className="text-gray-500 hover:text-white">
                                                             {copyStatus === `scene-${idx}` ? <span className="text-green-400 text-[10px]">✓</span> : <CopyIcon />}
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-300 text-xs font-mono">{scene.visualPrompt}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl min-h-[400px]">
                            <span className="text-6xl mb-4 opacity-20">👶</span>
                            <p className="text-lg">Generated Music Project will appear here.</p>
                            <p className="text-sm">Lyrics, Prompts, and Visual Scenes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KidsMusicGenerator;
