import React, { useState, useRef, useEffect, useCallback } from 'react';
import { transcribeVideo, translateText, generateVoiceover, PrebuiltVoice } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
);

const AudioIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
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

// --- Audio Utilities ---
// FIX: Implemented decode function to handle base64 to Uint8Array conversion.
const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// FIX: Implemented pcmToWavBlob function to add WAV headers to raw PCM data returned by Gemini TTS.
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

// Helper to read file as base64 on demand
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

const SamrayRueungGenerator: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    const [targetLanguage, setTargetLanguage] = useState('Khmer');
    const [voice, setVoice] = useState<PrebuiltVoice>('Kore'); 
    
    // Audio Settings
    const [normalizeLoudness, setNormalizeLoudness] = useState(true);
    const [enhanceVoice, setEnhanceVoice] = useState(true);
    const [reduceNoise, setReduceNoise] = useState(false);
    const [removeVocals, setRemoveVocals] = useState(false); 
    const [recordVideo, setRecordVideo] = useState(true);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [progressStep, setProgressStep] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [playbackMode, setPlaybackMode] = useState<'original' | 'dubbed'>('original');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportComplete, setExportComplete] = useState(false); 
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    // Script Editing
    const [rawScript, setRawScript] = useState(''); 
    const [editableScript, setEditableScript] = useState(''); 
    const [isEditingScript, setIsEditingScript] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);

    // PERSISTENCE LISTENER
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'samray_rueung') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'samray_rueung',
                category: 'vip',
                title: editableScript.substring(0, 30) || "សម្រាយរឿង",
                data: {
                    targetLanguage,
                    voice,
                    normalizeLoudness,
                    enhanceVoice,
                    reduceNoise,
                    removeVocals,
                    recordVideo,
                    rawScript,
                    editableScript
                }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'samray_rueung') return;
            const d = e.detail.data;
            if (d.targetLanguage) setTargetLanguage(d.targetLanguage);
            if (d.voice) setVoice(d.voice);
            if (d.normalizeLoudness !== undefined) setNormalizeLoudness(d.normalizeLoudness);
            if (d.enhanceVoice !== undefined) setEnhanceVoice(d.enhanceVoice);
            if (d.reduceNoise !== undefined) setReduceNoise(d.reduceNoise);
            if (d.removeVocals !== undefined) setRemoveVocals(d.removeVocals);
            if (d.recordVideo !== undefined) setRecordVideo(d.recordVideo);
            if (d.rawScript) setRawScript(d.rawScript);
            if (d.editableScript) setEditableScript(d.editableScript);
            setError(null);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [targetLanguage, voice, normalizeLoudness, enhanceVoice, reduceNoise, removeVocals, recordVideo, rawScript, editableScript]);

    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        };
    }, [videoUrl, audioUrl, downloadUrl]);

    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        const handlePlay = () => { if (playbackMode === 'dubbed' && audioUrl) audio.play().catch(() => {}); };
        const handlePause = () => { if (playbackMode === 'dubbed') audio.pause(); };
        const handleSeek = () => {
            if (playbackMode === 'dubbed' && audioUrl) {
                audio.currentTime = video.currentTime;
            }
        };

        if (playbackMode === 'dubbed') {
            video.muted = true;
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('seeking', handleSeek);
        } else {
            video.muted = false;
            audio.pause();
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeek);
        }

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeek);
        };
    }, [playbackMode, audioUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        
        tempVideo.onloadedmetadata = () => {
            window.URL.revokeObjectURL(tempVideo.src);
            const duration = tempVideo.duration;
            
            if (duration > 300) {
                setError("You cannot update this. Please trim the video down to 5 minutes before uploading.");
                setVideoFile(null);
                setVideoUrl(null);
                return;
            }

            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setVideoFile(file); 
            
            setError(null);
            setAudioUrl(null);
            setPlaybackMode('original');
            setRawScript('');
            setEditableScript('');
            setIsEditingScript(false);
        };

        tempVideo.onerror = () => {
            setError("Invalid video file.");
        };

        tempVideo.src = URL.createObjectURL(file);
    };

    const handleProcess = async () => {
        if (!videoFile) return;
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);
        setRawScript('');
        setEditableScript('');
        setDownloadUrl(null);
        setExportComplete(false);
        
        try {
            setProgressStep('Processing video file...');
            const base64 = await fileToBase64(videoFile);

            setProgressStep('Transcribing video audio...');
            const transcription = await transcribeVideo(base64, videoFile.type);
            
            setProgressStep(`Translating to ${targetLanguage}...`);
            const translation = await translateText(transcription, 'Detected Language', targetLanguage);
            setRawScript(translation); 
            
            const cleanText = translation.replace(/(?:\[)?\d{1,2}:\d{2}(?::\d{2})?(?:\])?/g, '').replace(/[\n\r]+/g, '. ');
            setEditableScript(cleanText);

            await generateAndSetAudio(cleanText);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : "Processing failed.");
        } finally {
            setIsLoading(false);
            setProgressStep('');
        }
    };

    const generateAndSetAudio = async (text: string) => {
        setProgressStep('Generating new voiceover...');
        let emotion = undefined;
        if (enhanceVoice) {
            emotion = "in a clear, professional, and engaging studio voice";
        }

        const base64Audio = await generateVoiceover(text, targetLanguage, voice, emotion);
        
        const pcmBytes = decode(base64Audio);
        const pcmInt16 = new Int16Array(pcmBytes.buffer);
        
        if (normalizeLoudness) {
            let maxVal = 0;
            for (let i = 0; i < pcmInt16.length; i++) {
                if (Math.abs(pcmInt16[i]) > maxVal) maxVal = Math.abs(pcmInt16[i]);
            }
            if (maxVal > 0) {
                const gain = 32000 / maxVal; 
                for (let i = 0; i < pcmInt16.length; i++) {
                    pcmInt16[i] = pcmInt16[i] * gain;
                }
            }
        }

        const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
        const url = URL.createObjectURL(wavBlob);
        
        setAudioUrl(url);
        setPlaybackMode('dubbed');
    };

    const handleRegenerateVoice = async () => {
        if (!editableScript.trim()) return;
        setIsRegenerating(true);
        setError(null);
        try {
            await generateAndSetAudio(editableScript);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Voice regeneration failed.");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleDownloadSRT = () => {
        let content = rawScript;
        let filename = `script_${targetLanguage}.txt`;
        
        if (/\d{1,2}:\d{2}/.test(rawScript)) {
             filename = `subtitles_${targetLanguage}.srt`;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleStopExportEarly = () => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }
    };

    const handleExport = async () => {
        if (!videoUrl || !audioUrl) return;
        setIsExporting(true);
        setExportComplete(false);
        setExportProgress(0);
        setError(null);

        try {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.muted = false; 
            video.crossOrigin = "anonymous";
            video.playsInline = true;
            
            const newAudio = new Audio(audioUrl);
            newAudio.crossOrigin = "anonymous";

            await Promise.all([
                new Promise(r => { video.onloadedmetadata = r; }),
                new Promise(r => { newAudio.onloadedmetadata = r; })
            ]);

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext();
            const dest = audioCtx.createMediaStreamDestination();
            
            const newAudioSource = audioCtx.createMediaElementSource(newAudio);
            const newAudioGain = audioCtx.createGain();
            newAudioGain.gain.value = 1.0; 
            newAudioSource.connect(newAudioGain).connect(dest);

            const videoSource = audioCtx.createMediaElementSource(video);
            const videoGain = audioCtx.createGain();
            videoGain.gain.value = removeVocals ? 0.1 : 0.0; 
            videoSource.connect(videoGain).connect(dest);

            const stream = canvas.captureStream(30);
            const audioTrack = dest.stream.getAudioTracks()[0];
            stream.addTrack(audioTrack);

            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2500000 });
            recorderRef.current = recorder;
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `Samray_${targetLanguage}_${Date.now()}.mp4`;
                a.click();
                
                setDownloadUrl(url);
                setIsExporting(false);
                setExportComplete(true);
                
                audioCtx.close();
                video.remove();
                newAudio.remove();
            };

            recorder.start();
            video.currentTime = 0;
            newAudio.currentTime = 0;
            
            const playbackRate = 2.0;
            video.playbackRate = playbackRate;
            newAudio.playbackRate = playbackRate;

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Auto-play prevented:", error);
                    setError("Auto-play prevented. Please interact with the page first.");
                    setIsExporting(false);
                });
            }
            newAudio.play();

            const drawFrame = () => {
                if (video.paused || video.ended || video.currentTime >= video.duration - 0.1) {
                    if (recorder.state === 'recording') recorder.stop();
                    return;
                }
                
                if (ctx) ctx.drawImage(video, 0, 0);
                
                setExportProgress(Math.min((video.currentTime / video.duration) * 100, 100));
                
                if ('requestVideoFrameCallback' in video) {
                    (video as any).requestVideoFrameCallback(drawFrame);
                } else {
                    requestAnimationFrame(drawFrame);
                }
            };
            
            if ('requestVideoFrameCallback' in video) {
                (video as any).requestVideoFrameCallback(drawFrame);
            } else {
                requestAnimationFrame(drawFrame);
            }

        } catch (err) {
            console.error(err);
            setError("Export failed. Please keep this tab active during export.");
            setIsExporting(false);
        }
    };

    const handleClear = () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setVideoFile(null);
        setVideoUrl(null);
        setAudioUrl(null);
        setDownloadUrl(null);
        setError(null);
        setPlaybackMode('original');
        setRawScript('');
        setEditableScript('');
        setExportComplete(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full bg-gray-800/60 p-6 rounded-xl border border-gray-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
                        សម្រាយរឿង (Story Explainer)
                    </h2>
                    <p className="text-gray-400 text-sm">Upload a video, translate it, and get a new dubbed video instantly.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Input & Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <label className="block text-sm font-bold text-gray-300 mb-2">1. Upload Video</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg transition-colors">
                                <UploadIcon />
                                <span className="text-xs text-gray-400 text-center px-4">
                                    {videoFile ? videoFile.name : "Click to upload (Max 5 mins)"}
                                </span>
                                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">2. Target Language</label>
                                <select 
                                    value={targetLanguage} 
                                    onChange={(e) => setTargetLanguage(e.target.value)} 
                                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500 outline-none"
                                >
                                    <option value="Khmer">Khmer (ភាសាខ្មែរ)</option>
                                    <option value="English">English</option>
                                    <option value="Chinese">Chinese</option>
                                    <option value="Thai">Thai</option>
                                    <option value="Vietnamese">Vietnamese</option>
                                    <option value="Korean">Korean</option>
                                    <option value="Japanese">Japanese</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">3. Narrator Voice</label>
                                <select 
                                    value={voice} 
                                    onChange={(e) => setVoice(e.target.value as PrebuiltVoice)} 
                                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500 outline-none"
                                >
                                    <option value="Kore">Male Narrator (Kore)</option>
                                    <option value="Fenrir">Deep Male (Fenrir)</option>
                                    <option value="Charon">Female Narrator (Charon)</option>
                                    <option value="Zephyr">Soft Female (Zephyr)</option>
                                    <option value="Puck">Energetic (Puck)</option>
                                </select>
                            </div>

                            {/* Audio Settings Panel */}
                            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 space-y-3">
                                <label className="block text-sm font-bold text-gray-300 border-b border-gray-600 pb-1">Audio Settings</label>
                                
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={normalizeLoudness} 
                                            onChange={(e) => setNormalizeLoudness(e.target.checked)} 
                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-500 bg-gray-700 transition-all checked:border-cyan-500 checked:bg-cyan-500"
                                        />
                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold">✓</span>
                                    </div>
                                    <span className="text-xs text-gray-300 group-hover:text-white transition">Normalize Loudness</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={enhanceVoice} 
                                            onChange={(e) => setEnhanceVoice(e.target.checked)} 
                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-500 bg-gray-700 transition-all checked:border-purple-500 checked:bg-purple-500"
                                        />
                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold">✓</span>
                                    </div>
                                    <span className="text-xs text-gray-300 group-hover:text-white transition">Enhance Voice (AI Studio)</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={reduceNoise} 
                                            onChange={(e) => setReduceNoise(e.target.checked)} 
                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-500 bg-gray-700 transition-all checked:border-emerald-500 checked:bg-emerald-500"
                                        />
                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold">✓</span>
                                    </div>
                                    <span className="text-xs text-gray-300 group-hover:text-white transition">Reduce Noise</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group pt-1 border-t border-gray-700">
                                     <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={removeVocals} 
                                            onChange={(e) => setRemoveVocals(e.target.checked)} 
                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-500 bg-gray-700 transition-all checked:border-red-500 checked:bg-red-500"
                                        />
                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold">✓</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-200 font-bold group-hover:text-white transition">លុបតែសំលេងនិយាយ (Remove Vocals)</span>
                                        <span className="text-[10px] text-gray-500">Lowers original background audio to 10%</span>
                                    </div>
                                </label>
                            </div>

                            <button 
                                onClick={handleProcess}
                                disabled={isLoading || !videoFile}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Spinner /> : '🌍'} 
                                {isLoading ? progressStep : 'Translate Video'}
                            </button>
                        </div>
                    </div>

                    {/* Right: Preview & Output */}
                    <div className="lg:col-span-2 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-gray-300">លទ្ធផល (Result Output)</h3>
                            {audioUrl && !isExporting && !exportComplete && (
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-900 px-3 py-1 rounded border border-gray-700">
                                    <input 
                                        type="checkbox" 
                                        checked={recordVideo} 
                                        onChange={(e) => setRecordVideo(e.target.checked)} 
                                        className="w-4 h-4 text-emerald-500 bg-gray-800 border-gray-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-xs font-bold text-gray-300">Record Video (Render)</span>
                                </label>
                            )}
                        </div>
                        <div className="bg-black rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center relative aspect-video shadow-2xl mb-4">
                            {videoUrl ? (
                                <>
                                    <video 
                                        ref={videoRef} 
                                        src={videoUrl} 
                                        className="w-full h-full object-contain" 
                                        controls={!isExporting} 
                                    />
                                    {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
                                    
                                    {isExporting && (
                                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 p-6 text-center">
                                            <Spinner className="h-10 w-10 text-cyan-400 mb-4" />
                                            <h3 className="text-xl font-bold text-white mb-2">Rendering New Video...</h3>
                                            <p className="text-yellow-400 text-sm mb-4 font-semibold">⚠️ Please keep this tab OPEN and ACTIVE.</p>
                                            <div className="w-64 bg-gray-700 rounded-full h-2.5 mb-2">
                                                <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-200" style={{ width: `${exportProgress}%` }}></div>
                                            </div>
                                            <p className="text-gray-400 mt-1 mb-4">{Math.round(exportProgress)}%</p>
                                            <button 
                                                onClick={handleStopExportEarly}
                                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-sm transition"
                                            >
                                                ✓ Finish & Save Now
                                            </button>
                                        </div>
                                    )}
                                    
                                    {exportComplete && downloadUrl && (
                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-6 text-center backdrop-blur-sm animate-fade-in">
                                            <div className="bg-gray-800 p-6 rounded-xl border border-green-500 shadow-2xl max-w-sm w-full">
                                                <div className="text-5xl mb-4">✅</div>
                                                <h3 className="text-xl font-bold text-white mb-2">Rendering Complete!</h3>
                                                <p className="text-gray-400 text-sm mb-6">Your video is ready.</p>
                                                <a 
                                                    href={downloadUrl} 
                                                    download={`Samray_${targetLanguage}_${Date.now()}.mp4`}
                                                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-lg"
                                                >
                                                    <DownloadIcon /> Download Dubbed Video
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <div className="text-6xl mb-4 opacity-20">🎞️</div>
                                    <p className="text-lg font-bold">Preview Player</p>
                                    <p className="text-xs">Upload a video to start the translation process.</p>
                                </div>
                            )}
                        </div>

                        {/* Script Section */}
                        {editableScript && (
                            <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-700 mt-4 flex flex-col flex-grow">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileIcon /> {isEditingScript ? "Editing Script" : "Translated Script"}
                                    </h4>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsEditingScript(!isEditingScript)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold transition ${isEditingScript ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                        >
                                            {isEditingScript ? '✓ Finish' : '✏️ Edit'}
                                        </button>
                                        <button 
                                            onClick={handleDownloadSRT}
                                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold transition"
                                        >
                                            <DownloadIcon /> Script
                                        </button>
                                    </div>
                                </div>
                                
                                <textarea 
                                    value={isEditingScript ? editableScript : rawScript}
                                    onChange={(e) => isEditingScript ? setEditableScript(e.target.value) : setRawScript(e.target.value)}
                                    readOnly={!isEditingScript}
                                    className={`w-full flex-grow bg-black/40 border border-gray-700 rounded-lg p-4 text-gray-300 text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar font-serif ${isEditingScript ? 'ring-1 ring-blue-500' : ''}`}
                                />

                                {isEditingScript && (
                                    <button 
                                        onClick={handleRegenerateVoice}
                                        disabled={isRegenerating}
                                        className="mt-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2"
                                    >
                                        {isRegenerating ? <Spinner className="h-3 w-3 m-0" /> : <RefreshIcon />}
                                        Update Voiceover with Edits
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {/* Playback Controls if audio ready */}
                        {audioUrl && !isExporting && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-900 rounded-xl border border-gray-700 shadow-inner">
                                <div className="flex items-center gap-4 bg-gray-800 p-1 rounded-lg border border-gray-700">
                                    <button 
                                        onClick={() => setPlaybackMode('original')}
                                        className={`px-4 py-2 text-xs font-bold rounded-md transition ${playbackMode === 'original' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Original Audio
                                    </button>
                                    <button 
                                        onClick={() => setPlaybackMode('dubbed')}
                                        className={`px-4 py-2 text-xs font-bold rounded-md transition ${playbackMode === 'dubbed' ? 'bg-cyan-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        New Voiceover (DIT)
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={handleExport}
                                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                                >
                                    🎬 Export Final Video
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SamrayRueungGenerator;
