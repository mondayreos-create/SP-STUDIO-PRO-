import React, { useState, useCallback } from 'react';
import { generatePromptFromVideo } from '../services/geminiService.ts';

interface FileData {
  base64: string;
  mimeType: string;
  url: string;
}

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
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

const VideoToPrompt: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<FileData | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (sourceFile?.url) URL.revokeObjectURL(sourceFile.url);

      const url = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSourceFile({
            base64: base64String.split(',')[1],
            mimeType: file.type,
            url: url
        });
        setGeneratedPrompt(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read the video file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!sourceFile) {
      setError('Please upload a video to generate a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPrompt(null);

    try {
      const result = await generatePromptFromVideo(sourceFile.base64, sourceFile.mimeType);
      setGeneratedPrompt(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceFile]);

  const handleCopy = () => {
      if (generatedPrompt) {
          navigator.clipboard.writeText(generatedPrompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const handleClear = () => {
    if (sourceFile?.url) URL.revokeObjectURL(sourceFile.url);
    setSourceFile(null);
    setGeneratedPrompt(null);
    setError(null);
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full p-4 animate-fade-in">
      <ClearProjectButton onClick={handleClear} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Left Column: Source Video */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col h-[500px] shadow-xl">
            <h2 className="text-lg font-bold text-gray-300 mb-4 text-center flex items-center justify-center gap-2">
                <span>📹</span> Source Video
            </h2>
            <div className="flex-grow bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 relative flex items-center justify-center overflow-hidden hover:border-cyan-500/50 transition-all duration-300">
                {sourceFile ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <video 
                            src={sourceFile.url} 
                            controls
                            className="max-w-full max-h-full object-contain" 
                        />
                        <button 
                            onClick={handleClear}
                            className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110 z-10 backdrop-blur-sm"
                            title="Remove Video"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <label htmlFor="video-prompt-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-6 text-center group">
                        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                            <UploadIcon />
                        </div>
                        <span className="text-xl font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">Drag & drop a video</span>
                        <span className="text-sm text-gray-500 mt-2 mb-6 font-medium">or click to browse files</span>
                        <div className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-black shadow-lg transition-all transform active:scale-95 uppercase tracking-widest text-xs">
                            Browse Files
                        </div>
                        <span className="text-[10px] text-gray-600 mt-6 font-bold uppercase tracking-widest">Supports: MP4, MOV, WEBM</span>
                        <input id="video-prompt-upload" type="file" className="hidden" onChange={handleFileChange} accept="video/mp4, video/quicktime, video/webm" />
                    </label>
                )}
            </div>
        </div>

        {/* Right Column: Result Output */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col h-[500px] shadow-xl">
            <h2 className="text-lg font-bold text-gray-300 mb-4 text-center flex items-center justify-center gap-2">
                <span>✨</span> Generated Prompt
            </h2>
            <div className="flex-grow bg-gray-900 rounded-xl border border-gray-700 relative p-6 overflow-hidden flex flex-col shadow-inner">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="relative mb-6">
                            <Spinner className="h-16 w-16 text-cyan-500" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl animate-pulse">🧠</span>
                            </div>
                        </div>
                        <h4 className="text-white font-bold mb-2 animate-pulse">Analyzing video dynamics...</h4>
                        <p className="text-gray-500 text-xs max-w-[200px] mx-auto leading-relaxed">
                            Extracting 100% accurate visual style, motion, and atmosphere for your clone.
                        </p>
                    </div>
                ) : generatedPrompt ? (
                    <>
                        <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar text-gray-300 leading-relaxed text-sm font-mono bg-black/20 p-4 rounded-lg border border-white/5">
                            {generatedPrompt}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition shadow-md border border-gray-600 active:scale-95"
                            >
                                {copied ? <span className="text-green-400 font-bold">✓ Copied!</span> : <><CopyIcon /> Copy Prompt</>}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-center opacity-40">
                        <div className="w-24 h-24 border-4 border-dashed border-gray-700 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">✨</span>
                        </div>
                        <p className="font-bold">Your accurate video prompt will appear here</p>
                        <p className="text-xs mt-2 max-w-[250px]">Upload a video and click the button below to start the high-fidelity cloning process.</p>
                    </div>
                )}
            </div>
        </div>

      </div>

      {error && (
        <div className="mb-6 p-4 text-center bg-red-900/40 border border-red-700/50 text-red-200 rounded-2xl max-w-3xl mx-auto w-full shadow-lg animate-shake">
          <span className="font-bold mr-2">⚠️</span> {error}
        </div>
      )}

      {/* Sticky Bottom Control */}
      <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-xl border-t border-gray-700 p-6 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-30">
            <div className="flex justify-center max-w-5xl mx-auto">
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !sourceFile}
                    className="w-full sm:w-auto flex items-center justify-center gap-4 px-12 py-4 font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group uppercase tracking-[0.15em] text-sm"
                >
                    {isLoading ? (
                        <>
                            <Spinner className="h-6 w-6" />
                            <span>Cloning...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl group-hover:rotate-12 transition-transform">✨</span>
                            <span>Clone Video (Get Prompt)</span>
                        </>
                    )}
                </button>
            </div>
       </div>
    </div>
  );
};

export default VideoToPrompt;