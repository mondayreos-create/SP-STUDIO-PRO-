import React, { useState, useEffect } from 'react';
import { generateShortFilmProject, ShortFilmProject } from '../services/geminiService.ts';

interface Character {
    id: number;
    name: string;
    gender: string;
    age: string;
    description: string;
}

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

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const filmGenres = [
    'Cinematic / Epic',
    'Horror / Thriller',
    'Sci-Fi / Cyberpunk',
    'Fantasy / Magical',
    'Romance / Drama',
    'Comedy / Sitcom',
    'Documentary / Realism',
    'Mystery / Noir'
];

const visualStyles = [
    'Photorealistic (Sora/Veo)',
    '3D Pixar / Disney',
    'Anime (Studio Ghibli)',
    'Dark Fantasy (Tim Burton)',
    'Watercolor Art',
    'Vintage Film (1950s)',
    'Claymation (Stop Motion)',
    'Cyberpunk Neon'
];

const characterTypes = [
    'People (Real Actors)',
    'Animals (Anthropomorphic)',
    'Robots / Mecha',
    'Monsters / Creatures',
    'Toys / Dolls',
    'Mixed Cast'
];

const ShortFilmGenerator: React.FC = () => {
    const [title, setTitle] = useState('');
    const [synopsis, setSynopsis] = useState('');
    const [genre, setGenre] = useState(filmGenres[0]);
    const [visualStyle, setVisualStyle] = useState(visualStyles[0]);
    const [characterType, setCharacterType] = useState(characterTypes[0]);
    const [sceneCount, setSceneCount] = useState(6);
    const [characters, setCharacters] = useState<Character[]>([{ id: Date.now(), name: 'John', gender: 'Male', age: '30s', description: 'A rugged detective with a trench coat.' }]);
    const [result, setResult] = useState<ShortFilmProject | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'short-film') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'short-film',
                category: 'vip',
                title: title || "Short Film Project",
                data: { title, synopsis, genre, visualStyle, characterType, sceneCount, characters, result }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
            loadLocalHistory();
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'short-film') return;
            const d = e.detail.data;
            if (d.title) setTitle(d.title);
            if (d.synopsis) setSynopsis(d.synopsis);
            if (d.genre) setGenre(d.genre);
            if (d.visualStyle) setVisualStyle(d.visualStyle);
            if (d.characterType) setCharacterType(d.characterType);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.characters) setCharacters(d.characters);
            if (d.result) setResult(d.result);
            setShowHistory(false);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [title, synopsis, genre, visualStyle, characterType, sceneCount, characters, result]);

    useEffect(() => {
        loadLocalHistory();
    }, []);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'short-film');
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

    const handleGenerate = async () => {
        const validChars = characters.filter(c => c.name.trim());
        if (validChars.length === 0) {
            setError("Please add at least one character.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const serviceChars = validChars.map(({ id, ...rest }) => rest);
            const data = await generateShortFilmProject(title, synopsis, genre, visualStyle, characterType, sceneCount, serviceChars);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const addCharacter = () => { if (characters.length < 4) setCharacters([...characters, { id: Date.now(), name: '', gender: '', age: '', description: '' }]); };
    const removeCharacter = (id: number) => { setCharacters(characters.filter(char => char.id !== id)); };
    const updateCharacter = (id: number, field: keyof Omit<Character, 'id'>, value: string) => { setCharacters(characters.map(char => char.id === id ? { ...char, [field]: value } : char)); };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleDownloadSenses = () => {
        if (!result) return;
        const text = result.scenes.map(s => `Scene ${s.sceneNumber}: ${s.action}`).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Short_Film_Senses_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadJson = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Short_Film_Storyboard_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setTitle('');
        setSynopsis('');
        setResult(null);
        setError(null);
        setCharacters([{ id: Date.now(), name: 'John', gender: 'Male', age: '30s', description: 'A rugged detective with a trench coat.' }]);
        setSceneCount(6);
        setGenre(filmGenres[0]);
    };

    const inputClass = "w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none";

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
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 border ${showHistory ? 'bg-amber-600 border-amber-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
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
                <div className="w-full bg-gray-900/90 border-2 border-amber-500/50 p-6 rounded-2xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                            <HistoryIcon /> Film History Vault
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
                                        <span className="text-[10px] bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded font-black border border-amber-800/50 uppercase">#{localHistory.length - idx}</span>
                                        <span className="text-[9px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">Short Film</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic">"{project.data.title || project.data.synopsis}"</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-amber-400 font-black uppercase">Click to Reload ➜</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-5">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-4 flex items-center gap-2"><span>🎥</span> Short Film</h2>
                    <div><label className="block text-sm font-semibold text-gray-300 mb-2">Film Title (Optional)</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave blank for AI to generate..." className={inputClass}/></div>
                     <div><label className="block text-sm font-semibold text-gray-300 mb-2">Story Idea / Synopsis</label><textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Briefly describe your movie idea..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-24 resize-none focus:ring-2 focus:ring-yellow-500 outline-none text-sm"/></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-gray-400 mb-1">Genre</label><select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass}>{filmGenres.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-xs font-medium text-gray-400 mb-1">Visual Style</label><select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className={inputClass}>{visualStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-gray-400 mb-1">Character Type</label><select value={characterType} onChange={(e) => setCharacterType(e.target.value)} className={inputClass}>{characterTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div><label className="block text-xs font-medium text-gray-400 mb-1">Scene Count</label><div className="flex items-center bg-gray-900 rounded-lg border border-gray-600 overflow-hidden"><button onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="px-3 py-2 bg-gray-700 text-white">-</button><input type="number" value={sceneCount} onChange={(e) => setSceneCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))} className="w-full text-center bg-transparent outline-none text-white font-bold"/><button onClick={() => setSceneCount(Math.min(30, sceneCount + 1))} className="px-3 py-2 bg-gray-700 text-white">+</button></div></div></div>
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700"><div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-300">Cast ({characters.length}/4)</label>{characters.length < 4 && (<button onClick={addCharacter} className="text-xs text-yellow-400 flex items-center gap-1 hover:text-white transition"><PlusIcon /> Add</button>)}</div><div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">{characters.map((char, idx) => (
                        <div key={char.id} className="bg-gray-800 p-2 rounded border border-gray-600 relative">
                            <div className="absolute top-1 right-1">
                                <button onClick={() => removeCharacter(char.id)} className="text-gray-500 hover:text-red-500"><TrashIcon/></button>
                            </div>
                            <div className="flex gap-2 mb-2 pr-6">
                                <input type="text" placeholder="Name" value={char.name} onChange={(e) => updateCharacter(char.id, 'name', e.target.value)} className="w-1/2 bg-transparent border-b border-gray-600 text-sm focus:border-yellow-500 outline-none font-bold text-white"/>
                                <input type="text" placeholder="Age/Gender" value={char.age} onChange={(e) => updateCharacter(char.id, 'age', e.target.value)} className="w-1/2 bg-transparent border-b border-gray-600 text-xs focus:border-yellow-500 outline-none text-gray-400"/>
                            </div>
                            <textarea placeholder="Appearance..." value={char.description} onChange={(e) => updateCharacter(char.id, 'description', e.target.value)} className="w-full bg-transparent text-xs text-gray-400 outline-none placeholder-gray-600 resize-none h-12"/>
                        </div>
                    ))}</div></div>
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{isLoading ? <Spinner /> : '🎬'} {isLoading ? 'Directing Film...' : 'Generate Film Project'}</button>
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {result ? (
                        <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div><h2 className="text-2xl font-bold text-white">{result.title}</h2><p className="text-gray-400 text-sm mt-1"><span className="text-yellow-500">{result.genre}</span> • {result.visualStyle}</p></div>
                                <div className="flex gap-2">
                                     <button onClick={handleDownloadSenses} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm">
                                        <DownloadIcon /> Download all Senses
                                    </button>
                                    <button onClick={handleDownloadJson} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm">
                                        <JsonIcon /> Download JSON all senses
                                    </button>
                                </div>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-4"><h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Synopsis</h4><p className="text-gray-300 text-sm leading-relaxed">{result.synopsis}</p></div>
                            <h3 className="text-lg font-bold text-white mb-4">Scene Breakdown ({result.scenes.length})</h3>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                {result.scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-yellow-500/30 transition">
                                        <div className="flex justify-between items-start mb-3"><span className="text-xs font-bold text-yellow-400 uppercase bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-900/50">Scene {scene.sceneNumber}</span><span className="text-xs text-gray-400 italic">{scene.action}</span></div>
                                        <div className="bg-black/30 p-3 rounded border border-gray-800">
                                            <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-500 uppercase">Video Generation Prompt</span><button onClick={() => handleCopy(scene.videoPrompt, `scene-${idx}`)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded border border-gray-600 transition flex items-center gap-1">{copyStatus === `scene-${idx}` ? <span className="text-green-400">Copied!</span> : <><CopyIcon /> Copy</>}</button></div>
                                            <p className="text-gray-300 text-xs font-mono leading-relaxed">{scene.videoPrompt}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl min-h-[500px] bg-gray-800/30">
                            <div className="w-64 h-40 bg-black rounded-lg mb-4 overflow-hidden opacity-50 border border-gray-600 flex items-center justify-center relative"><span className="text-5xl">🎬</span></div>
                            <p className="text-lg font-semibold text-gray-400">Film Studio Floor Ready</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShortFilmGenerator;