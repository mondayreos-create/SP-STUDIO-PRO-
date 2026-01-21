
import React, { useState, useCallback, useRef, useEffect } from 'react';
import IdeaGenerator from './IdeaGenerator.tsx';
import StoryGenerator from './StoryGenerator.tsx';
import MovieTrailerGenerator from './MovieTrailerGenerator.tsx';
import { 
    generateLyrics, generateScenesFromLyrics, 
    generateCharacters, Character as ServiceCharacter,
    generateSimpleStory, generateVlogScript, VlogScriptResponse,
    generateVideo, generateYouTubeMetadata, YouTubeMetadata, analyzeCharacterReference,
    generateScenesFromStory, VisualScene, generateSongMusicPrompt,
    generateVlogStoryboardBatch, VlogStoryboardScene
} from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import { GoogleGenAI, Type } from "@google/genai";

// --- Icons ---
const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin h-5 w-5 ${className ?? 'mr-3'}`} xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/xl" className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200"
            aria-label="Clear current project"
        >
            <TrashIcon />
            Clear Project
        </button>
    </div>
);

const songStoryStyles = [
    'Disney Style 3D',
    'Pixar Animation',
    'Anime / Studio Ghibli',
    'Watercolor Illustration',
    'Storybook Hand-Drawn',
    'Paper Cutout',
    'Claymation',
    'Low Poly 3D',
    'Cinematic Realistic',
    '3D Cartoon, Cocomelon Style',
    '3D Cartoon, BabyBus Style'
];

interface GeneratedScene {
    number: number;
    text: string;
    prompt: string;
    lyric_segment?: string;
    narrative?: string;
    visual_prompt?: string;
    visual_description?: string;
}

const SongStoryCreator: React.FC = () => {
    const [audience, setAudience] = useState<'kids' | 'adults'>('kids');
    const [activeStep, setActiveStep] = useState<1 | 2>(1);
    const [contentType, setContentType] = useState<'lyrics' | 'story'>('lyrics');
    const [topic, setTopic] = useState('');
    const [characters, setCharacters] = useState<{id: number, name: string, desc: string}[]>([{id: 1, name: '', desc: ''}]);
    
    // New Settings
    const [visualStyle, setVisualStyle] = useState(songStoryStyles[0]);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    
    // Updated Image Features (Array of Images)
    const [useRefImage, setUseRefImage] = useState(false);
    const [refImages, setRefImages] = useState<{base64: string, mimeType: string}[]>([]);
    const [refStyle, setRefStyle] = useState('');
    const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);

    // Duration Settings
    const [duration, setDuration] = useState(2); // Minutes (1-10)

    // Result
    const [generatedTitle, setGeneratedTitle] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [scenes, setScenes] = useState<GeneratedScene[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [sceneCopyStatus, setSceneCopyStatus] = useState<number | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    // YouTube Kit & Music Prompt
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [musicPrompt, setMusicPrompt] = useState('');
    const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);

    // PERSISTENCE LISTENER
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'kids-story-generator') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'kids-story-generator',
                category: 'writing',
                title: "Story Studio",
                data: {
                    audience,
                    contentType,
                    topic,
                    characters,
                    visualStyle,
                    duration,
                    generatedTitle,
                    generatedContent,
                    scenes
                }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'kids-story-generator') return;
            const d = e.detail.data;
            if (d.audience) setAudience(d.audience);
            if (d.contentType) setContentType(d.contentType);
            if (d.topic) setTopic(d.topic);
            if (d.characters) setCharacters(d.characters);
            if (d.visualStyle) setVisualStyle(d.visualStyle);
            if (d.duration) setDuration(d.duration);
            if (d.generatedTitle) setGeneratedTitle(d.generatedTitle);
            if (d.generatedContent) setGeneratedContent(d.generatedContent);
            if (d.scenes) setScenes(d.scenes);
            setError(null);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [audience, contentType, topic, characters, visualStyle, duration, generatedTitle, generatedContent, scenes]);

    const handleCharacterChange = (index: number, field: 'name' | 'desc', value: string) => {
        const newChars = [...characters];
        newChars[index][field] = value;
        setCharacters(newChars);
    };

    const addCharacter = () => {
        setCharacters([...characters, {id: Date.now(), name: '', desc: ''}]);
    };

    const removeCharacter = (index: number) => {
        const newChars = [...characters];
        newChars.splice(index, 1);
        setCharacters(newChars);
    };

    const handleRefImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (refImages.length >= 5) {
                setError("You can upload a maximum of 5 images.");
                return;
            }
            setIsAnalyzingRef(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const newRef = { base64, mimeType: file.type };
                setRefImages(prev => [...prev, newRef]);
                if (refImages.length === 0) {
                    try {
                        const analysis = await analyzeCharacterReference(base64, file.type);
                        setRefStyle(analysis.artStyle);
                        setVisualStyle(analysis.artStyle); 
                    } catch (e) {
                        console.error("Analysis failed", e);
                    }
                }
                setIsAnalyzingRef(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeRefImage = (index: number) => {
        setRefImages(prev => prev.filter((_, i) => i !== index));
        if (refImages.length <= 1) {
            setRefStyle('');
        }
    };

    const handleAutoGenerateCharacters = async () => {
        if (!topic.trim()) {
            setError("Please enter a topic first.");
            return;
        }
        setIsGeneratingCharacters(true);
        setError(null);
        try {
             const currentStyle = useRefImage && refStyle ? refStyle : visualStyle;
             const styleContext = currentStyle.toLowerCase().includes('3d') ? currentStyle : `${currentStyle} (3D Render Style)`;
             let prompt = `Create ${aiCharacterCount} detailed characters for a ${audience} ${contentType} about: "${topic}".
             Visual Style: ${styleContext}.
             IMPORTANT: Describe their appearance as 3D characters (textures, lighting, 3D features).`;
             if (useRefImage && refImages.length > 0) {
                 prompt += ` Based on the style of the uploaded reference image: ${refStyle}.`;
             }
             const chars = await generateCharacters(prompt, aiCharacterCount);
             const mapped = chars.map((c, i) => ({
                 id: Date.now() + i,
                 name: c.name,
                 desc: c.description
             }));
             setCharacters(mapped);
             setActiveStep(2);
        } catch (e) {
            setError("Failed to auto-generate characters.");
        } finally {
            setIsGeneratingCharacters(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Please describe what the song/story should be about.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedTitle('');
        setGeneratedContent('');
        setScenes([]);
        setYoutubeMeta(null);
        setMusicPrompt('');

        try {
            let enforcedStyle = visualStyle;
            if (useRefImage && refStyle) enforcedStyle = refStyle;
            if (useRefImage || !enforcedStyle.toLowerCase().includes('3d')) enforcedStyle = `${enforcedStyle} (3D Render Style)`;
            
            const charDesc = characters.filter(c => c.name).map(c => `${c.name}: ${c.desc}`).join(', ');
            const fullTopic = `${topic} (Story Summary). Audience: ${audience}. Visual Style: ${enforcedStyle}. ${charDesc ? `Characters: ${charDesc}` : ''}`;
            const sceneCount = Math.ceil((duration * 60) / 8);

            if (contentType === 'lyrics') {
                const res = await generateLyrics({
                    topic: fullTopic,
                    style: audience === 'kids' ? 'Nursery Rhyme/Fun' : 'Pop/Ballad',
                    mood: audience === 'kids' ? 'Happy' : 'Emotional'
                });
                setGeneratedTitle(res.songTitle);
                setGeneratedContent(res.songLyrics);
                const lyricScenes = await generateScenesFromLyrics(res.songLyrics, enforcedStyle, sceneCount, `Characters: ${charDesc}. Summary: ${topic}`);
                // COMMENT: Fixed property access by using fields defined in the VisualScene interface.
                setScenes(lyricScenes.map(s => ({ 
                    number: s.scene_number, 
                    text: s.narrative, 
                    prompt: s.visual_prompt, 
                    visual_description: s.visual_description, 
                    lyric_segment: s.lyric_segment 
                })));
            } else {
                const res = await generateSimpleStory({ topic: fullTopic, style: audience === 'kids' ? 'Fairy Tale' : 'Short Story', length: 'Short' });
                setGeneratedTitle(res.storyTitle);
                setGeneratedContent(res.storyContent);
                const storyContext = `Story: ${res.storyContent}\nCharacters: ${charDesc}\nStyle: ${enforcedStyle}\nSummary: ${topic}`;
                const visualScenes = await generateScenesFromStory(storyContext, sceneCount);
                // COMMENT: Fixed property access by using fields defined in the VisualScene interface.
                setScenes(visualScenes.map(s => ({ 
                    number: s.scene_number, 
                    text: s.narrative, 
                    prompt: s.visual_prompt, 
                    narrative: s.narrative, 
                    visual_prompt: s.visual_prompt 
                })));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateYoutubeKit = async () => {
        if (!generatedTitle || !generatedContent) return;
        setIsGeneratingMeta(true);
        try {
            const meta = await generateYouTubeMetadata(generatedTitle, generatedContent.substring(0, 500), contentType === 'lyrics' ? 'Song' : 'Story');
            setYoutubeMeta(meta);
        } catch (e) {
            setError("Failed to generate YouTube Metadata");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleGenerateMusicPrompt = async () => {
         if (!generatedTitle || contentType !== 'lyrics') return;
         setIsGeneratingMusic(true);
         try {
             const prompt = await generateSongMusicPrompt(generatedTitle, audience === 'kids' ? 'Kids Song' : 'Pop');
             setMusicPrompt(prompt);
         } catch (e) {
             setError("Failed to generate music prompt");
         } finally {
             setIsGeneratingMusic(false);
         }
    };

    const handleCopy = () => {
        if (!generatedContent) return;
        const charText = characters.filter(c => c.name).map(c => `• ${c.name}: ${c.desc}`).join('\n');
        const text = `Title: ${generatedTitle}\n\nVisual Style: ${visualStyle}\n\n${charText ? `Character Detail:\n${charText}\n\n` : ''}Content:\n${generatedContent}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopyScene = (scene: GeneratedScene, index: number) => {
        const charText = characters.filter(c => c.name).map(c => `• ${c.name}: ${c.desc}`).join('\n');
        const text = `Character Detail:\n${charText}\n\nStyle Visual Style:\n${useRefImage ? refStyle + ' (3D)' : visualStyle}\n\nScene ${scene.number} Prompt:\n${scene.prompt}`;
        navigator.clipboard.writeText(text);
        setSceneCopyStatus(index);
        setTimeout(() => setSceneCopyStatus(null), 2000);
    };

    const handleClear = () => {
        setTopic('');
        setCharacters([{id: Date.now(), name: '', desc: ''}]);
        setGeneratedTitle('');
        setGeneratedContent('');
        setScenes([]);
        setError(null);
        setActiveStep(1);
        setVisualStyle(songStoryStyles[0]);
        setDuration(2);
        setUseRefImage(false);
        setRefImages([]);
        setYoutubeMeta(null);
        setMusicPrompt('');
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Song & Story Creator</h2>
                    <p className="text-gray-400 text-sm">Create lyrics or short stories for any audience.</p>
                </div>
                <div className="bg-gray-900/50 p-1 rounded-lg flex mb-6 border border-gray-700">
                    <button onClick={() => setAudience('kids')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${audience === 'kids' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>For Kids</button>
                    <button onClick={() => setAudience('adults')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${audience === 'adults' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>For Adults</button>
                </div>
                <div className="flex border-b border-gray-700 mb-6">
                     <button onClick={() => setActiveStep(1)} className={`flex-1 py-2 text-sm font-semibold border-b-2 transition ${activeStep === 1 ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>1. Details</button>
                    <button onClick={() => setActiveStep(2)} className={`flex-1 py-2 text-sm font-semibold border-b-2 transition ${activeStep === 2 ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>2. Characters</button>
                </div>
                {activeStep === 1 && (
                    <div className="space-y-6 animate-fade-in">
                         <div className="bg-gray-900/50 p-1 rounded-lg flex border border-gray-700">
                            <button onClick={() => setContentType('lyrics')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${contentType === 'lyrics' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Song Lyrics</button>
                            <button onClick={() => setContentType('story')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${contentType === 'story' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Short Story</button>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">What should the {contentType === 'lyrics' ? 'song' : 'story'} be about?</label>
                            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={contentType === 'lyrics' ? "e.g., A song about sharing toys..." : "e.g., A magical adventure in a candy forest..."} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-24 resize-none focus:ring-2 focus:ring-cyan-500 outline-none" />
                        </div>
                         <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 mb-4">
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input type="checkbox" checked={useRefImage} onChange={e => setUseRefImage(e.target.checked)} className="w-4 h-4 text-cyan-500 rounded bg-gray-800 border-gray-600 focus:ring-cyan-500" />
                                <span className="font-bold text-cyan-400 text-sm">Use Reference Style Image</span>
                             </label>
                             {useRefImage && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-5 gap-2">
                                        {refImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square bg-gray-800 rounded border border-gray-600 group">
                                                <img src={`data:${img.mimeType};base64,${img.base64}`} alt="Ref" className="w-full h-full object-cover rounded" />
                                                <button onClick={() => removeRefImage(idx)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition text-[10px]">✕</button>
                                            </div>
                                        ))}
                                        {refImages.length < 5 && (
                                            <label className="flex flex-col items-center justify-center aspect-square bg-gray-800 rounded border border-gray-600 cursor-pointer hover:bg-gray-700 transition">
                                                <span className="text-xl text-gray-500">+</span>
                                                <input type="file" accept="image/*" onChange={handleRefImageUpload} className="hidden"/>
                                            </label>
                                        )}
                                    </div>
                                    {refStyle && <p className="text-[10px] text-emerald-400 font-bold italic">Detected Style: {refStyle}</p>}
                                </div>
                             )}
                         </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">Visual Style</label>
                                <select value={visualStyle} onChange={e => setVisualStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-xs outline-none focus:ring-1 focus:ring-cyan-500">
                                    {songStoryStyles.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">Video Duration (Min)</label>
                                <input type="number" min="1" max="10" value={duration} onChange={e => setDuration(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-xs text-center font-bold" />
                            </div>
                        </div>
                        <button onClick={() => setActiveStep(2)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition shadow-lg">Next: Setup Characters</button>
                    </div>
                )}
                {activeStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Character Setup</h3>
                             <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Auto Qty:</span>
                                <input type="number" min="1" max="5" value={aiCharacterCount} onChange={e => setAiCharacterCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} className="w-10 bg-gray-900 border border-gray-600 rounded text-center text-xs text-white" />
                                <button onClick={handleAutoGenerateCharacters} disabled={isGeneratingCharacters || !topic} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded font-bold transition flex items-center gap-1">
                                    {isGeneratingCharacters ? <Spinner className="h-3 w-3 m-0" /> : '✨'} Auto-Gen
                                </button>
                             </div>
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                            {characters.map((char, index) => (
                                <div key={char.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 relative group">
                                    <button onClick={() => removeCharacter(index)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100">✕</button>
                                    <div className="grid grid-cols-1 gap-3">
                                        <input value={char.name} onChange={e => handleCharacterChange(index, 'name', e.target.value)} placeholder="Character Name (e.g., Leo the Lion)" className="bg-gray-800 border-none rounded p-2 text-sm text-white focus:ring-1 focus:ring-cyan-500" />
                                        <textarea value={char.desc} onChange={e => handleCharacterChange(index, 'desc', e.target.value)} placeholder="Describe appearance, clothes, and colors..." className="bg-gray-800 border-none rounded p-2 text-xs text-gray-300 h-20 resize-none focus:ring-1 focus:ring-cyan-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addCharacter} className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 text-xs font-bold">+ Add Manually</button>
                        <div className="flex gap-4">
                            <button onClick={() => setActiveStep(1)} className="flex-1 py-3 bg-gray-700 text-gray-300 font-bold rounded-lg transition border border-gray-600">Back</button>
                            <button onClick={handleGenerate} disabled={isLoading || !topic} className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-lg shadow-xl transition transform active:scale-95 disabled:opacity-50">
                                {isLoading ? <Spinner className="m-auto" /> : 'Create Story Project 🚀'}
                            </button>
                        </div>
                    </div>
                )}
                {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-xl text-center text-xs mt-6">{error}</div>}
            </div>
        </div>
    );
};

export default SongStoryCreator;
