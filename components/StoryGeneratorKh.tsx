
import React, { useState, useCallback, useEffect, useRef } from 'react';
// COMMENT: Fixed imports to use implemented types and functions from geminiService.
import { generateStory, StoryScene, Character as ServiceCharacter, generateCharacters, generateStoryIdeas, StoryIdea, generateImage, generateImageWithReferences, generateVoiceover, PrebuiltVoice, ImageReference, generateYouTubeMetadata, YouTubeMetadata, withRetry } from '../services/geminiService.ts';
import { styles, Style } from './styles.ts';
import { GoogleGenAI, Type } from "@google/genai";
import StoryPanel from './StoryPanel.tsx';

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

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <TrashIcon /> Start Over | ចាប់ផ្ដើមថ្មី
        </button>
    </div>
);

const StoryGeneratorKh: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [topic, setTopic] = useState('');
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<StoryIdea | null>(null);
    const [style, setStyle] = useState('3D Pixar/Disney Style');
    const [sceneCount, setSceneCount] = useState(5);
    const [characters, setCharacters] = useState<ServiceCharacter[]>([]);
    const [story, setStory] = useState<StoryScene[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const handleClear = () => {
        setStep(1);
        setTopic('');
        setStoryIdeas([]);
        setSelectedIdea(null);
        setCharacters([]);
        setStory(null);
        setError(null);
    };

    const handleGenerateIdeas = async () => {
        if (!topic.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const ideas = await generateStoryIdeas(`Khmer story ideas about: ${topic}`);
            setStoryIdeas(ideas);
        } catch (err) {
            setError("Failed to generate ideas.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectIdea = (idea: StoryIdea) => {
        setSelectedIdea(idea);
        setStep(2);
    };

    const handleCreateStory = async () => {
        if (!selectedIdea) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateStory({
                topic: `${selectedIdea.title}: ${selectedIdea.summary}`,
                style: style,
                sceneCount: sceneCount,
                characters: characters
            });
            setStory(result);
            setStep(3);
        } catch (err) {
            setError("Story production failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col">
            <ClearProjectButton onClick={handleClear} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                        Story Generator KH
                    </h2>

                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <textarea 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)} 
                                placeholder="បញ្ចូលប្រធានបទរឿងរបស់អ្នក..." 
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white h-48 resize-none outline-none focus:ring-2 focus:ring-purple-500" 
                            />
                            <button onClick={handleGenerateIdeas} disabled={isLoading || !topic.trim()} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2">
                                {isLoading ? <Spinner /> : '💡'} បង្កើតគំនិតរឿង
                            </button>
                            <div className="space-y-3">
                                {storyIdeas.map((idea, idx) => (
                                    <div key={idx} className="bg-gray-900 p-3 rounded border border-gray-700 hover:border-purple-500 transition cursor-pointer" onClick={() => handleSelectIdea(idea)}>
                                        <h4 className="font-bold text-white text-sm">{idea.title}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">{idea.summary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-white">{selectedIdea?.title}</h3>
                            <p className="text-sm text-gray-400 italic">"{selectedIdea?.summary}"</p>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Scene Count</label>
                                <input type="number" min="1" max="10" value={sceneCount} onChange={e => setSceneCount(parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-center" />
                            </div>

                            <button onClick={handleCreateStory} disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-3">
                                {isLoading ? <Spinner /> : '🎬'} ចាប់ផ្ដើមផលិត 🚀
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center p-6 space-y-4 animate-fade-in">
                            <div className="text-4xl">✅</div>
                            <h3 className="text-xl font-bold text-white">ការផលិតត្រូវបានបញ្ចប់</h3>
                            <button onClick={handleClear} className="w-full py-2 bg-gray-900 text-red-400 rounded-lg border border-red-900/30">ចាប់ផ្ដើមរឿងថ្មី</button>
                        </div>
                    )}
                </div>

                <div className="w-full">
                    <StoryPanel story={story} isLoading={isLoading} style={style} characters={[]} progress={progress} />
                </div>
            </div>
        </div>
    );
};

export default StoryGeneratorKh;
