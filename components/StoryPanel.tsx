
import { StoryScene, generateVoiceover } from '../services/geminiService.ts';
import React, { useState, useMemo, useCallback, useEffect } from 'react';

// --- Icons ---
const StoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const Spinner: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
  <svg className={`animate-spin ${className} text-cyan-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const AudioIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const JsonIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
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

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

interface UICharacter {
    name: string;
    description: string;
    [key: string]: any;
}

// --- SceneItem Component ---
interface SceneItemProps {
  scene: StoryScene;
  style?: string;
  characters?: UICharacter[];
}

const SceneItem: React.FC<SceneItemProps> = ({ scene, style, characters }) => {
    const [isNarrationLoading, setIsNarrationLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [copiedVo, setCopiedVo] = useState(false);
    const [copiedMax, setCopiedMax] = useState(false);
    
    const [editablePrompt, setEditablePrompt] = useState(scene.prompt);

    useEffect(() => {
        setEditablePrompt(scene.prompt);
    }, [scene.prompt]);
    
    const playAudio = useCallback(async (base64String: string) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContext({ sampleRate: 24000 });
            const decodedBytes = decode(base64String);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => { audioContext.close(); };
            source.start();
        } catch (e) {
            setError("Could not play audio.");
        }
    }, []);

    const handleGenerateNarration = async () => {
        const narrationText = scene.voiceover || scene.scene_description?.line || "";
        if (!narrationText) {
            setError("No narration text available.");
            return;
        }
        setIsNarrationLoading(true);
        setError(null);
        try {
            const audioB64 = await generateVoiceover(narrationText);
            playAudio(audioB64);
        } catch (err) {
            setError('Narration failed');
        } finally {
            setIsNarrationLoading(false);
        }
    };

    const handleCopyVo = () => {
        navigator.clipboard.writeText(scene.voiceover);
        setCopiedVo(true);
        setTimeout(() => setCopiedVo(false), 2000);
    };

    const handleCopyMax = () => {
        const combined = `Prompt: ${scene.prompt}\n\nText-for-Voice-over: ${scene.voiceover}`;
        navigator.clipboard.writeText(combined);
        setCopiedMax(true);
        setTimeout(() => setCopiedMax(false), 2000);
    };

    const descriptionText = scene.scene_description?.line || "No description provided.";
    const hasDialog = scene.dialog && Array.isArray(scene.dialog) && scene.dialog.length > 0;

    return (
        <div className="bg-gray-800 p-5 rounded-xl mb-6 border border-gray-700 shadow-xl hover:border-cyan-500/50 transition-all">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-cyan-400 font-black text-lg tracking-tight">
                        Scene {scene.scene_number || '?'}
                    </h3>
                    <button 
                        onClick={handleCopyMax}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full transition-all border shadow-lg ${copiedMax ? 'bg-orange-600 border-orange-400 text-white' : 'bg-gradient-to-r from-orange-500 to-red-600 border-orange-400/50 text-white hover:scale-105 active:scale-95'}`}
                    >
                        <SparklesIcon className="h-3 w-3" />
                        {copiedMax ? 'MAX COPIED!' : 'MAX PROMPT'}
                    </button>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleGenerateNarration} 
                        disabled={isNarrationLoading}
                        className="p-2 bg-gray-700 hover:bg-cyan-600 rounded-lg text-gray-300 hover:text-white transition shadow-sm"
                        title="Play Narration"
                    >
                        {isNarrationLoading ? <Spinner /> : <AudioIcon />}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                 {/* Visual/Prompt Column */}
                <div className="bg-black/30 p-4 rounded-xl border border-gray-700/50 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1">
                            <span>🖼️</span> Visual Concept
                        </h4>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(editablePrompt);
                                setCopiedPrompt(true);
                                setTimeout(() => setCopiedPrompt(false), 2000);
                            }}
                            className="text-[10px] font-bold bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition text-gray-300"
                        >
                            {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 font-mono leading-relaxed mb-4 flex-grow">
                        {editablePrompt}
                    </p>
                    <div className="text-[10px] text-gray-600 border-t border-gray-700 pt-3 italic">
                        Visual Description: {descriptionText}
                    </div>
                </div>

                {/* Voice-over Column */}
                <div className="bg-[#1e293b] p-4 rounded-xl border border-purple-500/20 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                            <span>🎙️</span> Text-for-Voice-over
                        </h4>
                        <button 
                            onClick={handleCopyVo}
                            className="text-[10px] font-bold bg-gray-700 hover:bg-purple-600 px-2 py-1 rounded transition text-gray-300 hover:text-white"
                        >
                            {copiedVo ? 'Copied!' : 'Copy VO'}
                        </button>
                    </div>
                    <p className="text-sm text-purple-100 leading-relaxed font-serif bg-black/20 p-3 rounded-lg border border-purple-500/10 flex-grow">
                        {scene.voiceover}
                    </p>
                </div>
            </div>

            {hasDialog && (
                <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700 space-y-2 mt-2">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 mb-2">Dialogue Beats</h4>
                    {scene.dialog.map((d, i) => (
                        <div key={i} className="flex gap-3 text-xs leading-relaxed">
                            <span className="font-bold text-cyan-500 w-24 shrink-0 text-right">{d.character}:</span>
                            <span className="text-gray-300">{d.line}</span>
                        </div>
                    ))}
                </div>
            )}
            
            {error && <div className="mt-2 text-xs text-red-400 bg-red-900/10 p-2 rounded text-center">{error}</div>}
        </div>
    );
};

// --- Main StoryPanel Component ---
interface StoryPanelProps {
  story: StoryScene[] | null;
  isLoading: boolean;
  style?: string;
  characters?: UICharacter[];
  progress?: number;
}

const StoryPanel: React.FC<StoryPanelProps> = ({ story, isLoading, style, characters, progress = 0 }) => {
    const [copiedAllJson, setCopiedAllJson] = useState(false);

    const handleCopyAllJson = () => {
        if (!story) return;
        navigator.clipboard.writeText(JSON.stringify(story, null, 2));
        setCopiedAllJson(true);
        setTimeout(() => setCopiedAllJson(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-12 bg-gray-800/30 rounded-xl border border-gray-700 min-h-[400px] animate-pulse">
                 <div className="relative w-28 h-28 mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-700" />
                        <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-cyan-500 transition-all duration-500" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - progress / 100)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white">{progress}%</div>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Architecting Animation Scenes...</h3>
                 <p className="text-gray-500 text-xs text-center max-w-xs uppercase tracking-widest font-bold">Smart Conciseness Applied (~230 words/scene)</p>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-12 bg-gray-800/30 rounded-xl border border-gray-700 min-h-[400px] text-center">
                <StoryIcon />
                <h3 className="text-xl font-bold text-gray-400 mt-2">Ready to Animate</h3>
                <p className="text-gray-500 text-sm mt-1">Select your scene range and click generate on the left.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Scene Storyboard</h2>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleCopyAllJson}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border shadow-sm ${copiedAllJson ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                    >
                        <JsonIcon className="h-4 w-4" />
                        {copiedAllJson ? 'COPIED!' : 'COPY JSON CODE'}
                    </button>
                    <span className="text-[10px] font-black bg-cyan-900/50 text-cyan-400 border border-cyan-700 px-3 py-1 rounded-full uppercase tracking-widest">
                        {story.length} Parts Produced
                    </span>
                </div>
            </div>
            <div className="space-y-4">
                {story.map((scene, index) => (
                    <SceneItem key={index} scene={scene} style={style} characters={characters} />
                ))}
            </div>
        </div>
    );
};

export default StoryPanel;
