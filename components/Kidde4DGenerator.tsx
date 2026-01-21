
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    analyzeCharacterReference, 
    generateImage, 
    generateYouTubeMetadata,
    ImageReference, 
    CharacterAnalysis,
    YouTubeMetadata,
    generateCharacters,
    generateVoiceover,
} from '../services/geminiService.ts';
import { GoogleGenAI, Type } from "@google/genai";
import { useLanguage } from './LanguageContext.tsx';

interface GeneratedScene {
    sceneNumber: number;
    description: string;
    imageUrl?: string;
    isLoading: boolean;
    promptUsed?: string;
    voiceover?: string;
    character_detail?: string;
    asmrType?: string;
}

const asmrLibrary: Record<string, string> = {
    nature: 'https://assets.mixkit.co/active_storage/sfx/10/10-preview.mp3',
    water: 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3',
    steps: 'https://assets.mixkit.co/active_storage/sfx/29/29-preview.mp3',
    toys: 'https://assets.mixkit.co/active_storage/sfx/2555/2555-preview.mp3',
    magic: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
};

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
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

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const AudioIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const SoundIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5 5 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v11.88a.75.75 0 01-1.28.53l-4.72-4.72H4.5a.75.75 0 01-.75-.75V9a.75.75 0 01.75-.75h2.25z" />
    </svg>
);

const loadingMessages = [
    "Preparing the playground...",
    "Coloring with 4D crayola...",
    "Setting up the toybox...",
    "Animating JJ and friends...",
    "Polishing baby shark...",
    "Baking 3D muffins...",
    "Lighting the nursery...",
    "Finalizing baby steps..."
];

const RenderLoadingOverlay: React.FC<{ progress: number; messageIndex: number }> = ({ progress, messageIndex }) => (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10 animate-fade-in p-4 text-center">
        <div className="relative mb-4">
            <div className="w-12 h-12 border-4 border-pink-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-pink-500 rounded-full animate-spin"></div>
        </div>
        <h4 className="text-white font-bold text-[10px] mb-2 animate-pulse uppercase tracking-widest">{loadingMessages[messageIndex]}</h4>
        <div className="w-full max-w-[100px] bg-gray-800 rounded-full h-1 mb-1 overflow-hidden border border-gray-700">
            <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-[8px] font-black text-pink-500 uppercase tracking-widest">{Math.round(progress)}% Complete</span>
    </div>
);

// --- Audio Utilities ---
const audioDecode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const pcmToWav = (pcmData: Int16Array, numChannels: number, sampleRate: number, bitsPerSample: number): Blob => {
    const dataSize = pcmData.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    view.setUint32(0, 0x52494646, false); 
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};

const kiddePresets = [
    { title: "The Colors Song (with Popsicles) | CoComelon Songs", synopsis: "A cheerful learning video where JJ and his friends discover colors through giant melting popsicles and colorful 3D objects in a sunny backyard." },
    { title: "Wheels on the Bus Adventure | City Sightseeing 3D", synopsis: "The bright yellow school bus goes all through the town. Characters wave from the windows as the bus passes by a park, a library, and a library." },
    { title: "Old MacDonald's 4D Farm | Animal Sounds for Kids", synopsis: "A visit to a high-detail 3D farm where cows, ducks, and pigs dance to the rhythm of the classic song in a vibrant countryside setting." },
    { title: "Baby Shark Deep Sea Explore | Underwater 3D World", synopsis: "Baby Shark and family swim through a glowing coral reef, meeting colorful fish and discovering a hidden treasure chest on the sandy ocean floor." },
    { title: "ABC Phonics Garden | Learning Letters with Animals", synopsis: "Letters of the alphabet come to life in a magical garden. Each letter is accompanied by a 3D animal friend whose name starts with that letter." },
    { title: "Bath Time Bubbles Fun | Rubber Ducky Bath Song", synopsis: "A playful bath time scene with giant bubbles, a squeaky rubber ducky, and splashing water effects in a bright, colorful bathroom." },
    { title: "No No Bedtime Song | Getting Ready for Sleep", synopsis: "JJ learns the importance of brushing teeth and putting on pajamas before bed in a warm, cozy bedroom with soft moonlit lighting." },
    { title: "Yes Yes Vegetables | Yummy Kitchen Discovery", synopsis: "Cheerful characters discover the joy of eating healthy vegetables in a bright, modern kitchen filled with colorful fruits and veggies." },
    { title: "Happy Dance Party | If You're Happy and You Know It", synopsis: "A high-energy dance party with multiple 3D characters performing coordinated moves in a neon-lit playground." },
    { title: "Rain Rain Go Away | Indoor Rainy Day Fun", synopsis: "While it rains outside the big window, kids play with colorful blocks and indoor toys, creating a cozy and safe atmosphere." },
    { title: "Twinkle Twinkle Dream | Galactic 3D Space Journey", synopsis: "A peaceful journey through a dreamlike space with glowing stars, friendly planets, and a soft purple nebula background." },
    { title: "Humpty Dumpty's Wall Build | Construction Fun", synopsis: "Friendly construction vehicles help Humpty Dumpty build a safe, sturdy wall using colorful toy blocks in a sandbox setting." },
    { title: "Five Little Monkeys | Bouncy Bedroom Physics", synopsis: "Five cute monkey characters jumping on a big, soft bouncy bed with exaggerated 3D physics and funny expressions." },
    { title: "Itsy Bitsy Spider | Micro Garden Adventure", synopsis: "Follow a cute 3D spider climbing up the water spout and navigating through giant blades of grass in a macro-view garden." },
    { title: "Bingo the Farm Dog | Barnyard Rhythm & Beats", synopsis: "Bingo the dog leads a rhythmic clap-along song in front of a big red barn with chickens and sheep joining the beat." },
    { title: "Row Row Your Boat | Magical Jungle River Float", synopsis: "A gentle boat ride down a glowing jungle river filled with friendly crocodiles and monkeys waving from the trees." },
    { title: "Head, Shoulders, Knees and Toes | Exercise 3D Dance", synopsis: "Characters teach body parts through a fast-paced exercise dance in a bright, sun-drenched playground." },
    { title: "The Muffin Man | Sweet Bakery 3D Workshop", synopsis: "A visit to the Muffin Man's bakery on Drury Lane, where cupcakes and mufins dance on the counters in a warm, sugary atmosphere." },
    { title: "Jack and Jill Hill Climb | Outdoor Adventure Park", synopsis: "Jack and Jill hike up a steep, grassy green hill under a bright blue sky, carrying a shiny silver bucket." }
];

const Kidde4DGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [characterImages, setCharacterImages] = useState<ImageReference[]>([]);
    const [synopsis, setSynopsis] = useState('');
    const [sceneCount, setSceneCount] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [scenes, setScenes] = useState<GeneratedScene[]>([]);
    const [copyState, setCopyState] = useState<string | null>(null);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);
    const [sceneAudios, setSceneAudios] = useState<Record<number, { url: string | null; loading: boolean }>>({});
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);
    
    // Simulated per-frame loading state
    const [simulatedProgress, setSimulatedProgress] = useState<Record<number, number>>({});
    const [simulatedMessageIdx, setSimulatedMessageIdx] = useState<Record<number, number>>({});

    const stopSignal = useRef(false);

    // GLOBAL LOAD LISTENER
    useEffect(() => {
        const handleLoad = (e: any) => {
            const project = e.detail;
            if (project.tool === 'kidde-4d' && project.data) {
                const d = project.data;
                if (d.characterImages) setCharacterImages(d.characterImages);
                if (d.synopsis) setSynopsis(d.synopsis);
                if (d.scenes) setScenes(d.scenes);
                if (d.sceneCount) setSceneCount(d.sceneCount);
                if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
                if (d.selectedPreset) setSelectedPreset(d.selectedPreset);
                setError(null);
                setShowHistory(false);
            }
        };

        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'kidde-4d') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'kidde-4d',
                category: 'vip',
                title: synopsis.substring(0, 30) || "Kidde 4D Project",
                data: {
                    characterImages,
                    synopsis,
                    scenes,
                    sceneCount,
                    youtubeMeta,
                    selectedPreset
                }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
            window.dispatchEvent(new Event('HISTORY_UPDATED'));
            setCopyState('saved');
            setTimeout(() => setCopyState(null), 2000);
        };

        window.addEventListener('LOAD_PROJECT', handleLoad);
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        return () => {
            window.removeEventListener('LOAD_PROJECT', handleLoad);
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        };
    }, [characterImages, synopsis, scenes, sceneCount, youtubeMeta, selectedPreset]);

    useEffect(() => {
        loadLocalHistory();
        return () => {
            Object.values(sceneAudios).forEach((audio: any) => {
                if (audio.url) URL.revokeObjectURL(audio.url);
            });
        };
    }, [sceneAudios]);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'kidde-4d');
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

    const handleImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setCharacterImages(prev => [...prev, {
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                }]);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index: number) => {
        setCharacterImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const title = e.target.value;
        setSelectedPreset(title);
        const preset = kiddePresets.find(p => p.title === title);
        if (preset) {
            setSynopsis(preset.synopsis);
            setCharacterImages([]);
        }
    };

    const handleAutoSetup = async (customSynopsis?: string, customTitle?: string) => {
        const activeSynopsis = customSynopsis || synopsis;
        if (!activeSynopsis.trim()) {
            setError("Please select a content preset or enter a synopsis first.");
            return;
        }
        setIsGeneratingChars(true);
        setError(null);
        try {
            const count = Math.max(2, characterImages.length);
            const prompt = `Create ${count} distinct kid-friendly 3D characters or vehicles for this story: "${activeSynopsis}". Describe them as cute 3D living characters with detailed textures.`;
            const gen = await generateCharacters(prompt, count);
            if (characterImages.length === 0) {
                 setStatusText("Creating reference art...");
                 const imgResults = await Promise.all(gen.map(c => 
                    generateImage(`Kid-friendly 3D model, Cocomelon Style, high-quality render: ${c.description}`, '1:1')
                 ));
                 
                 const newImages = imgResults.map(url => {
                    const [header, base64] = url.split(',');
                    return { base64, mimeType: 'image/png' };
                 });
                 
                 setCharacterImages(newImages);
                 setStatusText("");
            }
        } catch (err) {
            setError("Auto-setup failed.");
        } finally {
            setIsGeneratingChars(false);
        }
    };

    const handleStart = async () => {
        if (characterImages.length === 0 || !synopsis.trim()) {
            setError("Please setup style your image (សូមមេត្តា Update Image តួអង្គ និង ដាក់សាច់រឿងសង្ខេបមុននឹងចាប់ផ្តើម)");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setScenes([]);
        setYoutubeMeta(null);
        setProgress(1);
        stopSignal.current = false;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            setStatusText('Analyzing Character Models (Parallel)...');
            const analyzedResults = await Promise.all(characterImages.map(img => 
                analyzeCharacterReference(img.base64, img.mimeType)
            ));
            
            const analyzedCharacters = analyzedResults.map(r => r.characterDescription);
            const charNames = characterImages.map((_, i) => `Character ${i+1}`).join(', ');
            const allCharactersDesc = analyzedCharacters.join('\n\n');
            setProgress(10);

            const SCRIPT_BATCH_SIZE = 50; 
            const numBatches = Math.ceil(sceneCount / SCRIPT_BATCH_SIZE);
            let fullScript: any[] = [];

            for (let b = 0; b < numBatches; b++) {
                if (stopSignal.current) break;
                const startNum = b * SCRIPT_BATCH_SIZE + 1;
                const countInBatch = Math.min(SCRIPT_BATCH_SIZE, sceneCount - fullScript.length);
                setStatusText(`Scripting Senses ${startNum}-${startNum + countInBatch - 1}...`);

                const scriptPrompt = `Generate a high-speed production script for kids 3D animation scenes ${startNum} to ${startNum + countInBatch - 1} of a total ${sceneCount}.\nSYNOPSIS: ${synopsis}\nCHARACTERS: ${allCharactersDesc}\nOUTPUT JSON ARRAY: [ { "sceneNumber": number, "action": string, "consistentContext": string, "voiceover": string, "asmrType": "nature" | "water" | "steps" | "toys" | "magic" } ]`;

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: scriptPrompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sceneNumber: { type: Type.INTEGER },
                                    action: { type: Type.STRING },
                                    consistentContext: { type: Type.STRING, description: "Detailed 8K standalone visual prompt for AI video generation." },
                                    voiceover: { type: Type.STRING },
                                    asmrType: { type: Type.STRING, enum: ["nature", "water", "steps", "toys", "magic"] }
                                }
                            }
                        }
                    }
                });

                const batch = JSON.parse(response.text || "[]");
                fullScript = [...fullScript, ...batch];
                setProgress(10 + Math.round(((b + 1) / numBatches) * 20)); 
            }

            if (stopSignal.current) return;

            const initialScenes: GeneratedScene[] = fullScript.map(s => ({
                sceneNumber: s.sceneNumber,
                description: s.action,
                voiceover: s.voiceover || s.action,
                character_detail: charNames,
                isLoading: true,
                asmrType: s.asmrType || 'toys',
                promptUsed: `Style: 3D Kid-Friendly Aesthetic. Characters: ${allCharactersDesc}\nAction: ${s.action}\nEnvironment: ${s.consistentContext}\nMaintain 100% face consistency.`
            }));
            setScenes(initialScenes);
            setProgress(30);

            const CONCURRENT_RENDERS = 4; 
            for (let i = 0; i < initialScenes.length; i += CONCURRENT_RENDERS) {
                if (stopSignal.current) break;
                
                const chunk = initialScenes.slice(i, i + CONCURRENT_RENDERS);
                setStatusText(`Rendering Senses ${i + 1}-${Math.min(i + CONCURRENT_RENDERS, sceneCount)}...`);
                
                await Promise.all(chunk.map(async (scene) => {
                    await handleRenderSingle(scene.sceneNumber - 1);
                }));

                setProgress(30 + Math.round(((i + chunk.length) / initialScenes.length) * 70));
                if (i + CONCURRENT_RENDERS < initialScenes.length) await new Promise(r => setTimeout(r, 200));
            }
        } catch (err) {
            setError("Production error. Please try again.");
        } finally {
            setIsProcessing(false);
            setStatusText('');
        }
    };

    const handlePlayAsmr = (index: number) => {
        const scene = scenes[index];
        if (!scene || !scene.asmrType) return;
        const soundUrl = asmrLibrary[scene.asmrType];
        if (!soundUrl) return;

        const audio = new Audio(soundUrl);
        audio.volume = 0.2;
        audio.play();
    };

    const handleRenderSingle = async (index: number) => {
        const scene = scenes[index];
        if (!scene || !scene.promptUsed) return;
        
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: true, imageUrl: undefined } : s));
        
        // Start simulation
        setSimulatedProgress(prev => ({ ...prev, [index]: 0 }));
        setSimulatedMessageIdx(prev => ({ ...prev, [index]: 0 }));

        const pInterval = window.setInterval(() => {
            setSimulatedProgress(prev => {
                const current = prev[index] ?? 0;
                if (current >= 95) {
                    clearInterval(pInterval);
                    return prev;
                }
                return { ...prev, [index]: current + Math.random() * 8 };
            });
        }, 300);

        const mInterval = window.setInterval(() => {
            setSimulatedMessageIdx(prev => ({
                ...prev,
                [index]: (prev[index] + 1) % loadingMessages.length
            }));
        }, 1500);

        try {
            const imageUrl = await generateImage(scene.promptUsed, '16:9');
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: imageUrl, isLoading: false } : s));
        } catch (err) {
            setScenes(prev => prev.map((s, i) => i === index ? { ...s, isLoading: false } : s));
        } finally {
            clearInterval(pInterval);
            clearInterval(mInterval);
        }
    };

    const handleGetTextVoice = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        
        handlePlayAsmr(index);

        setSceneAudios(prev => ({ ...prev, [index]: { url: null, loading: true } }));
        try {
            const base64Audio = await generateVoiceover(scene.voiceover || scene.description, 'en', 'Kore');
            const pcmBytes = audioDecode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWav(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setSceneAudios(prev => ({ ...prev, [index]: { url, loading: false } }));
            new Audio(url).play();
        } catch (e) {
            setSceneAudios(prev => ({ ...prev, [index]: { url: null, loading: false } }));
            setError("Voiceover failed.");
        }
    };

    const handleDownloadVoice = (index: number) => {
        const audio = sceneAudios[index];
        if (audio?.url) {
            const link = document.createElement('a');
            link.href = audio.url;
            link.download = `Sense_${index + 1}_Audio.wav`;
            link.click();
        }
    };

    const handleStop = () => {
        stopSignal.current = true;
        setIsProcessing(false);
    };

    const handleCopyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyState(id);
        setTimeout(() => setCopyState(null), 2000);
    };

    const handleCopyAllSenses = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Sense ${s.sceneNumber}: ${s.description}`).join('\n\n');
        handleCopyText(text, 'all-senses');
    };

    const handleCopyAllJson = () => {
        if (scenes.length === 0) return;
        const text = JSON.stringify(scenes, null, 2);
        handleCopyText(text, 'all-json');
    };

    const handleCopySenseData = (index: number, mode: 'json' | 'prompt') => {
        const scene = scenes[index];
        if (!scene) return;
        
        if (mode === 'json') {
            const data = {
                sense: scene.description,
                character: scene.character_detail || "",
                voiceover: scene.voiceover || scene.description,
                prompt: scene.promptUsed || "",
                asmr: scene.asmrType || "toys"
            };
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        } else {
            navigator.clipboard.writeText(scene.promptUsed || "");
        }
        setCopyState(`${mode}-${index}`);
        setTimeout(() => setCopyState(null), 2000);
    };

    const handleGenerateMetadata = async () => {
        if (!synopsis.trim() && scenes.length === 0) return;
        setIsGeneratingMeta(true);
        try {
            const context = scenes.map(s => s.description).join('\n');
            const meta = await generateYouTubeMetadata(selectedPreset || "Kidde 4D Adventure", context, 'Kids Animation');
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleClearProject = () => {
        setCharacterImages([]);
        setSynopsis('');
        setScenes([]);
        setError(null);
        setProgress(0);
        setSceneCount(100);
        setStatusText('');
        setYoutubeMeta(null);
        setSelectedPreset('');
        setSceneAudios({});
        setSimulatedProgress({});
        setSimulatedMessageIdx({});
    };

    const handleDownloadImage = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Kidde_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                <button onClick={handleClearProject} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-300 bg-red-950/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-colors duration-200">
                    <TrashIcon className="h-4 w-4" /> Reset Studio | សម្អាត
                </button>
            </div>

            {/* History Overlay */}
            {showHistory && (
                <div className="w-full bg-[#0f172a]/95 border-2 border-indigo-500/50 p-6 rounded-3xl mb-8 animate-slide-down shadow-[0_0_50px_rgba(79,70,229,0.2)] relative z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5" /> Kidde 4D History Vault
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
                                    <p className="text-white text-xs font-bold truncate mb-1">{project.data.synopsis || "Untitled Project"}</p>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">Restoration Ready <span className="text-lg">➜</span></span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found in vault.</div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-[#1e293b]/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 shadow-2xl">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 mb-6 flex items-center gap-2">
                        <span>👶</span> Kidde 4D (FAST)
                    </h2>

                    <div className="space-y-6">
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <SparklesIcon /> Choose 20 Contents More
                            </label>
                            <select value={selectedPreset} onChange={handlePresetChange} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white text-xs outline-none">
                                <option value="">-- Select Kidde 4D Theme --</option>
                                {kiddePresets.map((p, i) => <option key={i} value={p.title}>{i + 1}. {p.title}</option>)}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-300">1. Reference ({characterImages.length}/5)</label>
                                {selectedPreset && characterImages.length === 0 && (
                                    <button onClick={() => handleAutoSetup()} disabled={isGeneratingChars} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold transition flex items-center gap-1">
                                        {isGeneratingChars ? <Spinner className="h-3 w-3 m-0"/> : '✨ Auto Setup'}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {characterImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" alt="ref"/>
                                        <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"><TrashIcon className="h-3 w-3" /></button>
                                    </div>
                                ))}
                                {characterImages.length < 5 && (
                                    <label className="cursor-pointer aspect-square bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-cyan-400 transition-colors">
                                        <span className="text-2xl mb-1 text-gray-500">+</span>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(characterImages.length, e)} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">2. Synopsis</label>
                            <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Describe story path..." className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none outline-none text-sm" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">3. Senses (1-500)</label>
                            <input type="number" min="1" max="500" value={sceneCount} onChange={(e) => setSceneCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-center font-bold text-lg outline-none" />
                        </div>

                        {isProcessing ? (
                            <div className="space-y-2">
                                <button onClick={handleStop} className="w-full py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg">STOP PRODUCTION</button>
                                <p className="text-center text-xs text-cyan-300 animate-pulse">{statusText}</p>
                            </div>
                        ) : (
                            <button onClick={handleStart} disabled={characterImages.length === 0 || !synopsis} className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-black rounded-lg shadow-xl transition active:scale-95 uppercase tracking-widest text-sm">🚀 Get Go (Auto Create)</button>
                        )}
                        {isProcessing && <div className="w-full bg-gray-700 rounded-full h-2 mt-2 shadow-inner"><div className="bg-gradient-to-r from-cyan-400 to-pink-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(251,211,238,0.5)]" style={{ width: `${progress}%` }}></div></div>}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4 h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                    <div className="bg-[#1e293b]/80 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 backdrop-blur shadow-xl gap-4">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter shrink-0">Kidde 4D Studio ({scenes.length} Senses)</h3>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {scenes.length > 0 && (
                                <>
                                    <button onClick={handleCopyAllSenses} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition">
                                        {copyState === 'all-senses' ? '✓ Copied' : 'Copy all Senses'}
                                    </button>
                                    <button onClick={handleCopyAllJson} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition">
                                        {copyState === 'all-json' ? '✓ Copied' : 'Copy JSON all senses'}
                                    </button>
                                    <button onClick={handleGenerateMetadata} disabled={isGeneratingMeta} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold flex items-center gap-2 text-xs shadow-lg">
                                        {isGeneratingMeta ? <Spinner className="h-4 w-4 m-0"/> : <YouTubeIcon />} YouTube Info
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {isProcessing && scenes.length === 0 && (
                        <div className="bg-[#0f172a] p-12 rounded-[2rem] border border-cyan-500/30 shadow-[0_0_80px_rgba(251,211,238,0.15)] flex flex-col items-center justify-center animate-fade-in min-h-[500px]">
                            <div className="relative w-48 h-48 mb-10">
                                 <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-800" />
                                    <circle 
                                        cx="96" cy="96" r="88" 
                                        stroke="currentColor" 
                                        strokeWidth="14" 
                                        fill="transparent" 
                                        className="text-pink-500 transition-all duration-700 ease-out" 
                                        strokeDasharray={2 * Math.PI * 88} 
                                        strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)} 
                                        strokeLinecap="round" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(251,211,238,0.5)]">{progress}%</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-400 uppercase tracking-widest mb-2 animate-pulse text-center">{statusText || "Initializing FAST Pipeline..."}</h3>
                            <p className="text-xs text-gray-500 font-black uppercase tracking-[0.3em]">AI AUTONOMOUS PRODUCTION ACTIVE</p>
                        </div>
                    )}

                    {youtubeMeta && (
                        <div className="bg-gray-900 p-5 rounded-lg border border-red-500/30 animate-fade-in mb-4 shadow-2xl">
                            <div className="flex justify-between items-center mb-4 text-red-400 font-black uppercase text-xs tracking-widest"><span>YouTube Distribution Kit</span></div>
                            <div className="space-y-4">
                                <div className="bg-black/40 p-3 rounded-xl border border-gray-800 text-xs">
                                    <div className="flex justify-between mb-2"><span className="text-gray-500 font-bold uppercase tracking-tighter">TITLE</span><button onClick={() => handleCopyText(youtubeMeta.title, 'yt-title')} className="text-cyan-500 hover:text-cyan-400 font-bold uppercase text-[10px]">{copyState === 'yt-title' ? '✓' : 'Copy'}</button></div>
                                    <p className="text-white font-bold text-sm">{youtubeMeta.title}</p>
                                </div>
                                <div className="bg-black/40 p-3 rounded-xl border border-gray-800 text-xs">
                                    <div className="flex justify-between mb-2"><span className="text-gray-500 font-bold uppercase tracking-tighter">DESCRIPTION</span><button onClick={() => handleCopyText(youtubeMeta.description, 'yt-desc')} className="text-cyan-500 hover:text-cyan-400 font-bold uppercase text-[10px]">{copyState === 'yt-desc' ? '✓' : 'Copy'}</button></div>
                                    <p className="text-gray-300 whitespace-pre-wrap h-28 overflow-y-auto custom-scrollbar font-serif leading-relaxed italic">{youtubeMeta.description}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-[#1e293b]/40 rounded-2xl overflow-hidden border border-gray-800 flex flex-col hover:border-cyan-500/50 transition-all group shadow-xl">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="sense"/>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                                <button onClick={() => handleDownloadImage(scene.imageUrl!, scene.sceneNumber)} className="bg-white/20 p-3 rounded-full text-white backdrop-blur-md hover:scale-110 transition shadow-xl"><DownloadIcon /></button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            {!scene.isLoading && (
                                                <button onClick={() => handleRenderSingle(idx)} className="text-[10px] font-black uppercase text-gray-500 hover:text-white border border-gray-800 px-4 py-2 rounded-full transition-colors">
                                                    Render Scene
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {scene.isLoading && (
                                        <RenderLoadingOverlay 
                                            progress={simulatedProgress[idx] || 0} 
                                            messageIndex={simulatedMessageIdx[idx] || 0} 
                                        />
                                    )}

                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-600 shadow-md uppercase">Sense {scene.sceneNumber}</div>
                                </div>
                                <div className="p-5 flex flex-col flex-grow bg-gradient-to-b from-[#1e293b]/20 to-black/40">
                                    <p className="text-gray-300 text-xs italic font-serif leading-relaxed mb-6 flex-grow">"{scene.description}"</p>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <button onClick={() => handleGetTextVoice(idx)} disabled={sceneAudios[idx]?.loading} className="flex-1 py-2 bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-600 hover:text-white transition disabled:opacity-50 uppercase tracking-widest">
                                            {sceneAudios[idx]?.loading ? <Spinner className="h-3 w-3 m-0"/> : <AudioIcon />} GET VOICE
                                        </button>
                                        <button onClick={() => handlePlayAsmr(idx)} className="px-4 py-2 bg-pink-900/40 border border-pink-700 text-pink-300 rounded-xl text-[10px] font-bold flex items-center justify-center transition hover:bg-pink-600 hover:text-white" title="Play Subtle ASMR">
                                            <SoundIcon />
                                        </button>
                                        <button onClick={() => handleDownloadVoice(idx)} disabled={!sceneAudios[idx]?.url} className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 rounded-xl text-[10px] font-bold flex items-center justify-center transition disabled:opacity-50 hover:bg-emerald-600 hover:text-white">
                                            <DownloadIcon />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-gray-800/50 pt-4">
                                         <button onClick={() => handleCopySenseData(idx, 'prompt')} className="text-[10px] text-gray-500 hover:text-cyan-400 font-black uppercase tracking-tighter transition" disabled={!scene.promptUsed}>
                                            {copyState === `prompt-${idx}` ? '✓ Copied' : 'Prompt'}
                                        </button>
                                        <button onClick={() => handleCopySenseData(idx, 'json')} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-black uppercase tracking-tighter transition">
                                            {copyState === `json-${idx}` ? '✓ Done' : 'JSON Code'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Kidde4DGenerator;
