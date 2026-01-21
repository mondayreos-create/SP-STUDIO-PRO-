
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    analyzeCharacterReference, 
    generateConsistentStoryScript, 
    generateImage, 
    generateYouTubeMetadata,
    ImageReference, 
    CharacterAnalysis,
    YouTubeMetadata,
    generateCharacters,
    generateVoiceover
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
    mud: 'https://assets.mixkit.co/active_storage/sfx/1071/1071-preview.mp3',
    metal: 'https://assets.mixkit.co/active_storage/sfx/2555/2555-preview.mp3',
    engine: 'https://assets.mixkit.co/active_storage/sfx/2522/2522-preview.mp3',
    sand: 'https://assets.mixkit.co/active_storage/sfx/1057/1057-preview.mp3',
    nature: 'https://assets.mixkit.co/active_storage/sfx/10/10-preview.mp3',
    water: 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'
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

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/xl" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const JsonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
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

const contentPresets = [
    { title: "Cement Truck & Friends Build a City | 3D Construction Vehicles for Kids", synopsis: "A team of cheerful RC construction vehicles including a big Cement Truck, a Crane, and a Bulldozer work together to build a colorful toy city. They face challenges like muddy roads and heavy lifting but always find a way with teamwork." },
    { title: "Monster Truck Mountain Climb | Extreme RC Off-Road Adventure", synopsis: "High-power RC Monster Trucks compete in a dangerous mountain climbing challenge. They must navigate rocky terrains, deep mud pits, and steep inclines to reach the summit trophy." },
    { title: "Fire Truck Rescue Mission | Saving the Toy Town from Fire", synopsis: "Emergency! An RC Fire Truck and a Rescue SUV race through the streets to put out a fire at the toy station. Intense action and heroic saves." },
    { title: "Excavator Digging Adventure | Finding Hidden Treasure in the Sand", synopsis: "An RC Excavator and Dump Truck head to the big sandbox to dig for a legendary hidden treasure. They uncover old artifacts and gold coins buried deep in the sand." },
    { title: "Tow Truck to the Rescue | Helping Stuck Cars in the Mud", synopsis: "After a heavy rain, many small toy cars are stuck in a muddy swamp. The powerful RC Tow Truck goes on a mission to pull them all to safety one by one." },
    { title: "Garbage Truck Morning Routine | Keeping the Mini City Clean", synopsis: "Follow the hardworking RC Garbage Truck as it makes its rounds early in the morning, picking up bins and keeping the toy city sparkling clean for its citizens." },
    { title: "RC Race Day | High Speed Competition on the Backyard Track", synopsis: "The fastest RC sports cars and trucks gather for the ultimate championship. Turns, jumps, and high-speed drafting lead to an epic finish line photo." },
    { title: "Police Truck High Speed Chase | Catching the Toy Bank Robbers", synopsis: "A group of rogue vehicles just robbed the toy bank! The RC Police interceptor and tactical truck must use strategy and speed to corner them." },
    { title: "Farm Tractor Harvest Day | Gathering Crops in the Countryside", synopsis: "A busy day at the miniature farm. RC Tractors and Harvesters work the fields to gather the harvest before the big storm arrives." },
    { title: "Military Convoy Mission | Delivering Supplies through the Desert", synopsis: "A convoy of 8x8 RC military trucks travels through a vast sand desert. They must avoid obstacles and stay together to deliver critical supplies to the base." },
    { title: "Snow Plow Winter Cleanup | Clearing the Path after a Snowstorm", synopsis: "A massive winter storm has covered the toy village in white. The RC Snow Plow and Blower truck work day and night to clear the roads for the school bus." },
    { title: "Delivery Truck Route | Bringing Packages to All the Neighbors", synopsis: "A day in the life of an RC Delivery Truck driver. Navigating tight driveways and avoiding the neighborhood cat to ensure every package arrives on time." },
    { title: "Crane Truck Skyscraper Build | Lifting Heavy Beams to the Sky", synopsis: "Precision is key as a massive RC Crane truck assists in building a tall skyscraper. It lifts steel beams and glass panels to extreme heights." },
    { title: "RC Tank Battle | Tactical Maneuvers in the Garden Jungle", synopsis: "RC Tanks engage in a tactical hide-and-seek battle in the thick grass of the garden. Using infrared sensors and clever positioning to win." },
    { title: "Ambulance Emergency Run | Racing to the Hospital in Toy City", synopsis: "With lights flashing and sirens blaring, the RC Ambulance weaves through traffic to get a patient to the emergency room in record time." },
    { title: "Fuel Tanker Delivery | Keeping the RC Vehicles Moving", synopsis: "The vital mission of the RC Fuel Tanker. It travels to the remote RC airport and harbor to refuel planes and boats, keeping the world connected." },
    { title: "Logging Truck Forest Work | Transporting Big Logs to the Mill", synopsis: "Deep in the woods, a powerful RC Logging Truck loads up massive timber and navigates a treacherous winding road to deliver logs to the saw mill." },
    { title: "School Bus Morning Pick-up | Taking the Toy Students to Class", synopsis: "The bright yellow RC School Bus makes its stops around the colorful toy neighborhood, picking up students and teaching them about road safety." },
    { title: "Dump Truck Dirt Hauling | Moving Mountains in the Sandbox", synopsis: "A huge engineering project requires moving tons of dirt. A fleet of RC Dump Trucks works with a Loader to move a mountain from one side of the pit to the other." },
    { title: "RC Forklift Warehouse Challenge | Organizing the Tiny Storage", synopsis: "A precision test for the RC Forklift. It must move delicate cargo between high shelves in a crowded warehouse without dropping anything." }
];

const MegaRcTruckGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [vehicleImages, setVehicleImages] = useState<ImageReference[]>([]);
    const [synopsis, setSynopsis] = useState('');
    const [sceneCount, setSceneCount] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [scenes, setScenes] = useState<GeneratedScene[]>([]);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [sceneAudios, setSceneAudios] = useState<Record<number, { url: string | null; loading: boolean }>>({});
    const [asmrAudios, setAsmrAudios] = useState<Record<number, { url: string | null; loading: boolean }>>({});
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);
    const [activeResultTab, setActiveResultTab] = useState<'storyboard' | 'prompts' | 'metadata'>('storyboard');
    
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    
    const stopSignal = useRef(false);

    // PERSISTENCE LISTENERS
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'mega-rc-truck') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'mega-rc-truck',
                category: 'vip',
                title: synopsis.substring(0, 30) || "Mega RC Truck Project",
                data: {
                    vehicleImages,
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
            setCopyStatus('saved');
            setTimeout(() => setCopyStatus(null), 2000);
        };

        const handleLoadRequest = (e: any) => {
            const project = e.detail;
            if (project.tool === 'mega-rc-truck' && project.data) {
                const d = project.data;
                if (d.vehicleImages) setVehicleImages(d.vehicleImages);
                if (d.synopsis) setSynopsis(d.synopsis);
                if (d.scenes) setScenes(d.scenes);
                if (d.sceneCount) setSceneCount(d.sceneCount);
                if (d.youtubeMeta) setYoutubeMeta(d.youtubeMeta);
                if (d.selectedPreset) setSelectedPreset(d.selectedPreset);
                setError(null);
                setShowHistory(false);
            }
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [vehicleImages, synopsis, scenes, sceneCount, youtubeMeta, selectedPreset]);

    useEffect(() => {
        loadLocalHistory();
        return () => {
            Object.values(sceneAudios).forEach((audio: any) => {
                if (audio.url) URL.revokeObjectURL(audio.url);
            });
            Object.values(asmrAudios).forEach((audio: any) => {
                if (audio.url) URL.revokeObjectURL(audio.url);
            });
        };
    }, [sceneAudios, asmrAudios]);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'mega-rc-truck');
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

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (vehicleImages.length >= 5) {
                setError("Vehicle limit reached (Max 5).");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setVehicleImages(prev => [...prev, {
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                }]);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index: number) => {
        setVehicleImages(prev => prev.filter((_, i) => i !== index));
    };

    const downloadRefImage = (index: number) => {
        const img = vehicleImages[index];
        if (!img) return;
        const link = document.createElement('a');
        link.href = `data:${img.mimeType};base64,${img.base64}`;
        link.download = `Vehicle_Ref_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const title = e.target.value;
        setSelectedPreset(title);
        const preset = contentPresets.find(p => p.title === title);
        if (preset) {
            setSynopsis(preset.synopsis);
        }
    };

    const handleAutoSetup = async () => {
        if (!synopsis.trim()) {
            setError("Please select a content preset or enter a synopsis first.");
            return;
        }
        setIsGeneratingChars(true);
        setError(null);
        try {
            const count = Math.max(2, vehicleImages.length);
            const prompt = `Create ${count} distinct RC Truck characters for this story: "${synopsis}". Include their names, types (e.g., Cement Truck, Monster Truck), and highly detailed visual characteristics.`;
            const gen = await generateCharacters(prompt, count);
            
            if (vehicleImages.length === 0) {
                 setStatusText("Creating reference visuals for your trucks...");
                 for (let i = 0; i < gen.length; i++) {
                     const imgUrl = await generateImage(`3D Realistic RC Truck model, profile shot, studio lighting: ${gen[i].description}`, '1:1');
                     const [header, base64] = imgUrl.split(',');
                     const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
                     setVehicleImages(prev => [...prev, { base64, mimeType: mime }]);
                     if (i < gen.length - 1) await new Promise(r => setTimeout(r, 1000));
                 }
                 setStatusText("");
            }
        } catch (err) {
            setError("Auto-setup failed.");
        } finally {
            setIsGeneratingChars(false);
        }
    };

    const handleStart = async () => {
        if (vehicleImages.length === 0 || !synopsis.trim()) {
            setError("Please upload at least one truck image and provide a story synopsis.");
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

            setStatusText('Analyzing Visual Consistency...');
            const analyzedVehicles: string[] = await Promise.all(vehicleImages.map(async (img) => {
                const analysis = await analyzeCharacterReference(img.base64, img.mimeType);
                return analysis.characterDescription;
            }));
            setProgress(15);

            setStatusText('Architecting MEGA RC Story (Prompts First)...');
            const allVehiclesDesc = analyzedVehicles.join('\n\n');
            const SCRIPT_BATCH_SIZE = 50; 
            const numBatches = Math.ceil(sceneCount / SCRIPT_BATCH_SIZE);
            let fullScript: any[] = [];

            for (let b = 0; b < numBatches; b++) {
                if (stopSignal.current) break;
                const startNum = b * SCRIPT_BATCH_SIZE + 1;
                const countInBatch = Math.min(SCRIPT_BATCH_SIZE, sceneCount - fullScript.length);
                setStatusText(`Scripting Scenes ${startNum}-${startNum + countInBatch - 1}...`);

                const scriptPrompt = `Generate a high-speed production script for RC truck scenes ${startNum} to ${startNum + countInBatch - 1} of a total ${sceneCount}.
                Ensure a complete arc from beginning to end. 
                SYNOPSIS: ${synopsis}
                VEHICLES: ${allVehiclesDesc}
                OUTPUT JSON ARRAY: [ { "sceneNumber": number, "action": string, "consistentContext": string, "voiceover": string, "asmrType": "mud" | "metal" | "engine" | "sand" | "nature" | "water" } ]`;

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
                                    consistentContext: { type: Type.STRING, description: "Highly detailed stand-alone 8K visual prompt for AI video generation." },
                                    voiceover: { type: Type.STRING },
                                    asmrType: { type: Type.STRING, enum: ["mud", "metal", "engine", "sand", "nature", "water"] }
                                }
                            }
                        }
                    }
                });

                const batch = JSON.parse(response.text || "[]");
                fullScript = [...fullScript, ...batch];
                setProgress(15 + Math.round(((b + 1) / numBatches) * 15)); 
            }

            if (stopSignal.current) return;

            const charNames = vehicleImages.map((_, i) => `Truck ${i + 1}`).join(', ');

            // Immediately set generated prompts to UI so user sees them first
            const initialScenes: GeneratedScene[] = fullScript.map(s => ({
                sceneNumber: s.sceneNumber,
                description: s.action,
                isLoading: true,
                voiceover: s.voiceover || s.action,
                character_detail: charNames,
                asmrType: s.asmrType || 'engine',
                promptUsed: `3D Realistic RC Truck / Miniature Style Image. Style: Miniature Photography, Tilt-Shift, High Detail, Dirt & Mud Textures. Vehicles: ${allVehiclesDesc}\nAction: ${s.action}\nSetting: ${s.consistentContext}\nConstraint: 100% vehicle consistency.`
            }));
            setScenes(initialScenes);
            setProgress(30);

            setStatusText('Auto-Generating Images for All Scenes...');
            const CONCURRENT_RENDERS = 4; 
            for (let i = 0; i < initialScenes.length; i += CONCURRENT_RENDERS) {
                if (stopSignal.current) break;
                
                const chunk = initialScenes.slice(i, i + CONCURRENT_RENDERS);
                setStatusText(`Rendering Scenes ${i + 1}-${Math.min(i + CONCURRENT_RENDERS, sceneCount)}...`);
                
                await Promise.all(chunk.map(async (scene) => {
                    if (!scene.promptUsed) return;
                    try {
                        const imageUrl = await generateImage(scene.promptUsed, '16:9');
                        setScenes(prev => prev.map(s => s.sceneNumber === scene.sceneNumber ? { ...s, imageUrl: imageUrl, isLoading: false } : s));
                    } catch (err) {
                        setScenes(prev => prev.map(s => s.sceneNumber === scene.sceneNumber ? { ...s, isLoading: false } : s));
                    }
                }));

                setProgress(30 + Math.round(((i + chunk.length) / initialScenes.length) * 70));
                if (i + CONCURRENT_RENDERS < initialScenes.length) await new Promise(r => setTimeout(r, 200));
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
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
        audio.volume = 0.3;
        audio.play();
    };

    const handleGetTextVoice = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        
        // Play subtle ASMR in background
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
            link.download = `Scenes_${index + 1}_Audio.wav`;
            link.click();
        }
    };

    const handleCopyAllSenses = () => {
        if (scenes.length === 0) return;
        const text = scenes.map(s => `Scenes ${s.sceneNumber}: ${s.promptUsed || s.description}`).join('\n\n');
        handleCopy(text, 'all-senses');
    };

    const handleCopyAllJson = () => {
        if (scenes.length === 0) return;
        const exportData = scenes.map(s => ({
            scene: `Scenes ${s.sceneNumber}`,
            prompt: s.promptUsed || s.description,
            voiceover: s.voiceover || "",
            asmr: s.asmrType || "engine"
        }));
        handleCopy(JSON.stringify(exportData, null, 2), 'all-json');
    };

    const handleGenerateMetadata = async () => {
        if (!synopsis.trim() && scenes.length === 0) return;
        setIsGeneratingMeta(true);
        setActiveResultTab('metadata');
        try {
            const context = `Synopsis: ${synopsis}\n\nScenes:\n${scenes.map(s => s.description).join('\n')}`;
            const meta = await generateYouTubeMetadata(selectedPreset || synopsis.substring(0, 50), context, 'RC Truck Hobby');
            setYoutubeMeta(meta);
        } catch (err) {
            setError("Failed to generate YouTube Metadata");
        } finally {
            setIsGeneratingMeta(false);
        }
    };

    const handleStop = () => {
        stopSignal.current = true;
        setIsProcessing(false);
        setStatusText('Stopped.');
    };

    const handleClear = () => {
        setVehicleImages([]);
        setSynopsis('');
        setScenes([]);
        setError(null);
        setProgress(0);
        setSceneCount(100);
        setSelectedPreset('');
        setYoutubeMeta(null);
        setSceneAudios({});
        setAsmrAudios({});
        setActiveResultTab('storyboard');
    };

    const handleDownloadImage = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `MegaRC_Scenes_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleCopySenseData = (index: number, mode: 'json' | 'prompt') => {
        const scene = scenes[index];
        if (!scene) return;
        if (mode === 'json') {
            const exportData = {
                scene: `Scenes ${scene.sceneNumber}`,
                prompt: scene.promptUsed || "",
                voiceover: scene.voiceover || "",
                asmr: scene.asmrType || "engine"
            };
            handleCopy(JSON.stringify(exportData, null, 2), `json-${index}`);
        } else {
            handleCopy(`Scenes ${scene.sceneNumber}: ${scene.promptUsed || ""}`, `prompt-${index}`);
        }
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
                <button onClick={handleClear} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-300 bg-red-950/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-colors duration-200">
                    <TrashIcon className="h-4 w-4" /> Reset Studio | សម្អាត
                </button>
            </div>

            {/* History Overlay */}
            {showHistory && (
                <div className="w-full bg-[#0f172a]/95 border-2 border-indigo-500/50 p-6 rounded-3xl mb-8 animate-slide-down shadow-[0_0_50px_rgba(79,70,229,0.2)] relative z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5" /> Mega RC History Vault
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
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Configuration */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 mb-2 flex items-center gap-2">
                        <span>🚛</span> MEGA RC Truck
                    </h2>

                    <div className="space-y-6">
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                                <SparklesIcon /> Choose 20 Contents More
                            </label>
                            <select 
                                value={selectedPreset}
                                onChange={handlePresetChange}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white text-xs outline-none"
                            >
                                <option value="">-- Select a Content Theme --</option>
                                {contentPresets.map((p, i) => (
                                    <option key={i} value={p.title}>{i + 1}. {p.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-300">1. Vehicle Reference ({vehicleImages.length}/5)</label>
                                {selectedPreset && vehicleImages.length === 0 && (
                                    <button 
                                        onClick={handleAutoSetup} 
                                        disabled={isGeneratingChars}
                                        className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold transition flex items-center gap-1"
                                    >
                                        {isGeneratingChars ? <Spinner className="h-3 w-3 m-0"/> : '✨ Auto Setup'}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {vehicleImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Truck ${idx}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                            <button onClick={() => downloadRefImage(idx)} className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 shadow-lg" title="Download Reference"><DownloadIcon /></button>
                                            <button onClick={() => removeImage(idx)} className="p-1.5 bg-red-600 text-white rounded hover:bg-red-500 shadow-lg" title="Remove"><TrashIcon className="h-3 w-3" /></button>
                                        </div>
                                    </div>
                                ))}
                                {vehicleImages.length < 5 && (
                                    <label className="cursor-pointer aspect-square bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-orange-400 transition-colors">
                                        <span className="text-2xl mb-1 text-gray-500">+</span>
                                        <span className="text-[10px] text-gray-500">Add</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">2. Story Synopsis</label>
                            <textarea 
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Describe the mission or adventure..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">3. Scenes (Qty) (1-500)</label>
                            <input 
                                type="number" min="1" max="500" 
                                value={sceneCount}
                                onChange={(e) => setSceneCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold text-lg"
                            />
                        </div>

                        {isProcessing ? (
                            <div className="space-y-2">
                                <button onClick={handleStop} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition text-xs font-black">STOP PRODUCTION</button>
                                <p className="text-center text-xs text-orange-300 animate-pulse">{statusText}</p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleStart} 
                                disabled={vehicleImages.length === 0 || !synopsis}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                🚀 Get Go (Auto Create)
                            </button>
                        )}
                        {isProcessing && <div className="w-full bg-gray-700 rounded-full h-2 mt-2 shadow-inner"><div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(251,146,60,0.5)]" style={{ width: `${progress}%` }}></div></div>}
                    </div>
                </div>

                {/* Right Panel: Result Hub */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 backdrop-blur shadow-xl gap-4">
                        <h3 className="text-xl font-bold text-gray-200 uppercase tracking-tighter shrink-0">Mega RC Studio</h3>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {scenes.length > 0 && (
                                <>
                                    <button onClick={handleCopyAllSenses} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition">
                                        {copyStatus === 'all-senses' ? '✓ Copied' : 'Copy all Senses'}
                                    </button>
                                    <button onClick={handleCopyAllJson} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition">
                                        {copyStatus === 'all-json' ? '✓ Copied' : 'Copy all JSON code'}
                                    </button>
                                    <button onClick={handleGenerateMetadata} disabled={isGeneratingMeta} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition disabled:opacity-50 text-sm font-bold">
                                        {isGeneratingMeta ? <Spinner className="h-4 w-4 m-0"/> : <YouTubeIcon />} YouTube Info
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 3 Result Tabs */}
                    {scenes.length > 0 && (
                        <div className="w-full flex bg-gray-900 p-1 rounded-xl border border-gray-700 mb-2">
                            <button 
                                onClick={() => setActiveResultTab('storyboard')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeResultTab === 'storyboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                🖼️ Storyboard
                            </button>
                            <button 
                                onClick={() => setActiveResultTab('prompts')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeResultTab === 'prompts' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                📝 Master Prompts
                            </button>
                            <button 
                                onClick={() => setActiveResultTab('metadata')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeResultTab === 'metadata' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                📺 Distribution
                            </button>
                        </div>
                    )}

                    <div className="h-[75vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {activeResultTab === 'storyboard' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl flex flex-col hover:border-orange-500/50 transition-all group">
                                        <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                            {scene.imageUrl ? (
                                                <>
                                                    <img src={scene.imageUrl} alt={`Scenes ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <button onClick={() => handleDownloadImage(scene.imageUrl!, idx)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110"><DownloadIcon /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    {scene.isLoading ? (
                                                        <><Spinner className="h-8 w-8 text-orange-500 mb-2" /><span className="text-[10px] text-gray-500 font-black uppercase animate-pulse">Rendering 3D Art...</span></>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-700 font-black">READY</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded border border-gray-600/50 font-bold uppercase tracking-widest">SCENES {scene.sceneNumber}</div>
                                        </div>
                                        <div className="p-4 bg-gradient-to-b from-gray-900 to-black">
                                            <p className="text-gray-300 text-xs line-clamp-2 mb-4 min-h-[2.5em] italic font-serif">"{scene.description}"</p>
                                            
                                            <div className="flex gap-2 mb-4">
                                                <button onClick={() => handleGetTextVoice(idx)} disabled={sceneAudios[idx]?.loading} className="flex-1 py-2 bg-indigo-900/40 border border-indigo-700 text-indigo-300 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-900 hover:text-white transition disabled:opacity-50 uppercase tracking-widest">
                                                    {sceneAudios[idx]?.loading ? <Spinner className="h-3 w-3 m-0"/> : <AudioIcon />} GET VOICE
                                                </button>
                                                <button onClick={() => handlePlayAsmr(idx)} className="px-4 py-2 bg-purple-900/40 border border-purple-700 text-purple-300 rounded-xl text-[10px] font-bold flex items-center justify-center transition hover:bg-purple-600 hover:text-white" title="Play Scene Ambience">
                                                    <SoundIcon />
                                                </button>
                                                <button onClick={() => handleDownloadVoice(idx)} disabled={!sceneAudios[idx]?.url} className="px-4 py-2 bg-emerald-900/40 border border-emerald-700 text-emerald-300 rounded-xl text-[10px] font-bold flex items-center justify-center transition disabled:opacity-50 hover:bg-emerald-600 hover:text-white">
                                                    <DownloadIcon />
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                                                 <button onClick={() => handleCopySenseData(idx, 'prompt')} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition" disabled={!scene.promptUsed}>
                                                    {copyStatus === `prompt-${idx}` ? '✓ Copied' : <><CopyIcon /> Prompt</>}
                                                </button>
                                                <button onClick={() => handleCopySenseData(idx, 'json')} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-black uppercase tracking-tighter transition">
                                                    {copyStatus === `json-${idx}` ? '✓ Done' : <><JsonIcon /> JSON Code</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeResultTab === 'prompts' && (
                            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-700 space-y-4 animate-fade-in">
                                {scenes.map((scene, idx) => (
                                    <div key={idx} className="p-4 bg-black/40 rounded-xl border border-gray-800 group hover:border-orange-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Scenes {scene.sceneNumber} Prompt</span>
                                            <button onClick={() => handleCopySenseData(idx, 'prompt')} className="text-[10px] text-gray-600 hover:text-white transition">
                                                {copyStatus === `prompt-${idx}` ? 'Copied!' : 'Copy Code'}
                                            </button>
                                        </div>
                                        <p className="text-gray-400 text-xs font-mono break-words leading-relaxed selection:bg-orange-500/30">
                                            {scene.promptUsed}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeResultTab === 'metadata' && (
                            <div className="space-y-6 animate-fade-in">
                                {youtubeMeta ? (
                                    <div className="bg-gray-900 p-6 rounded-2xl border border-red-500/30 shadow-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <YouTubeIcon />
                                                <span className="text-sm font-black uppercase tracking-widest">YouTube Distribution Kit</span>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="bg-black/30 p-4 rounded-xl border border-gray-700">
                                                <div className="flex justify-between items-center mb-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                    <span>Video Title</span>
                                                    <button onClick={() => handleCopy(youtubeMeta.title, 'metaTitle')} className="text-cyan-500 hover:text-cyan-400 transition-colors uppercase font-bold">{copyStatus === 'metaTitle' ? 'Copied!' : 'Copy'}</button>
                                                </div>
                                                <p className="text-white font-bold">{youtubeMeta.title}</p>
                                            </div>
                                            <div className="bg-black/30 p-4 rounded-xl border border-gray-700">
                                                <div className="flex justify-between items-center mb-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                    <span>Description</span>
                                                    <button onClick={() => handleCopy(youtubeMeta.description, 'metaDesc')} className="text-cyan-500 hover:text-cyan-400 transition-colors uppercase font-bold">{copyStatus === 'metaDesc' ? 'Copied!' : 'Copy'}</button>
                                                </div>
                                                <p className="text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar font-serif leading-relaxed italic text-xs">{youtubeMeta.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-700 text-gray-500">
                                        <YouTubeIcon />
                                        <p className="mt-4 font-bold">No Metadata Generated</p>
                                        <button onClick={handleGenerateMetadata} className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs">Generate Now</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {scenes.length === 0 && !isProcessing && (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                                <span className="text-6xl mb-4 opacity-30">🚚</span>
                                <p className="text-lg">Production storyboard results will appear here.</p>
                                <p className="text-xs mt-2 italic">Add reference images and click "Get Go" to start.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MegaRcTruckGenerator;
