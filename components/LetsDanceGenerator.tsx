
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateDancePrompts, DanceProject, Character } from '../services/geminiService.ts';
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

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const musicStyles = [
    'Disco / Funk (Upbeat)', 
    'K-Pop / Pop Dance', 
    'Hip Hop / Street Dance', 
    'Nursery Rhyme (Cute)', 
    'EDM / Techno (High Energy)', 
    'Salsa / Latin',
    'Ballet / Classical'
];

const visualStyles = [
    '3D Render (Pixar Style)',
    'Hyper-Realistic (Sora Style)',
    '2D Anime',
    'Claymation (Stop Motion)',
    'Pixel Art',
    'Cyberpunk Neon'
];

const characterTypes = [
    'Mix (Max - លាយគ្នា)',
    'People Only (មនុស្សសុទ្ធ)',
    'Animals Only (សត្វ)',
    'Robots', 
    'Fantasy Creatures'
];

const genderAgeOptions = [
    'Boy (ក្មេងប្រុស)',
    'Girl (ក្មេងស្រី)',
    'Young Man (កំលោះ)',
    'Young Woman (វ័យក្រមុំ)',
    'Uncle (លោកពូ)',
    'Aunt (អ្នកមីង)',
    'Grandpa (លោកតា)',
    'Grandma (លោកយាយ)',
    'Animal / Other'
];

const LetsDanceGenerator: React.FC = () => {
    const [musicStyle, setMusicStyle] = useState(musicStyles[0]);
    const [visualStyle, setVisualStyle] = useState(visualStyles[0]);
    const [characterType, setCharacterType] = useState(characterTypes[0]);
    const [sceneCount, setSceneCount] = useState(4);
    
    const [characters, setCharacters] = useState<Character[]>([
        { name: 'Meme Cat', gender: 'Animal / Other', age: 'Kitten', description: 'A white fluffy cat wearing cool black sunglasses.' },
        { name: 'Dara', gender: 'Boy (ក្មេងប្រុស)', age: '10', description: 'A cool kid wearing a hoodie and sneakers.' }
    ]);
    
    const [result, setResult] = useState<DanceProject | null>(null);
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
                const toolHistory = history.filter((p: any) => p.tool === 'lets-dance');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleReloadHistory = (project: any) => {
        if (project.data.musicStyle) setMusicStyle(project.data.musicStyle);
        if (project.data.visualStyle) setVisualStyle(project.data.visualStyle);
        if (project.data.characterType) setCharacterType(project.data.characterType);
        if (project.data.characters) setCharacters(project.data.characters);
        if (project.data.result) setResult(project.data.result);
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
            const data = await generateDancePrompts(
                musicStyle,
                visualStyle,
                characterType,
                sceneCount,
                validChars
            );
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const addCharacter = () => {
        if (characters.length < 4) {
            setCharacters([...characters, { name: '', gender: 'Boy (ក្មេងប្រុស)', age: '', description: '' }]);
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
        if (!result) return;
        const text = result.scenes.map(s => `Scene ${s.sceneNumber} (${s.action}): ${s.videoPrompt}`).join('\n\n');
        handleCopy(text, 'all-senses');
    };

    const handleCopyAllJson = () => {
        if (!result) return;
        handleCopy(JSON.stringify(result, null, 2), 'all-json');
    };

    const handleClear = () => {
        setResult(null);
        setError(null);
        setCharacters([
            { name: 'Meme Cat', gender: 'Animal / Other', age: 'Kitten', description: 'A white fluffy cat wearing cool black sunglasses.' }
        ]);
        setSceneCount(4);
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
                            <HistoryIcon className="h-5 w-5" /> Let's Dance History Vault
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
                                    <p className="text-white text-xs font-bold truncate mb-1">Dancers: {project.data.characters?.map((c: any) => c.name).join(', ')}</p>
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                {/* Left: Configuration */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-5">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400 mb-4 flex items-center gap-2">
                        <span>💃</span> តោះរាំលេង សម្រាប់កុម៉ា 👶
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Music Rhythm</label>
                            <select value={musicStyle} onChange={(e) => setMusicStyle(e.target.value)} className={inputClass}>
                                {musicStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Visual Style</label>
                            <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className={inputClass}>
                                {visualStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Character Type</label>
                            <select value={characterType} onChange={(e) => setCharacterType(e.target.value)} className={inputClass}>
                                {characterTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-gray-400 mb-1">Senses (Scenes)</label>
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

                    {/* Characters */}
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-300">Dancers ({characters.length}/4)</label>
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
                                        placeholder="Name (e.g. Cat 1)" 
                                        value={char.name} 
                                        onChange={(e) => updateCharacter(idx, 'name', e.target.value)} 
                                        className="w-full bg-transparent border-b border-gray-600 text-sm mb-2 focus:border-cyan-500 outline-none font-bold"
                                    />
                                    
                                    <div className="mb-2">
                                        <select 
                                            value={char.gender} 
                                            onChange={(e) => updateCharacter(idx, 'gender', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 p-1 focus:border-cyan-500 outline-none"
                                        >
                                            {genderAgeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>

                                    <textarea 
                                        placeholder="Appearance (Clothing, Color, Accessories)..." 
                                        value={char.description} 
                                        onChange={(e) => updateCharacter(idx, 'description', e.target.value)} 
                                        className="w-full bg-transparent text-xs text-gray-400 outline-none placeholder-gray-600 resize-none h-12"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-pink-600 to-yellow-500 hover:from-pink-500 hover:to-yellow-400 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Spinner /> : '🎬'} 
                        {isLoading ? 'Creating Prompts...' : 'Generate Video Prompts'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>

                {/* Right: Output */}
                <div className="lg:col-span-1 space-y-6">
                    {result ? (
                        <>
                             <div className="flex flex-col md:flex-row gap-2 mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700 sticky top-0 z-10 backdrop-blur">
                                <button onClick={handleCopyAllSenses} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-[10px] font-bold transition shadow-md">
                                    {copyStatus === 'all-senses' ? '✓ Copied' : 'Copy all Senses'}
                                </button>
                                <button onClick={handleCopyAllJson} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-[10px] font-bold transition shadow-md">
                                    {copyStatus === 'all-json' ? '✓ Copied' : 'Copy JSON all senses'}
                                </button>
                            </div>

                            {/* Master Prompt Card */}
                            <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 shadow-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                                        <span>🏆</span> Master Prompt
                                    </h3>
                                    <button 
                                        onClick={() => handleCopy(result.masterPrompt, 'master')}
                                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition"
                                    >
                                        {copyStatus === 'master' ? 'Copied!' : <><CopyIcon /> Copy Prompt</>}
                                    </button>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 text-gray-300 text-sm leading-relaxed h-40 overflow-y-auto custom-scrollbar">
                                    {result.masterPrompt}
                                </div>
                            </div>

                             {/* Music Prompt */}
                             <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-bold text-purple-400">🎵 Music Prompt (Suno)</h4>
                                    <button onClick={() => handleCopy(result.musicPrompt, 'music')} className="text-gray-500 hover:text-white text-xs">
                                        {copyStatus === 'music' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <p className="text-gray-400 text-xs font-mono">{result.musicPrompt}</p>
                            </div>

                            {/* Scenes List */}
                            <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-4">Scene Breakdown</h3>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                    {result.scenes.map((scene, idx) => (
                                        <div key={idx} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-pink-400 uppercase bg-pink-900/30 px-2 py-0.5 rounded">Scene {scene.sceneNumber}</span>
                                                <span className="text-xs text-gray-400 italic">{scene.action}</span>
                                            </div>
                                            <p className="text-gray-300 text-xs leading-relaxed mb-2">{scene.videoPrompt}</p>
                                            <button 
                                                onClick={() => handleCopy(scene.videoPrompt, `scene-${idx}`)} 
                                                className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] rounded transition flex items-center justify-center gap-1"
                                            >
                                                {copyStatus === `scene-${idx}` ? 'Copied!' : <><CopyIcon /> Copy Scene Prompt</>}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl min-h-[500px] bg-gray-800/30">
                            <div className="w-64 h-40 bg-black rounded-lg mb-4 overflow-hidden opacity-50 border border-gray-600 flex items-center justify-center relative">
                                 <span className="text-4xl">💃</span>
                                 <div className="absolute bottom-2 left-2 w-20 h-2 bg-gray-700 rounded"></div>
                            </div>
                            <p className="text-lg font-semibold text-gray-400">Ready to Dance?</p>
                            <p className="text-sm text-gray-500 mt-2 text-center px-10">
                                Configure your characters and rhythm on the left to generate professional video prompts.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LetsDanceGenerator;
