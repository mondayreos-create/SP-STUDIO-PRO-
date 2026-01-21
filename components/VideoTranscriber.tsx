
import React, { useState, useRef, useEffect } from 'react';
import { transcribeVideo, translateText, generateVoiceover } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import type { PrebuiltVoice } from '../services/geminiService.ts';
import { GoogleGenAI } from "@google/genai";

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const FileUploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
);

const TranslateIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
);

const VoiceIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

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

const languages = [
    { name: 'Cambodia (Khmer)', value: 'Khmer', flag: '🇰🇭' },
    { name: 'United States (English)', value: 'English', flag: '🇺🇸' },
    { name: 'United Kingdom (English)', value: 'English', flag: '🇬🇧' },
    { name: 'Thailand (Thai)', value: 'Thai', flag: '🇹🇭' },
    { name: 'Vietnam (Vietnamese)', value: 'Vietnamese', flag: '🇻🇳' },
    { name: 'Japan (Japanese)', value: 'Japanese', flag: '🇯🇵' },
    { name: 'South Korea (Korean)', value: 'Korean', flag: '🇰🇷' },
    { name: 'China (Mandarin)', value: 'Chinese', flag: '🇨🇳' },
    { name: 'France (French)', value: 'French', flag: '🇫🇷' },
    { name: 'Germany (German)', value: 'German', flag: '🇩🇪' },
    { name: 'Spain (Spanish)', value: 'Spanish', flag: '🇪🇸' },
    { name: 'Italy (Italian)', value: 'Italian', flag: '🇮🇹' },
    { name: 'Portugal (Portuguese)', value: 'Portuguese', flag: '🇵🇹' },
    { name: 'Russia (Russian)', value: 'Russian', flag: '🇷🇺' },
    { name: 'India (Hindi)', value: 'Hindi', flag: '🇮🇳' },
    { name: 'Indonesia (Indonesian)', value: 'Indonesian', flag: '🇮🇩' },
    { name: 'Philippines (Filipino)', value: 'Filipino', flag: '🇵🇭' },
    { name: 'Laos (Lao)', value: 'Lao', flag: '🇱🇦' },
    { name: 'Saudi Arabia (Arabic)', value: 'Arabic', flag: '🇸🇦' },
    { name: 'Turkey (Turkish)', value: 'Turkish', flag: '🇹🇷' },
];

interface VoiceOption {
    id: string;
    label: string;
    sub: string;
    icon: string;
    voice: PrebuiltVoice;
    style: string;
}

const voiceOptions: VoiceOption[] = [
    { id: 'male', label: 'Male', sub: 'ប្រុស', icon: '👨', voice: 'Kore', style: 'normal' },
    { id: 'female', label: 'Female', sub: 'ស្រី', icon: '👩', voice: 'Charon', style: 'normal' },
    { id: 'child', label: 'Child', sub: 'ក្មេង', icon: '🧒', voice: 'Puck', style: 'child-like, high pitched' },
    { id: 'grandma', label: 'Grandma', sub: 'យាយ', icon: '👵', voice: 'Zephyr', style: 'old woman' },
    { id: 'grandpa', label: 'Grandpa', sub: 'តា', icon: '👴', voice: 'Fenrir', style: 'old man, deep' },
];

const VideoTranscriber: React.FC = () => {
    const { t } = useLanguage();
    const [videoFile, setVideoFile] = useState<{ base64: string, mimeType: string } | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [srtFileName, setSrtFileName] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
    const [script, setScript] = useState(''); 
    const [result, setResult] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSRT, setIsGeneratingSRT] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(voiceOptions[0]);
    const [autoGenerateVoice, setAutoGenerateVoice] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');

    useEffect(() => {
        return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
    }, [videoUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isSRT = file.name.toLowerCase().endsWith('.srt');

        if (isSRT) {
            setSrtFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setScript(text);
                setResult('');
                setError(null);
                setActiveTab('original');
            };
            reader.onerror = () => setError('Failed to read SRT file.');
            reader.readAsText(file);
            return;
        }

        if (videoUrl) URL.revokeObjectURL(videoUrl);
        const url = URL.createObjectURL(file);
        setVideoUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setVideoFile({
                base64: base64String.split(',')[1],
                mimeType: file.type || 'video/mp4'
            });
            setResult('');
            setScript('');
            setSrtFileName(null);
            setError(null);
            setAudioUrl(null);
            setActiveTab('original');
        };
        reader.readAsDataURL(file);
    };

    const handleTranscribe = async () => {
        if (!videoFile) return;
        setIsLoading(true);
        setError(null);
        setActiveTab('original');
        try {
            const text = await transcribeVideo(videoFile.base64, videoFile.mimeType);
            setScript(text);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transcription failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetSRT = async () => {
        const textToProcess = activeTab === 'original' ? script : result;
        if (!textToProcess) return;

        setIsGeneratingSRT(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Convert the following text into a valid SRT subtitle format. Estimate timestamps based on the sentence lengths. Use 00:00:00,000 as start. Output only the SRT code:\n\n${textToProcess}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            const srtResult = response.text || "";
            if (activeTab === 'original') setScript(srtResult);
            else setResult(srtResult);
        } catch (err) {
            setError('Failed to generate SRT.');
        } finally {
            setIsGeneratingSRT(false);
        }
    };

    const handleTranslate = async () => {
        if (!script) return;
        setIsLoading(true);
        setError(null);
        setActiveTab('translated'); 
        
        try {
            const isSrtContent = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(script);
            const prompt = isSrtContent 
                ? `Translate the text in the following SRT file to ${selectedLanguage.value}, maintaining the timestamps and structure:\n\n${script}`
                : `Translate the following text to ${selectedLanguage.value}:\n\n${script}`;

            const resultText = await translateText(prompt, 'the original language', selectedLanguage.value);
            setResult(resultText);
            
            if (autoGenerateVoice) {
                await handleGenerateVoice(resultText);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Translation failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVoice = async (textToSpeak?: string) => {
        let targetText = textToSpeak || (activeTab === 'original' ? script : result);
        if (!targetText) return;
        targetText = targetText.replace(/\d+\s+\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, '');
        setIsGeneratingVoice(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const base64Audio = await generateVoiceover(targetText, selectedLanguage.value, selectedVoice.voice, selectedVoice.style === 'normal' ? undefined : `Speak in a ${selectedVoice.style} tone`);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Voiceover failed.');
        } finally {
            setIsGeneratingVoice(false);
        }
    };

    const handleDownload = () => {
        const textToDownload = activeTab === 'original' ? script : result;
        if (!textToDownload) return;
        const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `translated-${selectedLanguage.value}.${/\d{2}:\d{2}:\d{2}/.test(textToDownload) ? 'srt' : 'txt'}`;
        link.click();
    };

    const handleDownloadSRT = () => {
        const textToDownload = activeTab === 'original' ? script : result;
        if (!textToDownload) return;
        const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `subtitle-${selectedLanguage.value}-${Date.now()}.srt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadVoice = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `voiceover-${selectedLanguage.value}-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setVideoFile(null);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setSrtFileName(null);
        setScript('');
        setResult('');
        setError(null);
        setActiveTab('original');
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    };

    const displayText = activeTab === 'original' ? script : result;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col min-h-screen">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
                {/* Input Section */}
                <div className="bg-[#1a1f2e] p-6 rounded-3xl border border-gray-700 h-fit space-y-8 shadow-2xl">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4 text-center uppercase tracking-tighter">
                        Video Transcriber
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="aspect-video bg-[#0f172a] rounded-2xl border-2 border-dashed border-gray-700 overflow-hidden flex items-center justify-center relative hover:border-cyan-500/50 transition-all">
                            {videoUrl ? (
                                <video src={videoUrl} controls className="w-full h-full object-contain" />
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition-colors p-4 text-center">
                                    <UploadIcon />
                                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Video/Audio</span>
                                    <input type="file" accept="video/*,audio/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            )}
                        </div>
                        <div className="aspect-video bg-[#0f172a] rounded-2xl border-2 border-dashed border-gray-700 overflow-hidden flex items-center justify-center relative hover:border-cyan-500/50 transition-all">
                             {srtFileName ? (
                                <div className="text-center p-4">
                                    <div className="text-4xl mb-2">📄</div>
                                    <p className="text-cyan-400 font-bold text-xs truncate w-full">{srtFileName}</p>
                                    <button onClick={() => setSrtFileName(null)} className="text-[10px] text-red-400 hover:underline mt-2 uppercase font-black">Remove</button>
                                </div>
                             ) : (
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition-colors p-4 text-center">
                                    <FileUploadIcon />
                                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Upload SRT File</span>
                                    <input type="file" accept=".srt" onChange={handleFileChange} className="hidden" />
                                </label>
                             )}
                        </div>
                    </div>

                    <button 
                        onClick={handleTranscribe} 
                        disabled={!videoFile || isLoading}
                        className="w-full py-4 px-8 font-black text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-xl hover:brightness-110 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                    >
                        {isLoading && activeTab === 'original' ? <Spinner className="h-5 w-5" /> : '📄'} 
                        {isLoading && activeTab === 'original' ? 'Transcribing...' : 'Transcribe Video Audio'}
                    </button>
                </div>

                {/* Output Section */}
                <div className="bg-[#1a1f2e] p-6 rounded-3xl border border-gray-700 flex flex-col h-[700px] shadow-2xl relative overflow-hidden">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-2xl border border-gray-700">
                            <button
                                onClick={() => setActiveTab('original')}
                                className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition ${activeTab === 'original' ? 'bg-[#1e293b] text-white shadow-lg border border-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Original Script
                            </button>
                            <button
                                onClick={() => setActiveTab('translated')}
                                className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition ${activeTab === 'translated' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Translated
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition ${isEditing ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                {isEditing ? '✓ Done' : '✏️ Edit'}
                            </button>
                            <button onClick={handleDownloadSRT} disabled={!displayText} className="px-5 py-2 text-[10px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition disabled:opacity-50 flex items-center gap-2 shadow-lg" title="Download SRT Subtitle">
                                <DownloadIcon className="h-4 w-4" /> Download SRT
                            </button>
                            <button onClick={handleDownload} disabled={!displayText} className="px-5 py-2 text-[10px] font-black uppercase text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition disabled:opacity-50 flex items-center gap-2 shadow-lg" title="Download Text Result">
                                <DownloadIcon className="h-4 w-4" /> Download TXT
                            </button>
                        </div>
                    </div>

                    <div className="mb-6 flex flex-col sm:flex-row items-center gap-3 bg-[#0f172a] p-3 rounded-2xl border border-gray-700 shadow-inner">
                        <div className="flex items-center gap-2 flex-grow w-full">
                            <span className="text-lg">{selectedLanguage.flag}</span>
                            <select 
                                value={selectedLanguage.value} 
                                onChange={(e) => {
                                    const lang = languages.find(l => l.value === e.target.value);
                                    if(lang) setSelectedLanguage(lang);
                                }}
                                className="bg-[#1e293b] text-white text-xs p-2.5 rounded-xl border border-gray-700 outline-none focus:border-indigo-500 flex-grow cursor-pointer"
                            >
                                {languages.map(lang => (
                                    <option key={lang.value} value={lang.value}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={handleGetSRT} 
                                disabled={isGeneratingSRT || !displayText}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition shadow-lg disabled:opacity-50"
                            >
                                {isGeneratingSRT ? <Spinner className="h-4 w-4 mr-0"/> : '⏳'} Get SRT
                            </button>
                            <button 
                                onClick={handleTranslate} 
                                disabled={isLoading || !script}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-lg disabled:opacity-50"
                            >
                                {isLoading && activeTab === 'translated' ? <Spinner className="h-4 w-4 mr-0"/> : <TranslateIcon />}
                                Translate
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative flex-grow flex flex-col">
                        <textarea 
                            value={displayText} 
                            onChange={(e) => {
                                if (activeTab === 'original') setScript(e.target.value);
                                else setResult(e.target.value);
                            }}
                            readOnly={!isEditing}
                            placeholder={activeTab === 'original' ? 'Transcribe or upload SRT to begin...' : 'Translated text will appear here...'}
                            className={`flex-grow bg-[#0f172a] rounded-2xl p-6 border border-gray-700 font-mono text-sm text-gray-300 leading-relaxed resize-none focus:ring-1 focus:ring-cyan-500 outline-none custom-scrollbar shadow-inner ${isEditing ? 'ring-1 ring-yellow-500/50' : ''}`}
                        />
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                                <div className="flex flex-col items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-2xl">
                                    <Spinner className="h-8 w-8 text-cyan-400 m-0" />
                                    <p className="text-[10px] font-black uppercase text-cyan-400 mt-2 tracking-widest animate-pulse">Processing...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Voiceover Section */}
                    <div className="mt-8 pt-6 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">VOICE GENERATION</h3>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={autoGenerateVoice} 
                                    onChange={e => setAutoGenerateVoice(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-[10px] font-bold text-gray-500 group-hover:text-purple-400 transition">Auto-gen after translate</span>
                            </label>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                            {voiceOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setSelectedVoice(option)}
                                    className={`flex-shrink-0 flex flex-col items-center justify-center w-24 p-3 rounded-2xl border-2 transition-all ${selectedVoice.id === option.id ? 'bg-purple-900/40 border-purple-500 text-white shadow-lg scale-105' : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'}`}
                                >
                                    <span className="text-2xl mb-1">{option.icon}</span>
                                    <span className="text-[10px] font-black uppercase truncate w-full text-center">{option.label}</span>
                                    <span className="text-[8px] opacity-50 font-bold uppercase">{option.sub}</span>
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mt-2">
                             <button 
                                onClick={() => handleGenerateVoice()}
                                disabled={!displayText || isGeneratingVoice}
                                className="flex-grow flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-black uppercase text-white bg-purple-600 rounded-2xl hover:bg-purple-500 transition disabled:opacity-50 shadow-xl shadow-purple-900/20"
                            >
                                {isGeneratingVoice ? <Spinner className="h-5 w-5 mr-0"/> : <VoiceIcon />}
                                Start Voiceover
                            </button>
                            {audioUrl && (
                                <div className="flex-grow flex items-center gap-2">
                                    <div className="flex-grow flex items-center bg-[#0f172a] rounded-2xl border border-gray-700 px-3 py-1 shadow-inner">
                                        <audio controls src={audioUrl} className="w-full h-8" />
                                    </div>
                                    <button 
                                        onClick={handleDownloadVoice}
                                        className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg transition active:scale-95"
                                        title="Download Voiceover Audio"
                                    >
                                        <DownloadIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoTranscriber;
