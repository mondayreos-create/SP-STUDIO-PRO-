
import React, { useState, useCallback, useEffect } from 'react';
import { generateStory, StoryScene, generateStoryIdeas, StoryIdea, Character as ServiceCharacter, generateCharacters } from '../services/geminiService.ts';
import StoryPanel from './StoryPanel.tsx';
import StyleSelector from './StyleSelector.tsx';
import { styles } from './styles.ts';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200"
            aria-label="Clear current project"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Start Over
        </button>
    </div>
);

const styleCategories = [
    { key: '4d', label: '4D Video', icon: '📹' },
    { key: '3d', label: '3D Style', icon: '🧊' },
    { key: 'anime', label: 'Anime', icon: '🎨' },
    { key: 'fantasy', label: 'Fantasy', icon: '✨' },
    { key: '2d', label: '2D Style', icon: '🖼️' },
    { key: 'roblox', label: 'Roblox', icon: '🎮' },
    { key: 'stickman', label: 'Stickman', icon: '🖊️' },
];

interface ExtendedCharacter extends ServiceCharacter {
    id: number;
    isEditing?: boolean;
}

const StoryGenerator: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isDirectMode, setIsDirectMode] = useState(false);
    const [satoriInput, setSatoriInput] = useState('');
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<StoryIdea | null>(null);

    const [activeStyleCategory, setActiveStyleCategory] = useState<string>('4d');
    const [style, setStyle] = useState<string>(styles.find(s => s.category === '4d')?.value || '');
    
    const [startScene, setStartScene] = useState(1);
    const [endScene, setEndScene] = useState(15);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');
    
    const [characters, setCharacters] = useState<ExtendedCharacter[]>([]);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    const [isAnimalCharacters, setIsAnimalCharacters] = useState(false);
    
    const [story, setStory] = useState<StoryScene[] | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isFastMode, setIsFastMode] = useState(true);

    useEffect(() => {
        const handleLoad = (e: any) => {
            const project = e.detail;
            if (project.tool === 'story-generator' && project.data) {
                const data = project.data;
                setIsDirectMode(data.isDirectMode || false);
                setSatoriInput(data.satoriInput || '');
                setStoryIdeas(data.storyIdeas || []);
                setSelectedIdea(data.selectedIdea || null);
                setStyle(data.style || '');
                if (data.startScene) setStartScene(data.startScene);
                if (data.endScene) setEndScene(data.endScene);
                if (data.selectedAspectRatio) setSelectedAspectRatio(data.selectedAspectRatio);
                setIsFastMode(data.isFastMode ?? true);
                if (data.characters) {
                     setCharacters(data.characters.map((c: any) => ({...c, id: c.id || Date.now() + Math.random()})));
                }
                setStory(data.story || null);
                if (data.story) setStep(3);
                else if (data.characters && data.characters.length > 0) setStep(2);
                else setStep(1);
            }
        };
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => window.removeEventListener('LOAD_PROJECT', handleLoad);
    }, []);

    const saveToHistory = (generatedStory: StoryScene[]) => {
        const newItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            category: 'writing',
            tool: 'story-generator',
            title: selectedIdea?.title || satoriInput.substring(0, 30) || 'Untitled Story',
            data: {
                step,
                isDirectMode,
                satoriInput,
                storyIdeas,
                selectedIdea,
                style,
                startScene,
                endScene,
                selectedAspectRatio,
                characters,
                story: generatedStory,
                isFastMode,
                isAnimalCharacters
            }
        };
        const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
        localStorage.setItem('global_project_history', JSON.stringify([newItem, ...history]));
        window.dispatchEvent(new Event('HISTORY_UPDATED'));
    };

    const handleGenerateIdeas = useCallback(async () => {
        if (!satoriInput.trim()) {
            setError('Please enter your Satori (Context/Topic).');
            return;
        }
        setIsLoading(true);
        setError(null);
        setStoryIdeas([]);
        try {
            const ideas = await generateStoryIdeas(satoriInput, !isFastMode); 
            setStoryIdeas(ideas);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate ideas.');
        } finally {
            setIsLoading(false);
        }
    }, [satoriInput, isFastMode]);

    const handleSelectIdea = (idea: StoryIdea) => {
        setSelectedIdea(idea);
        setStep(2);
    };

    const handleAutoGenerateCharacters = async () => {
        if (!selectedIdea && !satoriInput.trim()) {
            setError('Please provide a story idea first.');
            return;
        }
        setIsGeneratingChars(true);
        setError(null);
        try {
            const context = selectedIdea ? `${selectedIdea.title}: ${selectedIdea.summary}` : satoriInput;
            const extra = isAnimalCharacters ? "CRITICAL: Characters must be anthropomorphic animals matching the visual style." : "Characters must match the visual style.";
            // COMMENT: Fixed generateCharacters call to match implemented service function signature.
            const generated = await generateCharacters(context, aiCharacterCount, extra, !isFastMode);
            setCharacters(generated.map((c, i) => ({ ...c, id: Date.now() + i, isEditing: false })));
        } catch (err) {
            setError('Failed to auto-generate characters.');
        } finally {
            setIsGeneratingChars(false);
        }
    };

    const updateCharacter = (id: number, field: keyof ExtendedCharacter, value: any) => {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleAddCharacter = () => {
        setCharacters(prev => [...prev, { id: Date.now(), name: '', gender: 'Male', age: '', description: '', isEditing: false }]);
    };

    const handleRemoveCharacter = (id: number) => {
        setCharacters(prev => prev.filter(c => c.id !== id));
    };

    const handleCreateStory = useCallback(async () => {
        if (!selectedIdea && !isDirectMode) {
            setError('Missing story idea.');
            return;
        }

        setIsLoading(true);
        setProgress(0);
        setError(null);
        setStory(null);

        const finalCharacters: ServiceCharacter[] = characters
            .filter(c => c.name.trim())
            .map(({ id, isEditing, ...rest }) => rest);

        try {
            const BATCH_SIZE = isFastMode ? 20 : 10;
            const totalScenesNeeded = endScene - startScene + 1;
            const batches = Math.ceil(totalScenesNeeded / BATCH_SIZE);
            let allScenes: StoryScene[] = [];
            
            const synopsis = selectedIdea?.summary || satoriInput;
            const styleConstraint = `${style}. Strict consistency applied. Ratio: ${selectedAspectRatio}.`;

            for (let i = 0; i < batches; i++) {
                const currentBatchStart = startScene + (i * BATCH_SIZE);
                const currentBatchEnd = Math.min(endScene, currentBatchStart + BATCH_SIZE - 1);
                const currentBatchCount = currentBatchEnd - currentBatchStart + 1;
                
                let contextPrompt = `OVERALL STORY SUMMARY: ${synopsis}\nSTYLE: ${styleConstraint}\nGENERATE RANGE: Scene ${currentBatchStart} to ${currentBatchEnd}.`;
                
                if (i > 0) {
                    const lastScene = allScenes[allScenes.length - 1];
                    contextPrompt += `\nLAST SCENE (CONTEXT): ${lastScene.scene_description.line}`;
                }

                const batchScenes = await generateStory({
                    topic: contextPrompt,
                    style: styleConstraint,
                    sceneCount: currentBatchCount,
                    characters: finalCharacters,
                    smartThinking: !isFastMode 
                });

                const correctedBatch = batchScenes.map((s, idx) => ({ ...s, scene_number: currentBatchStart + idx }));
                allScenes = [...allScenes, ...correctedBatch];
                setStory([...allScenes]);
                setProgress(Math.round(((i + 1) / batches) * 100));
            }

            setStep(3);
            saveToHistory(allScenes);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Story generation failed.');
        } finally {
            setIsLoading(false);
            setProgress(0);
        }
    }, [selectedIdea, satoriInput, style, startScene, endScene, characters, isFastMode, isDirectMode, selectedAspectRatio]);

    const handleClear = () => {
        setStep(1);
        setSatoriInput('');
        setStoryIdeas([]);
        setSelectedIdea(null);
        setCharacters([]);
        setStory(null);
        setError(null);
        setStartScene(1);
        setEndScene(15);
        setProgress(0);
        setSelectedAspectRatio('16:9');
    };

    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col">
             <ClearProjectButton onClick={handleClear} />
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-fit space-y-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-xl font-bold text-white">Step 1: Get Story Idea</h2>
                            <label className="flex items-center gap-2 cursor-pointer bg-gray-900 p-3 rounded-lg border border-gray-600 hover:border-cyan-500 transition">
                                <input type="checkbox" checked={isDirectMode} onChange={(e) => setIsDirectMode(e.target.checked)} className="w-5 h-5" />
                                <span className="text-sm font-semibold text-gray-300">Paste Full Story (Direct Mode)</span>
                            </label>
                            {isDirectMode ? (
                                <div className="space-y-4">
                                    <textarea value={satoriInput} onChange={(e) => setSatoriInput(e.target.value)} placeholder="Paste full story content here..." className={`${inputFieldClasses} h-40 resize-y`} />
                                    <button onClick={() => setStep(2)} disabled={!satoriInput.trim()} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg transition">Next: Setup Cast</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <textarea value={satoriInput} onChange={(e) => setSatoriInput(e.target.value)} placeholder="e.g. A space robot finds a cat..." className={`${inputFieldClasses} h-32 resize-none`} />
                                    <button onClick={handleGenerateIdeas} disabled={isLoading || !satoriInput.trim()} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg transition">💡 Get Idea Story</button>
                                    {storyIdeas.map((idea, idx) => (
                                        <div key={idx} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                            <h4 className="font-bold text-white mb-1">{idea.title}</h4>
                                            <p className="text-xs text-gray-400 mb-3">{idea.summary}</p>
                                            <button onClick={() => handleSelectIdea(idea)} className="w-full py-2 bg-gray-800 text-white text-xs font-bold rounded border border-gray-600 transition">Use This Idea</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-bold text-white">Step 2: Cast & Style Settings</h2>
                            
                            {/* Visual Style Selection */}
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">🎨 Visual Style Studio</h3>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {styleCategories.map(cat => (
                                        <button
                                            key={cat.key}
                                            onClick={() => {
                                                setActiveStyleCategory(cat.key);
                                                const firstStyle = styles.find(s => s.category === cat.key);
                                                if (firstStyle) setStyle(firstStyle.value);
                                            }}
                                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all border ${activeStyleCategory === cat.key ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                        >
                                            <span>{cat.icon}</span> {cat.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {styles.filter(s => s.category === activeStyleCategory).map(s => (
                                        <button
                                            key={s.name}
                                            onClick={() => setStyle(s.value)}
                                            className={`p-2 rounded-lg border text-[10px] font-bold transition-all text-left truncate ${style === s.value ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                                            title={s.name}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase">🎭 Setup Characters</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Count:</span>
                                        <input type="number" value={aiCharacterCount} onChange={e => setAiCharacterCount(parseInt(e.target.value) || 1)} className="w-12 bg-gray-800 border border-gray-600 text-white text-center text-xs rounded" />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleAutoGenerateCharacters}
                                    disabled={isGeneratingChars}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    {isGeneratingChars ? <Spinner /> : '✨ Auto-Generate 🎭 Characters'}
                                </button>
                                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                    {characters.map((char, index) => (
                                        <div key={char.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 relative">
                                            <button onClick={() => handleRemoveCharacter(char.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition"><TrashIcon /></button>
                                            <div className="flex gap-2 mb-2">
                                                <input value={char.name} onChange={e => updateCharacter(char.id, 'name', e.target.value)} placeholder="Name" className="bg-gray-900 border-none rounded p-1 text-xs text-white w-1/2" />
                                                <input value={char.gender} onChange={e => updateCharacter(char.id, 'gender', e.target.value)} placeholder="Gender" className="bg-gray-900 border-none rounded p-1 text-xs text-gray-400 w-1/4" />
                                                <input value={char.age} onChange={e => updateCharacter(char.id, 'age', e.target.value)} placeholder="Age" className="bg-gray-900 border-none rounded p-1 text-xs text-gray-400 w-1/4" />
                                            </div>
                                            <textarea value={char.description} onChange={e => updateCharacter(char.id, 'description', e.target.value)} placeholder="Visual traits..." className="bg-gray-900 border-none rounded p-1 text-xs text-gray-300 w-full resize-none h-12" />
                                        </div>
                                    ))}
                                    <button onClick={handleAddCharacter} className="w-full py-2 bg-gray-700 text-gray-300 rounded border border-gray-600 text-xs">+ Add Manually</button>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                                <h3 className="text-sm font-bold text-cyan-400 uppercase">🎬 Scene Range</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Start Scene</label>
                                        <input type="number" value={startScene} onChange={(e) => setStartScene(Math.max(1, parseInt(e.target.value) || 1))} className={inputFieldClasses} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">End Scene</label>
                                        <input type="number" value={endScene} onChange={(e) => setEndScene(Math.max(startScene, parseInt(e.target.value) || 1))} className={inputFieldClasses} />
                                    </div>
                                </div>
                            </div>

                            {/* Aspect Ratio Selector */}
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                                <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                    📐 ទំហំរូបភាព (Aspect Ratio)
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: '16:9 (Landscape)', value: '16:9', icon: '📺' },
                                        { label: '9:16 (Portrait)', value: '9:16', icon: '📱' },
                                        { label: '1:1 (Square)', value: '1:1', icon: '🔳' },
                                        { label: '4:3 (Classic)', value: '4:3', icon: '🖼️' },
                                        { label: '3:4 (Tall)', value: '3:4', icon: '📏' }
                                    ].map((ratio) => (
                                        <button
                                            key={ratio.value}
                                            onClick={() => setSelectedAspectRatio(ratio.value)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all border flex items-center gap-2 ${selectedAspectRatio === ratio.value ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg scale-105' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <span>{ratio.icon}</span> {ratio.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleCreateStory} disabled={isLoading || characters.length === 0} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black rounded-xl transition shadow-xl uppercase tracking-widest">
                                {isLoading ? `Rendering (${progress}%)...` : '📝 Create Animation Production'}
                            </button>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="animate-fade-in text-center space-y-4">
                            <div className="text-green-400 text-4xl">✅</div>
                            <h2 className="text-xl font-bold text-white">Project Complete!</h2>
                            <p className="text-gray-400 text-sm">Consistent scenes 1 to {endScene} have been produced.</p>
                            <button onClick={() => setStep(2)} className="px-6 py-2 bg-gray-700 text-white rounded-lg transition w-full">Edit Project Settings</button>
                            <button onClick={handleClear} className="px-6 py-2 bg-gray-800 text-red-400 rounded-lg transition w-full">Start New Project</button>
                        </div>
                    )}
                </div>
                <div className="w-full">
                    <StoryPanel story={story} isLoading={isLoading} style={style} characters={characters} progress={progress} />
                </div>
             </div>
        </div>
    );
};

export default StoryGenerator;
