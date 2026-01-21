import React, { useState, useRef, useEffect } from 'react';
import { analyzeCharacterReference, generateImage, generateYouTubeMetadata, ImageReference, CharacterAnalysis, YouTubeMetadata, Character, StoryIdea, MvDetailedScene, generateDetailedMvScript, generateMvStoryIdeas } from '../services/geminiService.ts';
import { GoogleGenAI, Type } from "@google/genai";

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

// FIX: Completed StoryGeneratedMv component and added default export to resolve App.tsx import error.
const StoryGeneratedMv: React.FC = () => {
    const [scriptInput, setScriptInput] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('3D Pixar Animation');
    const [sceneCount, setSceneCount] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [scenes, setScenes] = useState<MvDetailedScene[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!scriptInput.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateDetailedMvScript(scriptInput, [], selectedStyle);
            setScenes(result);
        } catch (err) {
            setError("Failed to generate storyboard from script.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setScriptInput('');
        setScenes([]);
        setError(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <div className="w-full flex justify-end mb-4">
                <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
                    <TrashIcon /> Clear Project
                </button>
            </div>
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
                        Story Generated MV
                    </h2>
                    <p className="text-gray-400 text-sm italic">Paste your script directly to generate an MV storyboard.</p>
                    
                    <textarea 
                        value={scriptInput}
                        onChange={(e) => setScriptInput(e.target.value)}
                        placeholder="Paste your full story script here..."
                        className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-60 resize-none focus:ring-2 focus:ring-blue-500 outline-none shadow-inner text-sm"
                    />

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !scriptInput.trim()}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <Spinner /> : '🎬 Generate Storyboard'}
                    </button>
                    {error && <div className="p-3 bg-red-900/50 text-red-200 rounded text-xs">{error}</div>}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {scenes.length > 0 ? (
                        <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                            {scenes.map((scene, idx) => (
                                <div key={idx} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl">
                                    <h4 className="text-cyan-400 font-bold mb-2 uppercase text-xs tracking-widest">Sense {scene.scene_number}</h4>
                                    <p className="text-gray-300 text-sm leading-relaxed mb-4">"{scene.action}"</p>
                                    <div className="bg-black/30 p-3 rounded border border-gray-700">
                                        <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Visual Prompt</p>
                                        <p className="text-gray-400 text-xs font-mono">{scene.full_prompt}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
                            <span className="text-5xl">📄</span>
                            <p className="mt-4">Paste script on the left to start.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryGeneratedMv;