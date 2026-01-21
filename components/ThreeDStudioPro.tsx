
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeCharacterReference, generateImage, ImageReference, CharacterAnalysis, generateVoiceover, PrebuiltVoice } from '../services/geminiService.ts';
import { GoogleGenAI, Type } from "@google/genai";

interface CharacterSlot {
    id: number;
    name: string;
    gender: string;
    age: string;
    description: string;
    image: ImageReference | null;
    analysis?: CharacterAnalysis;
}

interface GeneratedScene {
    sceneNumber: number;
    description: string;
    imageUrl?: string;
    isLoading: boolean;
    promptUsed?: string;
    voiceover?: string;
    character_detail?: string;
}

const cameraDirectives = [
    { id: 'static', label: 'Static', icon: '🔒', prompt: 'Fixed stationary camera, no movement, steady tripod shot.' },
    { id: 'zoom_in', label: 'Zoom In', icon: '🔍', prompt: 'Slow cinematic zoom into the subject.' },
    { id: 'zoom_out', label: 'Zoom Out', icon: '🔭', prompt: 'Slow cinematic pull-back zoom away from the subject.' },
    { id: 'pan_right', label: 'Pan Right', icon: '➡️', prompt: 'Horizontal camera pan from left to right.' },
    { id: 'pan_left', label: 'Pan Left', icon: '⬅️', prompt: 'Horizontal camera pan from right to left.' },
    { id: 'rotate_360', label: 'Rotate 360', icon: '🔄', prompt: '360-degree orbital rotation around the subject.' },
    { id: 'top_down', label: 'Top Down', icon: '⬇️', prompt: 'High angle bird-eye perspective looking straight down.' },
    { id: 'low_angle', label: 'Low Angle', icon: '⬆️', prompt: 'Dramatic low-angle shot looking up at the subjects.' },
];

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

const CopyIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const JsonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const loadingMessages = [
    "Rendering 3D models...",
    "Applying PBR textures...",
    "Calculating raytracing...",
    "Lighting the scene...",
    "Enforcing character vision...",
    "Optimizing polygons...",
    "Finalizing Pixar look...",
    "Polishing frame details..."
];

const RenderLoadingOverlay: React.FC<{ progress: number; messageIndex: number }> = ({ progress, messageIndex }) => (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10 animate-fade-in p-4 text-center">
        <div className="relative mb-4">
            <div className="w-12 h-12 border-4 border-purple-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-purple-500 rounded-full animate-spin"></div>
        </div>
        <h4 className="text-white font-bold text-[10px] mb-2 animate-pulse uppercase tracking-widest">{loadingMessages[messageIndex % loadingMessages.length]}</h4>
        <div className="w-full max-w-[100px] bg-gray-800 rounded-full h-1 mb-1 overflow-hidden border border-gray-700">
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">{Math.round(progress)}% Complete</span>
    </div>
);

const ThreeDStudioPro: React.FC = () => {
    const [characterCount, setCharacterCount] = useState(2);
    const [characters, setCharacters] = useState<CharacterSlot[]>(
        Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: '', gender: 'Male', age: '', description: '', image: null }))
    );
    const [synopsis, setSynopsis] = useState('');
    const [activeCameraId, setActiveCameraId] = useState('static');
    const [sceneCount, setSceneCount] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [scenes, setScenes] = useState<GeneratedScene[]>([]);
    const [copyState, setCopyState] = useState<string | null>(null);
    const [sceneAudios, setSceneAudios] = useState<Record<number, { url: string | null; loading: boolean }>>({});
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);
    
    // Scene Regeneration States
    const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
    const [isRegeneratingScene, setIsRegeneratingScene] = useState<number | null>(null);

    // Simulated per-frame loading state
    const [simulatedProgress, setSimulatedProgress] = useState<Record<number, number>>({});
    const [simulatedMessageIdx, setSimulatedMessageIdx] = useState<Record<number, number>>({});

    const stopSignal = useRef(false);

    // PERSISTENCE LISTENERS
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'three-d-studio-pro') return;
            handleSaveProject();
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'three-d-studio-pro') return;
            const d = e.detail.data;
            if (d.characterCount) setCharacterCount(d.characterCount);
            if (d.characters) setCharacters(d.characters);
            if (d.synopsis) setSynopsis(d.synopsis);
            if (d.sceneCount) setSceneCount(d.sceneCount);
            if (d.scenes) setScenes(d.scenes);
            if (d.activeCameraId) setActiveCameraId(d.activeCameraId);
            setShowHistory(false);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [characterCount, characters, synopsis, sceneCount, scenes, activeCameraId]);

    useEffect(() => {
        loadLocalHistory();
    }, []);

    const loadLocalHistory = () => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'three-d-studio-pro');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleSaveProject = () => {
        const projectData = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            tool: 'three-d-studio-pro',
            category: 'vip',
            title: synopsis ? synopsis.substring(0, 30) + "..." : "3D Project",
            data: {
                characterCount,
                characters,
                synopsis,
                sceneCount,
                scenes,
                activeCameraId
            }
        };
        
        const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
        localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        loadLocalHistory();
    };

    const handleImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setCharacters(prev => prev.map((c, i) => i === index ? {
                    ...c,
                    image: { base64: base64String.split(',')[1], mimeType: file.type }
                } : c));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateCharacter = (index: number, field: keyof CharacterSlot, value: string) => {
        const updated = [...characters];
        updated[index] = { ...updated[index], [field]: value };
        setCharacters(updated);
    };

    const handleStart = async () => {
        const activeChars = characters.slice(0, characterCount);
        if (activeChars.some(c => !c.image) || !synopsis.trim()) {
            setError("please setup style your image (សូមមេត្តា Update Image តួអង្គ និង ដាក់សាច់រឿងសង្ខេបមុននឹងចាប់ផ្តើម)");
            return;
        }
        setIsProcessing(true);
        setError(null);
        setScenes([]);
        setProgress(1);
        setSceneAudios({});
        stopSignal.current = false;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            setStatusText('Analyzing 3D Character Models (Parallel)...');
            const analysisPromises = activeChars.map(async (char, i) => {
                if (char.image) {
                    const analysis = await analyzeCharacterReference(char.image.base64, char.image.mimeType);
                    return { index: i, analysis };
                }
                return null;
            });

            const analyses = await Promise.all(analysisPromises);
            const updatedChars = [...characters];
            analyses.forEach(result => {
                if (result) {
                    const char = updatedChars[result.index];
                    updatedChars[result.index] = { 
                        ...char, 
                        analysis: result.analysis, 
                        description: char.description || result.analysis.characterDescription 
                    };
                }
            });
            setCharacters(updatedChars);
            setProgress(10);

            if (stopSignal.current) return;

            const charContext = updatedChars.slice(0, characterCount).map((c, idx) => 
                `Character ${idx + 1} (${c.name}): ${c.description}. Gender: ${c.gender}. Age: ${c.age}.`
            ).join('\n\n');

            const charNames = updatedChars.slice(0, characterCount).map(c => c.name).join(', ');
            
            const camDirective = cameraDirectives.find(c => c.id === activeCameraId)?.prompt || cameraDirectives[0].prompt;
            const consistencyInstruction = `STRICT 3D PRODUCTION RULES:\n1. Characters: Maintain 100% face and outfit consistency.\n2. Style: High-End 3D Animation Render.\n3. CAMERA DIRECTION: ${camDirective}`;

            setStatusText('Architecting 3D Storyboard (Prompts First)...');
            const SCRIPT_BATCH_SIZE = 50; 
            const numScriptBatches = Math.ceil(sceneCount / SCRIPT_BATCH_SIZE);
            let fullScript: any[] = [];

            for (let b = 0; b < numScriptBatches; b++) {
                if (stopSignal.current) break;
                const startNum = b * SCRIPT_BATCH_SIZE + 1;
                const countInBatch = Math.min(SCRIPT_BATCH_SIZE, sceneCount - fullScript.length);
                setStatusText(`Scripting Batch ${b + 1}/${numScriptBatches}...`);

                const scriptPrompt = `Generate a storyboard script for Senses ${startNum} to ${startNum + countInBatch - 1} of a total ${sceneCount}.\nSYNOPSIS: ${synopsis}\nCAST: ${charContext}\n${consistencyInstruction}\nOUTPUT JSON ARRAY: [ { "sceneNumber": number, "action": string, "consistentContext": string, "voiceover": string } ]`;

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
                                    consistentContext: { type: Type.STRING },
                                    voiceover: { type: Type.STRING }
                                }
                            }
                        }
                    }
                });

                const batch = JSON.parse(response.text || "[]");
                fullScript = [...fullScript, ...batch];
                setProgress(10 + Math.round(((b + 1) / numScriptBatches) * 20));
            }

            if (stopSignal.current) return;

            const initialScenes: GeneratedScene[] = fullScript.map(s => ({
                sceneNumber: s.sceneNumber,
                description: s.action,
                voiceover: s.voiceover || s.action,
                character_detail: charNames,
                isLoading: true,
                promptUsed: `Style: 3D Pixar Animation Render. ${consistencyInstruction}\nCast: ${charContext}\nAction: ${s.action}\nEnvironment: ${s.consistentContext}`
            }));
            setScenes(initialScenes);
            setProgress(30);

            const RENDER_CHUNK_SIZE = 2;
            for (let i = 0; i < initialScenes.length; i += RENDER_CHUNK_SIZE) {
                if (stopSignal.current) break;
                
                const chunk = initialScenes.slice(i, i + RENDER_CHUNK_SIZE);
                setStatusText(`Rendering Senses ${i + 1}-${Math.min(i + RENDER_CHUNK_SIZE, sceneCount)}...`);

                await Promise.all(chunk.map(async (scene) => {
                    await handleRenderSingle(scene.sceneNumber - 1);
                }));

                setProgress(30 + Math.round(((i + chunk.length) / initialScenes.length) * 70));
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Production error.");
        } finally {
            setIsProcessing(false);
            setStatusText('');
        }
    };

    const handleRenderAll = async () => {
        if (isProcessing || scenes.length === 0) return;
        setIsProcessing(true);
        setError(null);
        setProgress(0);
        stopSignal.current = false;

        try {
            const scenesToRender = scenes.filter(s => !s.imageUrl);
            if (scenesToRender.length === 0) {
                 setIsProcessing(false);
                 return;
            }

            const RENDER_CHUNK_SIZE = 2;
            for (let i = 0; i < scenesToRender.length; i += RENDER_CHUNK_SIZE) {
                if (stopSignal.current) break;
                
                const chunk = scenesToRender.slice(i, i + RENDER_CHUNK_SIZE);
                setStatusText(`Rendering Senses ${chunk.map(c => c.sceneNumber).join(', ')}...`);

                await Promise.all(chunk.map(async (scene) => {
                    await handleRenderSingle(scene.sceneNumber - 1);
                }));

                setProgress(Math.round(((i + chunk.length) / scenesToRender.length) * 100));
            }

        } catch (err) {
            setError("Auto-render failed.");
        } finally {
            setIsProcessing(false);
            setStatusText('');
        }
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

    const handleRegenerateSenseImage = async (index: number) => {
        await handleRenderSingle(index);
    };

    const handleRegeneratePromptWithExtension = async (idx: number) => {
        const scene = scenes[idx]; 
        setIsRegeneratingScene(idx);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const charContext = characters.slice(0, characterCount).map((c, i) => 
                `Character ${i + 1}: ${c.name} - ${c.description}`
            ).join('\n\n');

            const camDirective = cameraDirectives.find(c => c.id === activeCameraId)?.prompt || cameraDirectives[0].prompt;
            const consistencyInstruction = `
            CRITICAL SYSTEM INSTRUCTION: Without changing the characters or the original format, from beginning to end.
            1. Character Faces & Characteristics: Please keep the characters’ faces and characteristics exactly the same in every scene.
            2. Project Scope: Please maintain everything exactly the same from Scene 1 to Scene ${scenes.length} — keep the characters’ faces and characteristics consistent.
            3. CAMERA DIRECTION: ${camDirective}
            `;

            const promptForAi = `
                REGENERATE SINGLE SCENE PROMPT: Scene #${scene.sceneNumber}
                STORY CONTEXT: ${synopsis}
                CURRENT ACTION: ${scene.description}
                CHARACTERS (UPDATED):
                ${charContext}
                ${consistencyInstruction}
                
                TASK: Rewrite the scene action and generate a NEW detailed 3D video generation prompt. 
                OUTPUT JSON: { "action": "new description", "voiceover": "new voiceover", "visualStyleContext": "new visual context" }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptForAi,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING },
                            voiceover: { type: Type.STRING },
                            visualStyleContext: { type: Type.STRING }
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "{}");
            
            if (result.action) {
                const fullPrompt = `Style: 3D Pixar Animation Render. ${consistencyInstruction}\nCast: ${charContext}\nAction: ${result.action}\nEnvironment: ${result.visualStyleContext}`;
                const updatedScenes = [...scenes];
                updatedScenes[idx] = {
                    ...scene,
                    description: result.action,
                    voiceover: result.voiceover || result.action,
                    promptUsed: fullPrompt,
                    isLoading: true,
                    imageUrl: undefined
                };
                setScenes(updatedScenes);
                
                await handleRenderSingle(idx);
                setEditingSceneIndex(null);
            }
        } catch (err) {
            setError("Prompt regeneration failed.");
        } finally {
            setIsRegeneratingScene(null);
        }
    };

    const handleGetTextVoice = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
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
            link.download = `Sense_${index + 1}_Voice.wav`;
            link.click();
        }
    };

    const handleDownloadImage = (url: string, num: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `3D_Sense_${num}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStop = () => { stopSignal.current = true; setIsProcessing(false); };
    
    const handleCopySenseData = (index: number, mode: 'json' | 'prompt') => {
        const scene = scenes[index];
        if (!scene) return;
        if (mode === 'json') {
            const exportData = { sense: scene.description, voiceover: scene.voiceover || scene.description, character: scene.character_detail || "", prompt: scene.promptUsed || "" };
            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        } else {
            navigator.clipboard.writeText(scene.promptUsed || "");
        }
        setCopyState(`${mode}-${index}`);
        setTimeout(() => setCopyState(null), 2000);
    };

    const handleClear = () => {
        setCharacters(Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: '', gender: 'Male', age: '', description: '', image: null })));
        setSynopsis('');
        setScenes([]);
        setError(null);
        setProgress(0);
        setSceneCount(100);
        setEditingSceneIndex(null);
        setIsRegeneratingScene(null);
        setSceneAudios({});
        setStatusText('');
        setCharacterCount(2);
        setCopyState(null);
        setSimulatedProgress({});
        setSimulatedMessageIdx({});
        setActiveCameraId('static');
    };

    const handleReloadHistory = (project: any) => {
        window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: project }));
        setShowHistory(false);
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
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 border ${showHistory ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
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
                <div className="w-full bg-gray-900/90 border-2 border-purple-500/50 p-6 rounded-2xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <HistoryIcon /> 3D Production History Vault
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
                                        <span className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded font-black border border-purple-800/50 uppercase">#{localHistory.length - idx}</span>
                                        <span className="text-[9px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">3D Content</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic">"{project.data.synopsis}"</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-purple-400 font-black uppercase">Click to Reload ➜</span>
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
                <div className="bg-[#1a1f2e] p-6 rounded-2xl border border-gray-800 h-fit space-y-6 shadow-xl">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🧊</span>
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">3D - Studio (Pro)</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">1. Characters Model Setup (1-6)</label>
                            <div className="flex items-center bg-[#0f172a] rounded-xl border border-gray-700 overflow-hidden mb-4">
                                <button onClick={() => setCharacterCount(Math.max(1, characterCount - 1))} className="px-5 py-3 bg-[#1e293b] hover:bg-gray-700 text-white font-bold transition">-</button>
                                <input readOnly value={characterCount} className="w-full text-center bg-transparent outline-none text-white font-black text-xl" />
                                <button onClick={() => setCharacterCount(Math.min(6, characterCount + 1))} className="px-5 py-3 bg-[#1e293b] hover:bg-gray-700 text-white font-bold transition">+</button>
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                {characters.slice(0, characterCount).map((char, index) => (
                                    <div key={char.id} className="p-3 bg-[#252b3d] rounded-xl border border-gray-700/50 shadow-inner flex flex-col gap-3 group">
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 bg-[#0f172a] rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                {char.image ? <img src={`data:${char.image.mimeType};base64,${char.image.base64}`} alt="Ref" className="w-full h-full object-cover" /> : <label className="cursor-pointer text-[10px] text-gray-500 font-bold uppercase p-2 text-center leading-tight">📷 Upload Model</label>}
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <div className="flex-grow">
                                                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Model {index + 1}</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input placeholder="Name" value={char.name} onChange={e => handleUpdateCharacter(index, 'name', e.target.value)} className="w-full bg-[#0f172a] border-none rounded p-1.5 text-xs text-white" />
                                                    <select value={char.gender} onChange={e => handleUpdateCharacter(index, 'gender', e.target.value)} className="w-full bg-[#0f172a] border-none rounded p-1.5 text-xs text-white"><option>Male</option><option>Female</option></select>
                                                </div>
                                            </div>
                                        </div>
                                        <textarea value={char.description} onChange={(e) => handleUpdateCharacter(index, 'description', e.target.value)} placeholder="Detailed 3D traits..." className="w-full bg-[#0f172a] border-none rounded-lg p-2 text-[10px] text-gray-300 resize-none h-12 focus:ring-1 focus:ring-purple-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CAMERA DIRECTING PANEL */}
                        <div className="p-4 bg-gray-900/80 rounded-2xl border border-indigo-500/30">
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
                                <span className="mr-1">🎥</span> Camera Directing (3D View)
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {cameraDirectives.map((cam) => (
                                    <button
                                        key={cam.id}
                                        onClick={() => setActiveCameraId(cam.id)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all transform active:scale-95 ${activeCameraId === cam.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                        title={cam.prompt}
                                    >
                                        <span className="text-lg mb-1">{cam.icon}</span>
                                        <span className="text-[8px] font-black uppercase text-center leading-none">{cam.label}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-500 mt-4 italic text-center">Directed camera path will be enforced across all senses.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">2. Story Synopsis (សាច់រឿងសង្ខេប)</label>
                            <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Describe the story journey..." className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-4 text-white h-40 resize-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner text-sm" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">3. Total Senses (1-500)</label>
                            <input type="number" min="1" max="500" value={sceneCount} onChange={(e) => setSceneCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white font-black text-center text-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>

                        {isProcessing ? <button onClick={handleStop} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 text-lg">STOP PRODUCTION</button> : <button onClick={handleStart} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white font-black rounded-xl shadow-xl transition transform active:scale-[0.98] text-lg flex items-center justify-center gap-3">🚀 Get Go (Auto Create) 🚀</button>}
                    </div>
                </div>

                {/* Right Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#1a1f2e] p-5 rounded-2xl border border-gray-700 sticky top-0 z-10 backdrop-blur shadow-xl flex justify-between items-center">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Project Canvas ({scenes.length} Senses)</h3>
                        <div className="flex gap-2">
                             <button 
                                onClick={handleRenderAll} 
                                disabled={isProcessing || scenes.length === 0}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition border border-indigo-400 flex items-center gap-2 disabled:opacity-50"
                             >
                                <SparklesIcon /> Auto Render All Senses
                             </button>
                             {scenes.length > 0 && (
                                <button onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(scenes, null, 2));
                                    setCopyState('all-json');
                                    setTimeout(() => setCopyState(null), 2000);
                                }} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold transition border border-gray-700 flex items-center gap-2">
                                    {copyState === 'all-json' ? '✓' : <JsonIcon />} Project JSON
                                </button>
                             )}
                        </div>
                    </div>

                    {isProcessing && scenes.length === 0 && (
                        <div className="bg-[#141b2d] p-12 rounded-[2rem] border border-purple-500/30 shadow-[0_0_80px_rgba(168,85,247,0.15)] flex flex-col items-center justify-center animate-fade-in min-h-[500px]">
                            <div className="relative w-48 h-48 mb-10">
                                 <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-800" />
                                    <circle 
                                        cx="96" cy="96" r="88" 
                                        stroke="currentColor" 
                                        strokeWidth="14" 
                                        fill="transparent" 
                                        className="text-purple-500 transition-all duration-700 ease-out" 
                                        strokeDasharray={2 * Math.PI * 88} 
                                        strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)} 
                                        strokeLinecap="round" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">{progress}%</span>
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 uppercase tracking-widest mb-3 animate-pulse text-center">
                                {statusText || "Scripting 4D Senses..."}
                            </h3>
                            <p className="text-xs text-gray-500 font-black uppercase tracking-[0.4em] mb-8">3D Production Pipeline Active</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-[#1a1f2e] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col group hover:border-purple-500/50 transition-all duration-300">
                                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                    {scene.imageUrl ? <img src={scene.imageUrl} className="w-full h-full object-cover" alt={`Sense ${scene.sceneNumber}`} /> : (
                                        <div className="flex flex-col items-center gap-3">
                                            {scene.isLoading ? (
                                                <RenderLoadingOverlay 
                                                    progress={simulatedProgress[idx] || 0} 
                                                    messageIndex={simulatedMessageIdx[idx] || 0} 
                                                />
                                            ) : (
                                                <button onClick={() => handleRenderSingle(idx)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-purple-400 text-xs font-bold rounded-lg border border-gray-700 shadow-lg">RENDER ART</button>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-black border border-gray-700 shadow-md">SENSE {scene.sceneNumber}</div>
                                    {scene.imageUrl && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                            <button onClick={() => handleDownloadImage(scene.imageUrl!, scene.sceneNumber)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110 shadow-xl" title="Download Image"><DownloadIcon /></button>
                                            <button onClick={() => handleRegenerateSenseImage(idx)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white transition transform hover:scale-110 shadow-xl" title="Get New Image"><RefreshIcon /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-grow flex flex-col bg-gradient-to-b from-[#1a1f2e] to-[#0f172a]">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase flex gap-2"><span>Character:</span><span className="text-indigo-400">{scene.character_detail}</span></div>
                                        <button 
                                            onClick={() => setEditingSceneIndex(editingSceneIndex === idx ? null : idx)}
                                            className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-1 font-bold ${editingSceneIndex === idx ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'}`}
                                        >
                                            {isRegeneratingScene === idx ? <Spinner className="h-3 w-3 m-0"/> : <RefreshIcon className="h-3 w-3" />}
                                            {editingSceneIndex === idx ? 'Close Ext' : 'Get New Prompt'}
                                        </button>
                                    </div>

                                    {editingSceneIndex === idx && (
                                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl mb-4 animate-slide-down">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xl">🧬</span>
                                                <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Character Consistency Verification</h4>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mb-4 italic leading-tight">
                                                Adjust character details below to ensure 100% facial consistency for this specific sense.
                                            </p>
                                            <div className="grid grid-cols-1 gap-3 mb-4">
                                                {characters.slice(0, characterCount).map((c, cIdx) => (
                                                    <div key={c.id} className="bg-black/40 p-2 rounded border border-gray-700">
                                                        <input 
                                                            value={c.name} onChange={e => handleUpdateCharacter(cIdx, 'name', e.target.value)}
                                                            className="bg-transparent border-none text-[10px] font-black text-indigo-400 focus:ring-0 p-0 mb-1"
                                                            placeholder="Model Name"
                                                        />
                                                        <textarea 
                                                            value={c.description} onChange={(e) => handleUpdateCharacter(cIdx, 'description', e.target.value)}
                                                            className="w-full bg-transparent border-none text-[9px] text-gray-300 h-10 resize-none focus:ring-0 p-0"
                                                            placeholder="Tweak facial/outfit features..."
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => setEditingSceneIndex(null)} className="text-[10px] text-gray-500 hover:text-white font-black uppercase">Cancel</button>
                                                <button 
                                                    onClick={() => handleRegeneratePromptWithExtension(idx)}
                                                    disabled={isRegeneratingScene === idx}
                                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black shadow-xl flex items-center gap-2 transform active:scale-95 transition"
                                                >
                                                    {isRegeneratingScene === idx ? <Spinner className="h-3 w-3 m-0" /> : 'Confirm & Regenerate'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 mb-4"><p className="text-gray-300 text-xs leading-relaxed italic border-l-2 border-purple-500 pl-4">"{scene.description}"</p></div>
                                    <div className="grid grid-cols-2 gap-2 mb-4"><button onClick={() => handleGetTextVoice(idx)} disabled={sceneAudios[idx]?.loading} className="flex-1 py-2 bg-purple-900/40 border border-purple-700 text-purple-300 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5 hover:bg-purple-900 disabled:opacity-50">{sceneAudios[idx]?.loading ? <Spinner className="h-3 w-3 m-0"/> : <AudioIcon />} GET VOICE</button><button onClick={handleDownloadVoice(idx)} disabled={!sceneAudios[idx]?.url} className="px-3 py-1.5 bg-emerald-900/40 border border-emerald-700 text-emerald-300 rounded text-[10px] font-bold flex items-center justify-center transition disabled:opacity-50 hover:bg-emerald-600 hover:text-white">
                                            <DownloadIcon />
                                        </button></div>
                                    <div className="flex justify-between items-center border-t border-gray-800 pt-3"><button onClick={() => handleCopySenseData(idx, 'prompt')} className="text-[10px] text-gray-500 hover:text-white transition font-black uppercase flex items-center gap-1" disabled={!scene.promptUsed}>{copyState === `prompt-${idx}` ? '✓ Copied' : <><CopyIcon /> Prompt</>}</button><button onClick={() => handleCopySenseData(idx, 'json')} className="text-[10px] text-purple-400 hover:text-purple-300 transition font-black uppercase">{copyState === `json-${idx}` ? '✓ Done' : <><JsonIcon /> JSON Code</>}</button></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThreeDStudioPro;
