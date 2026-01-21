
import React, { useState, useCallback, useEffect } from 'react';
import { generateImage } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import ControlPanel from './ControlPanel.tsx';
import StyleSelector from './StyleSelector.tsx';
import { styles } from './styles.ts';
import AspectRatioSelector, { AspectRatio } from './AspectRatioSelector.tsx';

const samplePrompts = [
    'A majestic lion wearing a crown, cinematic lighting.',
    'An astronaut riding a unicorn on the moon.',
    'A futuristic city with flying cars at sunset, synthwave style.',
    'A cozy library in a treehouse, fantasy concept art.',
    'A surreal painting of a clock melting in a desert.',
    'A photorealistic image of a cat DJing at a party.',
    'A delicious-looking burger with glowing mushrooms, digital art.',
    'A beautiful coral reef teeming with alien fish.',
    'A steampunk-inspired robot walking a dog.',
    'A serene Japanese garden in the middle of a bustling metropolis.'
];

const qualityOptions = [
    { label: 'Low', value: 'Low', desc: 'Standard Speed (1K)' },
    { label: 'Medium', value: 'Medium', desc: 'High Quality (2K)' },
    { label: 'High', value: 'High', desc: 'Ultra Quality (4K)' },
] as const;

type ImageQuality = typeof qualityOptions[number]['value'];

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full max-w-5xl mx-auto flex justify-end mb-4">
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200"
            aria-label="Clear current project"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const QualitySelector: React.FC<{ 
  selected: ImageQuality; 
  onSelect: (v: ImageQuality) => void;
  isDisabled: boolean;
}> = ({ selected, onSelect, isDisabled }) => {
    return (
        <div className="bg-gray-800/50 rounded-lg p-2 flex flex-col border border-gray-700 space-y-1 self-center md:self-start min-w-[120px]">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 pt-1 mb-1">Image Quality</label>
            <div className="flex flex-col gap-1">
                {qualityOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onSelect(opt.value)}
                        disabled={isDisabled}
                        className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 ${selected === opt.value ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent'}`}
                    >
                        <span className="block text-xs font-bold">{opt.label}</span>
                        <span className="block text-[8px] font-normal opacity-60 leading-tight">{opt.desc}</span>
                    </button>
                ))}
            </div>
            {selected !== 'Low' && (
               <div className="px-2 pt-1">
                  <p className="text-[8px] text-amber-500/80 italic leading-tight">* Requires Paid API Key</p>
               </div>
            )}
        </div>
    );
};


const ImageGenerator: React.FC = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [quality, setQuality] = useState<ImageQuality>('Low');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // GLOBAL PROJECT PERSISTENCE
  useEffect(() => {
    const handleSaveRequest = (e: any) => {
        if (e.detail.tool !== 'generate') return;
        const projectData = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            tool: 'generate',
            category: 'image',
            title: prompt.substring(0, 30) || "Image Generation",
            data: { prompt, aspectRatio, quality, generatedImage }
        };
        const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
        localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
    };

    const handleLoadRequest = (e: any) => {
        if (e.detail.tool !== 'generate') return;
        const d = e.detail.data;
        if (d.prompt) setPrompt(d.prompt);
        if (d.aspectRatio) setAspectRatio(d.aspectRatio);
        if (d.quality) setQuality(d.quality);
        if (d.generatedImage) setGeneratedImage(d.generatedImage);
        setError(null);
    };

    window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
    window.addEventListener('LOAD_PROJECT', handleLoadRequest);
    return () => {
        window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
    };
  }, [prompt, aspectRatio, quality, generatedImage]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Check for API key if Medium/High quality is selected
      if (quality !== 'Low') {
          const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
          if (!hasKey) {
              setError('Medium and High quality require a selected Paid API Key. Please open Settings and click "Change Key" to select one.');
              setIsLoading(false);
              return;
          }
      }

      const result = await generateImage(prompt, aspectRatio, quality);
      setGeneratedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, quality]);

  const handleGeneratePrompt = () => {
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleSelectStyle = (styleValue: string) => {
    setPrompt(prev => {
        if (prev.toLowerCase().includes(styleValue.toLowerCase())) {
            return prev;
        }
        return prev.trim() ? `${prev.trim()}, ${styleValue}` : styleValue;
    });
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const mimeType = generatedImage.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `generated-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    setGeneratedImage(null);
    setPrompt('');
    setAspectRatio('1:1');
    setQuality('Low');
    setError(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
        <ClearProjectButton onClick={handleClear} />
        <StyleSelector styles={styles} onSelectStyle={handleSelectStyle} isLoading={isLoading} />
        <div className="flex-grow grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-8 mb-4 items-start justify-center">
            <div className="w-full max-w-2xl mx-auto">
                 <ImagePanel
                    title="Generated Image"
                    imageDataUrl={generatedImage}
                    isLoading={isLoading}
                    />
            </div>
            <div className="flex flex-col gap-4">
                <AspectRatioSelector
                    selectedRatio={aspectRatio}
                    onSelectRatio={setAspectRatio}
                    isDisabled={isLoading}
                />
                <QualitySelector 
                    selected={quality}
                    onSelect={setQuality}
                    isDisabled={isLoading}
                />
            </div>
        </div>
       {error && (
        <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg max-w-5xl mx-auto w-full">
          {error}
        </div>
      )}
      <ControlPanel
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isReadyToSubmit={true}
        placeholder="Describe the image you want to create..."
        isEditedImageAvailable={!!generatedImage}
        onDownload={handleDownload}
        onGeneratePrompt={handleGeneratePrompt}
      />
    </div>
  );
};

export default ImageGenerator;
