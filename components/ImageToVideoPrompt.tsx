
import React, { useState, useCallback } from 'react';
import { generateVideoPromptFromImage } from '../services/geminiService.ts';

interface FileData {
  base64: string;
  mimeType: string;
  url: string;
}

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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

const ImageToVideoPrompt: React.FC = () => {
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
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!sourceFile) {
      setError('Please upload an image to generate a video prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPrompt(null);

    try {
      const result = await generateVideoPromptFromImage(sourceFile.base64, sourceFile.mimeType);
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

  const isDisabled = isLoading || !sourceFile;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
      <ClearProjectButton onClick={handleClear} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Left Column: Source Image */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col h-[500px]">
            <h2 className="text-lg font-bold text-gray-300 mb-4 text-center">Source Image</h2>
            <div className="flex-grow bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 relative flex items-center justify-center overflow-hidden hover:border-gray-500 transition-colors">
                {sourceFile ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <img 
                            src={sourceFile.url} 
                            alt="Source" 
                            className="max-w-full max-h-full object-contain" 
                        />
                        <button 
                            onClick={handleClear}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110"
                            title="Remove Image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <label htmlFor="image-to-video-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-6 text-center group">
                        <UploadIcon />
                        <span className="text-xl font-semibold text-gray-300 group-hover:text-white transition-colors">Drag & drop an image</span>
                        <span className="text-sm text-gray-500 mt-2 mb-4">or</span>
                        <div className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition shadow-md">
                            Browse Files
                        </div>
                        <span className="text-xs text-gray-600 mt-4">Supports: PNG, JPG, GIF, WEBP</span>
                        <input id="image-to-video-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp, image/gif" />
                    </label>
                )}
            </div>
        </div>

        {/* Right Column: Result Output */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col h-[500px]">
            <h2 className="text-lg font-bold text-gray-300 mb-4 text-center">Generated Video Prompt</h2>
            <div className="flex-grow bg-gray-900 rounded-lg border border-gray-700 relative p-4 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Spinner className="h-10 w-10 text-cyan-500 mb-4" />
                        <p className="animate-pulse">Analyzing image motion potential...</p>
                    </div>
                ) : generatedPrompt ? (
                    <>
                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar text-gray-200 leading-relaxed text-sm font-mono whitespace-pre-wrap">
                            {generatedPrompt}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition shadow-sm"
                            >
                                {copied ? <span className="text-green-400 font-bold">Copied!</span> : <><CopyIcon /> Copy Text</>}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p>Your video prompt will appear here</p>
                    </div>
                )}
            </div>
        </div>

      </div>

       {error && (
        <div className="mb-6 p-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg max-w-3xl mx-auto w-full">
          {error}
        </div>
      )}

       {/* Sticky Bottom Control */}
       <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-lg border-t border-gray-700 p-4 rounded-t-lg shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex justify-center max-w-5xl mx-auto">
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled}
                    className="w-full sm:w-auto flex items-center justify-center px-8 py-3 font-bold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
                    >
                    {isLoading ? (
                        <>
                        Generating...
                        </>
                    ) : (
                        <>
                            <span className="text-xl mr-2">🎬</span>
                            Generate Video Prompt
                        </>
                    )}
                </button>
            </div>
       </div>
    </div>
  );
};

export default ImageToVideoPrompt;
