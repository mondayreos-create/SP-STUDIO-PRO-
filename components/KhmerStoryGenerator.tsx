
import React, { useState, useEffect } from 'react';
// COMMENT: Fixed potential name lookup error for 'generateImage' by ensuring named export is used correctly.
import { generateKhmerStory, generateImage, generateVoiceover, generateCharacters, translateStoryContent, PrebuiltVoice, generateVideo } from '../services/geminiService.ts';
import type { KhmerScene, Character } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

// --- Icons ---
const PlayIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </svg>
);

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ImageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
);

const JsonIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const TranslateIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const MotionIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

// --- Audio Utilities ---
const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const pcmToWavBlob = (pcmData: Int16Array, numChannels: number, sampleRate: number, bitsPerSample: number): Blob => {
    const dataSize = pcmData.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

type VoiceGender = 'Male' | 'Female';

const KhmerStoryGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState('3D Pixar Style');
    const [sceneCount, setSceneCount] = useState(5);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [voiceGender, setVoiceGender] = useState<VoiceGender>('Female');
    
    const [story, setStory] = useState<KhmerScene[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedJson, setCopiedJson] = useState(false);
    const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
    const [copiedSceneJsonIndex, setCopiedSceneJsonIndex] = useState<number | null>(null);
    
    // Translation State
    const [targetTranslationLang, setTargetTranslationLang] = useState('Korea');
    const [isTranslating, setIsTranslating] = useState(false);

    // Character generation state
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    const [copiedCharacterIndex, setCopiedCharacterIndex] = useState<number | null>(null);
    
    const [videoModel, setVideoModel] = useState('veo-3.1-fast-generate-preview');

    const [sceneImages, setSceneImages] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});
    const [sceneVideos, setSceneVideos] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});
    const [audioUrls, setAudioUrls] = useState<Record<string, { loading: boolean; url: string | null }>>({});
    
    const stylesList = [
        '3D Pixar Style',
        '3D Cute Cartoon',
        '3D Unreal Engine 5',
        '3D Claymation',
        '3D Low Poly',
        '3D Cinematic Render',
        'Anime', 
        'Disney Style',
        'Studio Ghibli',
        'Cinematic',
        'Watercolor',
        'Oil Painting',
        'Cyberpunk',
        'Fantasy Art',
        'Sci-Fi',
        'Vintage Film',
        'Pixel Art',
        'Photorealistic',
        'Pop Art',
        'Minimalist',
        '2D Vector Art',
        'Paper Cutout',
    ];

    const translationLanguages = [
        'Korea (Korean)', 
        'Japan (Japanese)', 
        'China (Chinese)', 
        'France (French)', 
        'Spain (Spanish)', 
        'Italy (Italian)', 
        'Portugal (Portuguese)', 
        'Russia (Russian)'
    ];

    // PERSISTENCE LISTENERS
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'khmer-story-generator') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'khmer-story-generator',
                category: 'writing',
                title: topic.substring(0, 30) || "KH បង្កើតគ្រោងរឿង",
                data: {
                    topic,
                    style,
                    sceneCount,
                    aspectRatio,
                    voiceGender,
                    story,
                    characters
                }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'khmer-story-generator') return;
            const d = e.detail.data;
            if (d.topic) setTopic(d.topic);
            if (d.style) setStyle(d.style);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.aspectRatio) setAspectRatio(d.aspectRatio);
            if (d.voiceGender) setVoiceGender(d.voiceGender);
            if (d.story) setStory(d.story);
            if (d.characters) setCharacters(d.characters);
            setError(null);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [topic, style, sceneCount, aspectRatio, voiceGender, story, characters]);

    useEffect(() => {
        return () => {
            Object.values(audioUrls).forEach((item: { loading: boolean; url: string | null }) => {
                if (item.url) URL.revokeObjectURL(item.url);
            });
            Object.values(sceneVideos).forEach((item: { loading: boolean; url: string | null; error: string | null }) => {
                if (item.url) URL.revokeObjectURL(item.url);
            });
        };
    }, [audioUrls, sceneVideos]);

    // Helper function to construct full prompt
    const getFullPrompt = (sceneVisual: string) => {
        const charDetails = characters.length > 0 
            ? characters.map(c => `Name: ${c.name}, ${c.gender}, ${c.age}, ${c.description}`).join(' | ')
            : 'No specific characters defined.';
        
        // Ensure "3D" is mentioned if the style suggests it
        const stylePrompt = style.includes('3D') ? style : `${style}, 3D Style`;

        // Strictly follow the requested line format
        return `Character Detail: ${charDetails}
Style: ${stylePrompt}
Scene: ${sceneVisual}

Constraint: Please keep the characters’ faces and characteristics exactly the same in every scene. Do NOT change the characters’ faces or introduce new places. Please maintain everything exactly the same from Scene 1 all the way to Scene 100 — keep the characters’ faces and characteristics consistent in every scene.`;
    };

    const handleAutoGenerateCharacters = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic first to generate characters.');
            return;
        }
        setIsGeneratingCharacters(true);
        setError(null);
        try {
            const promptWithStyle = `${topic}. Visual Style: ${style} (Ensure 3D style theme). Create detailed character descriptions suitable for 3D animation.`;
            const chars = await generateCharacters(promptWithStyle, aiCharacterCount);
            setCharacters(chars);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to auto-generate characters.');
        } finally {
            setIsGeneratingCharacters(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setStory(null);
        setSceneImages({});
        setAudioUrls({});
        setSceneVideos({});

        try {
            // Include summary request in topic context and FORCE 3D style
            const styleContext = style.includes('3D') ? style : `${style} 3D`;
            const context = `${topic}. (Include a short summary of the story). Style: ${styleContext}.`;
            const result = await generateKhmerStory(context, styleContext, sceneCount, characters);
            setStory(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate story.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslateAllScenes = async () => {
        if (!story || story.length === 0) {
            setError('No story to translate. Please generate a story first.');
            return;
        }
        setIsTranslating(true);
        setError(null);
        try {
            const translatedScenes = await translateStoryContent(story, targetTranslationLang);
            setStory(translatedScenes);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to translate story.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleGenerateImage = async (sceneNumber: number, prompt: string) => {
        setSceneImages(prev => ({ ...prev, [sceneNumber]: { loading: true, url: null, error: null } }));
        try {
            const fullPrompt = getFullPrompt(prompt);
            const imageUrl = await generateImage(fullPrompt, aspectRatio);
            setSceneImages(prev => ({ ...prev, [sceneNumber]: { loading: false, url: imageUrl, error: null } }));
        } catch (err) {
            setSceneImages(prev => ({ ...prev, [sceneNumber]: { loading: false, url: null, error: 'Image generation failed.' } }));
        }
    };

    const handleGenerateMotion = async (sceneNumber: number, imageUrl: string, prompt: string) => {
        if (!imageUrl) return;
        
        setSceneVideos(prev => ({ ...prev, [sceneNumber]: { loading: true, url: null, error: null } }));
        try {
            const [header, base64Data] = imageUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            
            // Map aspect ratio for video generation (Veo only supports specific ones)
            let videoRatio = '16:9';
            if (aspectRatio === '9:16' || aspectRatio === '3:4') videoRatio = '9:16';
            
            const fullPrompt = getFullPrompt(prompt);

            const blob = await generateVideo({
                model: videoModel,
                prompt: fullPrompt,
                image: { base64: base64Data, mimeType },
                aspectRatio: videoRatio as '16:9' | '9:16',
                resolution: '720p'
            });
            
            const videoUrl = URL.createObjectURL(blob);
            setSceneVideos(prev => ({ ...prev, [sceneNumber]: { loading: false, url: videoUrl, error: null } }));
        } catch (err) {
            setSceneVideos(prev => ({ ...prev, [sceneNumber]: { loading: false, url: null, error: err instanceof Error ? err.message : 'Motion generation failed.' } }));
        }
    };

    const handlePlayAudio = async (sceneNumber: number, dialogIndex: number, text: string) => {
        const key = `${sceneNumber}-${dialogIndex}`;
        
        // Force regeneration if user clicks play to handle potential gender switch
        if (audioUrls[key]?.url) {
             URL.revokeObjectURL(audioUrls[key].url!);
        }

        setAudioUrls(prev => ({ ...prev, [key]: { loading: true, url: null } }));

        try {
            const selectedVoice: PrebuiltVoice = voiceGender === 'Male' ? 'Kore' : 'Zephyr';
            const base64Audio = await generateVoiceover(text, 'Khmer', selectedVoice); 
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            
            setAudioUrls(prev => ({ ...prev, [key]: { loading: false, url } }));
            
            const audio = new Audio(url);
            audio.play();
        } catch (err) {
            console.error(err);
            setAudioUrls(prev => ({ ...prev, [key]: { loading: false, url: null } }));
        }
    };

    const handleCopyJson = () => {
        if (story) {
            navigator.clipboard.writeText(JSON.stringify(story, null, 2));
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        }
    };

    const handleCopySceneJson = (scene: KhmerScene, index: number) => {
        navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
        setCopiedSceneJsonIndex(index);
        setTimeout(() => setCopiedSceneJsonIndex(null), 2000);
    };

    const handleCopyPrompt = (text: string, index: number) => {
        const fullPrompt = getFullPrompt(text);
        navigator.clipboard.writeText(fullPrompt);
        setCopiedPromptIndex(index);
        setTimeout(() => setCopiedPromptIndex(null), 2000);
    };

    const handleCopyCharacter = (char: Character, index: number) => {
        const charText = `Name: ${char.name}\nGender: ${char.gender}\nAge: ${char.age}\nDescription: ${char.description}`;
        navigator.clipboard.writeText(charText);
        setCopiedCharacterIndex(index);
        setTimeout(() => setCopiedCharacterIndex(null), 2000);
    };

    const handleClear = () => {
        setTopic('');
        setStory(null);
        setError(null);
        setSceneImages({});
        setSceneVideos({});
        setAudioUrls({});
        setSceneCount(5);
        setCharacters([]);
        setAiCharacterCount(2);
        setAspectRatio('16:9');
    }

    const handleSceneCountChange = (val: number) => {
        setSceneCount(Math.max(1, Math.min(20, val)));
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4">
            <ClearProjectButton onClick={handleClear} />
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{t('ksg_title')}</h2>
                    <p className="text-gray-400 mt-1">{t('ksg_desc')}</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">{t('ksg_topic')}</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t('ksg_topic_placeholder')}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                </div>

                {/* Character Generation Section */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎭</span>
                            <label className="font-semibold text-gray-200">{t('ksg_characters')}</label>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-gray-800 p-1.5 rounded-lg border border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 px-2 border-r border-gray-600">
                                <span className="text-xs text-gray-400 font-medium">{t('ksg_qty')}</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="5" 
                                    value={aiCharacterCount}
                                    onChange={(e) => setAiCharacterCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                                    className="w-10 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-center text-white text-sm focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <button 
                                onClick={handleAutoGenerateCharacters} 
                                disabled={isGeneratingCharacters || !topic.trim()}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded hover:from-teal-600 hover:to-cyan-700 transition disabled:opacity-50"
                            >
                                {isGeneratingCharacters ? <Spinner className="h-3 w-3" /> : <SparklesIcon />}
                                {t('ksg_auto_gen')}
                            </button>
                        </div>
                    </div>
                    
                    {characters.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {characters.map((c, idx) => (
                                <div key={idx} className="bg-gray-800 p-3 rounded border border-gray-700 relative group hover:border-cyan-500/50 transition-colors">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                            onClick={() => handleCopyCharacter(c, idx)} 
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded shadow-sm"
                                            title="Copy Character Details"
                                        >
                                            {copiedCharacterIndex === idx ? <span className="text-xs text-green-400 font-bold px-1">Copied!</span> : <CopyIcon className="h-3 w-3" />}
                                        </button>
                                        <button 
                                            onClick={() => setCharacters(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1.5 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded shadow-sm"
                                            title="Remove Character"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1 pr-16">
                                        <div className="font-bold text-cyan-400 text-sm">{c.name}</div>
                                        <div className="text-xs text-gray-500">{c.gender} • {c.age}</div>
                                        <div className="text-gray-300 text-xs leading-relaxed mt-1 line-clamp-2 group-hover:line-clamp-none transition-all">{c.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/20">
                            <p>No characters defined yet.</p>
                            <p className="text-xs mt-1 opacity-70">Click "Auto-generate" to create characters based on your topic.</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">{t('ksg_style')}</label>
                        <select 
                            value={style} 
                            onChange={(e) => setStyle(e.target.value)} 
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 outline-none appearance-none"
                        >
                            {stylesList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Voice Gender</label>
                        <div className="flex bg-gray-700 rounded-lg border border-gray-600 p-1">
                            <button
                                onClick={() => setVoiceGender('Male')}
                                className={`flex-1 py-2 text-xs font-bold rounded transition ${voiceGender === 'Male' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Male
                            </button>
                            <button
                                onClick={() => setVoiceGender('Female')}
                                className={`flex-1 py-2 text-xs font-bold rounded transition ${voiceGender === 'Female' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Female
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">{t('ksg_scenes')}</label>
                        <div className="flex items-center bg-gray-700 rounded-lg border border-gray-600 overflow-hidden w-full">
                            <button 
                                onClick={() => handleSceneCountChange(sceneCount - 1)}
                                className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white transition border-r border-gray-500 font-bold"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={sceneCount}
                                onChange={(e) => handleSceneCountChange(parseInt(e.target.value) || 1)}
                                className="w-full bg-transparent text-white text-center p-2 outline-none appearance-none font-mono font-bold text-lg"
                                style={{MozAppearance: 'textfield'}}
                            />
                            <button 
                                onClick={() => handleSceneCountChange(sceneCount + 1)}
                                className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white transition border-l border-gray-500 font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* New Prominent Aspect Ratio Selector */}
                <div className="mt-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
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
                                onClick={() => setAspectRatio(ratio.value)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all border flex items-center gap-2 ${aspectRatio === ratio.value ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg scale-105' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                            >
                                <span>{ratio.icon}</span> {ratio.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !topic.trim()}
                    className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all active:scale-95 disabled:opacity-50"
                >
                    {isLoading ? <><Spinner /> {t('ksg_btn_generating')}</> : t('ksg_btn_generate')}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    {error}
                </div>
            )}

            {story && (
                <div className="mt-8 space-y-8">
                    {/* Control Bar for Translation & Copy */}
                    <div className="bg-gray-800/90 p-4 rounded-lg border border-gray-700 backdrop-blur-sm sticky top-0 z-10 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-200 text-lg">{t('ksg_story_results')}</h3>
                            <span className="text-gray-500 text-sm hidden sm:inline">|</span>
                            <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                                <select 
                                    value={targetTranslationLang} 
                                    onChange={(e) => setTargetTranslationLang(e.target.value)}
                                    className="bg-gray-900 text-white text-sm p-1.5 rounded outline-none border-none cursor-pointer hover:bg-gray-800 transition"
                                >
                                    {translationLanguages.map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleTranslateAllScenes} 
                                    disabled={isTranslating}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition shadow-sm disabled:opacity-50"
                                    title="Translate prompts and dialogues for all scenes"
                                >
                                    {isTranslating ? <Spinner className="h-3 w-3" /> : <TranslateIcon />}
                                    {isTranslating ? t('ksg_translating') : t('ksg_auto_translate')}
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handleCopyJson} 
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition shadow-md w-full md:w-auto justify-center"
                        >
                            <JsonIcon className="h-4 w-4" />
                            {copiedJson ? 'Copied!' : t('ksg_copy_json')}
                        </button>
                    </div>
                    
                    {story.map((scene, index) => (
                        <div key={scene.sceneNumber} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-lg">
                            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center flex-wrap gap-2">
                                <h3 className="font-bold text-cyan-400 text-lg">{t('ksg_scene')} {scene.sceneNumber}</h3>
                                <div className="flex gap-2 flex-wrap">
                                    <button 
                                        onClick={() => handleCopySceneJson(scene, index)} 
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition text-gray-300"
                                        title="Copy Scene JSON"
                                    >
                                        {copiedSceneJsonIndex === index ? <span className="text-cyan-400 font-bold">Copied!</span> : <><JsonIcon className="h-3 w-3" /> JSON</>}
                                    </button>
                                    <button 
                                        onClick={() => handleCopyPrompt(getFullPrompt(scene.visualPrompt), index)} 
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition text-gray-300"
                                    >
                                        {copiedPromptIndex === index ? <span className="text-green-400 font-bold">Copied!</span> : <><CopyIcon className="h-3 w-3" /> {t('ksg_prompt')}</>}
                                    </button>
                                    <button
                                        onClick={() => handleGenerateImage(scene.sceneNumber, scene.visualPrompt)}
                                        disabled={sceneImages[scene.sceneNumber]?.loading}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded transition text-white shadow-sm disabled:opacity-50"
                                    >
                                        {sceneImages[scene.sceneNumber]?.loading ? <Spinner className="h-3 w-3" /> : <ImageIcon />}
                                        {t('ksg_gen_image')}
                                    </button>
                                    {sceneImages[scene.sceneNumber]?.url && (
                                        <a
                                            href={sceneImages[scene.sceneNumber].url!}
                                            download={`Scene_${scene.sceneNumber}.png`}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded transition text-white shadow-sm"
                                        >
                                            <DownloadIcon className="h-3 w-3" />
                                            {t('ksg_download')}
                                        </a>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                {/* Image Section */}
                                <div className="bg-black flex flex-col items-center justify-center min-h-[300px] border-b lg:border-b-0 lg:border-r border-gray-700 relative group">
                                    {sceneVideos[scene.sceneNumber]?.url ? (
                                        <div className="relative w-full h-full">
                                            <video 
                                                src={sceneVideos[scene.sceneNumber].url!} 
                                                controls 
                                                autoPlay 
                                                loop 
                                                className="w-full h-full object-contain max-h-[500px]" 
                                            />
                                            <a 
                                                href={sceneVideos[scene.sceneNumber].url!} 
                                                download={`Scene_${scene.sceneNumber}_Motion.mp4`}
                                                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full transition hover:bg-black/80"
                                                title="Download Motion Video"
                                            >
                                                <DownloadIcon className="h-5 w-5" />
                                            </a>
                                        </div>
                                    ) : sceneImages[scene.sceneNumber]?.url ? (
                                        <>
                                            <img src={sceneImages[scene.sceneNumber].url!} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover max-h-[500px]" />
                                            
                                            {/* Overlay Buttons */}
                                            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleGenerateMotion(scene.sceneNumber, sceneImages[scene.sceneNumber].url!, scene.visualPrompt)}
                                                    disabled={sceneVideos[scene.sceneNumber]?.loading}
                                                    className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg transition disabled:opacity-50"
                                                    title="Generate Motion (Video)"
                                                >
                                                    {sceneVideos[scene.sceneNumber]?.loading ? <Spinner className="h-5 w-5 m-0" /> : <MotionIcon className="h-5 w-5" />}
                                                </button>
                                                <a 
                                                    href={sceneImages[scene.sceneNumber].url!} 
                                                    download={`Scene_${scene.sceneNumber}.png`}
                                                    className="p-2 bg-black/60 text-white rounded-full transition hover:bg-black/80 shadow-lg"
                                                    title="Download Image"
                                                >
                                                    <DownloadIcon className="h-5 w-5" />
                                                </a>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-gray-500 text-sm p-6 text-center">
                                            <div className="mb-3 opacity-50"><ImageIcon /></div>
                                            <p className="mb-2 font-semibold">Visual Prompt (Displayed below):</p>
                                            <p className="italic text-xs leading-relaxed text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-800">
                                                {getFullPrompt(scene.visualPrompt)}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {sceneImages[scene.sceneNumber]?.loading && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                                            <Spinner className="h-8 w-8 text-cyan-400 mb-2"/>
                                            <span className="text-xs text-gray-400 animate-pulse">Generating Image...</span>
                                        </div>
                                    )}
                                    {sceneVideos[scene.sceneNumber]?.loading && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                                            <Spinner className="h-8 w-8 text-purple-400 mb-2"/>
                                            <span className="text-xs text-gray-400 animate-pulse">Generating Motion...</span>
                                        </div>
                                    )}
                                    {sceneImages[scene.sceneNumber]?.error && (
                                        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80">
                                            <p className="text-red-400 text-sm text-center">{sceneImages[scene.sceneNumber].error}</p>
                                        </div>
                                    )}
                                    {sceneVideos[scene.sceneNumber]?.error && (
                                        <div className="absolute top-0 left-0 right-0 p-2 bg-red-900/80 text-white text-xs text-center">
                                            Motion failed: {sceneVideos[scene.sceneNumber].error}
                                        </div>
                                    )}
                                </div>

                                {/* Dialogue Section */}
                                <div className="p-4 space-y-3 bg-gray-800/30 max-h-[500px] overflow-y-auto">
                                    {scene.dialogues.map((dialog, idx) => {
                                        const audioKey = `${scene.sceneNumber}-${idx}`;
                                        const isAudioLoading = audioUrls[audioKey]?.loading;
                                        const hasAudio = !!audioUrls[audioKey]?.url;
                                        
                                        return (
                                            <div key={idx} className="flex gap-3 items-start group hover:bg-gray-800/50 p-2 rounded-lg transition">
                                                <div className="flex-grow relative">
                                                    <span className="text-xs font-bold text-purple-400 block mb-1 uppercase tracking-wide">{dialog.character}</span>
                                                    <p className="text-gray-200 text-base font-serif leading-relaxed">{dialog.text}</p>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => handlePlayAudio(scene.sceneNumber, idx, dialog.text)}
                                                        disabled={isAudioLoading}
                                                        className="p-2 rounded-full bg-cyan-900/30 text-cyan-400 hover:bg-cyan-600 hover:text-white transition disabled:opacity-50 border border-cyan-900/50 hover:border-cyan-500"
                                                        title="Play Audio"
                                                    >
                                                        {isAudioLoading ? <Spinner className="h-4 w-4 m-0" /> : <PlayIcon />}
                                                    </button>
                                                    {hasAudio && (
                                                        <a
                                                            href={audioUrls[audioKey].url!}
                                                            download={`Scene_${scene.sceneNumber}_Voice_${idx+1}.wav`}
                                                            className="p-2 rounded-full bg-emerald-900/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition border border-emerald-900/50 hover:border-emerald-500 text-center flex items-center justify-center"
                                                            title="Download Voice"
                                                        >
                                                            <DownloadIcon className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {scene.dialogues.length === 0 && (
                                        <p className="text-gray-500 text-sm italic text-center py-10">No dialogue in this scene.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KhmerStoryGenerator;
