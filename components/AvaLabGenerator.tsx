
import React, { useState, useCallback } from 'react';
import { generateImage } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

// Configuration Options
const styleOptions = ['3D Render', 'Anime', 'Realistic', 'Watercolor', 'Cyberpunk', 'Oil Painting', 'Sketch', 'Pixar Style', 'Claymation'];
const poseOptions = ['Portrait (Headshot)', 'Full Body', 'Dynamic Action', 'Candid', 'Sitting', 'Walking', 'T-Pose', 'Crossing Arms'];
const emotionOptions = ['Happy', 'Confident', 'Surprised', 'Determined', 'Sad', 'Angry', 'Mysterious', 'Neutral'];
const backgroundOptions = ['Solid Color', 'Photo Studio', 'Fantasy Environment', 'Cyberpunk City', 'Nature/Forest', 'Space/Galaxy', 'White Background', 'Green Screen'];
const lightingOptions = ['Soft Natural', 'Dramatic Studio', 'Neon', 'Golden Hour', 'Cinematic', 'Dark/Moody', 'Rim Lighting'];

const AvaLabGenerator: React.FC = () => {
    // State for inputs
    const [style, setStyle] = useState('3D Render');
    const [pose, setPose] = useState('Portrait (Headshot)');
    const [emotion, setEmotion] = useState('Confident');
    const [background, setBackground] = useState('Fantasy Environment');
    const [lighting, setLighting] = useState('Soft Natural');
    
    // Character Details State
    const [gender, setGender] = useState('Female');
    const [age, setAge] = useState('20s');
    const [hair, setHair] = useState('Long, Silver color');
    const [clothing, setClothing] = useState('Futuristic armor');
    const [extraDetails, setExtraDetails] = useState('');

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        const prompt = `Character Design: ${gender}, ${age}.
        Appearance: ${hair} hair, wearing ${clothing}. ${extraDetails}
        Emotion/Expression: ${emotion}.
        Pose: ${pose}.
        Environment/Background: ${background}.
        Lighting: ${lighting}.
        Art Style: ${style}. High quality, detailed, masterpiece.`;

        try {
            const result = await generateImage(prompt, '3:4'); // Portrait aspect ratio is usually better for characters
            setGeneratedImage(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate character');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `character-by-me-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setGeneratedImage(null);
        setError(null);
        setExtraDetails('');
    };

    const inputSelectClass = "w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5 mt-2";
    const cardClass = "bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-colors duration-300";

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Controls */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <span className="text-yellow-400">✨</span> 
                                <span className="text-white">Character by me</span> 
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">Fine-tune every aspect of your character.</p>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isLoading ? <Spinner /> : 'Launch App 🚀'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Style */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="text-2xl">🎨</div>
                                <div>
                                    <h3 className="font-bold text-white">Style Selection</h3>
                                    <p className="text-xs text-gray-500">3D, Anime, Realistic...</p>
                                </div>
                            </div>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputSelectClass}>
                                {styleOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        {/* Pose */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="text-2xl">💃</div>
                                <div>
                                    <h3 className="font-bold text-white">Pose Selection</h3>
                                    <p className="text-xs text-gray-500">Portrait, Action, Candid...</p>
                                </div>
                            </div>
                            <select value={pose} onChange={(e) => setPose(e.target.value)} className={inputSelectClass}>
                                {poseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        {/* Character Details (Spans 2 cols on md) */}
                        <div className={`${cardClass} md:col-span-2`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-2xl">👤</div>
                                <div>
                                    <h3 className="font-bold text-white">Character Details</h3>
                                    <p className="text-xs text-gray-500">Define gender, age, hair, clothing & more.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" placeholder="Gender" value={gender} onChange={e => setGender(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                                <input type="text" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                                <input type="text" placeholder="Hair Style/Color" value={hair} onChange={e => setHair(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                                <input type="text" placeholder="Clothing" value={clothing} onChange={e => setClothing(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                            </div>
                            <textarea 
                                placeholder="Extra details (e.g., scars, accessories, specific facial features)..." 
                                value={extraDetails}
                                onChange={e => setExtraDetails(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white resize-none h-16"
                            />
                        </div>

                        {/* Emotion */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="text-2xl">😃</div>
                                <div>
                                    <h3 className="font-bold text-white">Emotion</h3>
                                    <p className="text-xs text-gray-500">Happy, Confident, etc.</p>
                                </div>
                            </div>
                            <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className={inputSelectClass}>
                                {emotionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        {/* Background */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="text-2xl">🌄</div>
                                <div>
                                    <h3 className="font-bold text-white">Background</h3>
                                    <p className="text-xs text-gray-500">Environment setting.</p>
                                </div>
                            </div>
                            <select value={background} onChange={(e) => setBackground(e.target.value)} className={inputSelectClass}>
                                {backgroundOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        {/* Lighting */}
                        <div className={`${cardClass} md:col-span-2`}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="text-2xl">💡</div>
                                <div>
                                    <h3 className="font-bold text-white">Lighting</h3>
                                    <p className="text-xs text-gray-500">Soft, Dramatic, Neon, Studio.</p>
                                </div>
                            </div>
                            <select value={lighting} onChange={(e) => setLighting(e.target.value)} className={inputSelectClass}>
                                {lightingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <div className="text-red-400 text-sm text-center p-2 bg-red-900/20 rounded border border-red-800">{error}</div>}
                </div>

                {/* Right Result */}
                <div className="lg:col-span-5 flex flex-col">
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 h-full flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-4">Preview</h2>
                        <div className="flex-grow flex items-center justify-center bg-black rounded-lg overflow-hidden border border-gray-800 relative min-h-[400px]">
                            {generatedImage ? (
                                <img src={generatedImage} alt="Generated Character" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-600">
                                    <div className="text-6xl mb-2">👤</div>
                                    <p>Character Preview</p>
                                </div>
                            )}
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                                    <Spinner />
                                    <p className="text-purple-400 mt-2 font-semibold">Creating Character...</p>
                                </div>
                            )}
                        </div>
                        {generatedImage && (
                            <button 
                                onClick={handleDownload}
                                className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <span>💾</span> Download Character
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvaLabGenerator;
