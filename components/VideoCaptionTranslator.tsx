import React, { useState, useCallback, useEffect, useRef } from 'react';
import { transcribeVideo, translateText, generateVoiceover } from '../services/geminiService.ts';
import type { PrebuiltVoice } from '../services/geminiService.ts';

// --- Reusable Helper Components ---

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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


// --- Component Specific Constants ---

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

interface CharacterType {
  name: string;
  emoji: string;
  description: string;
  voice: PrebuiltVoice;
};

const characterTypes: CharacterType[] = [
  { name: 'លោកតា', emoji: '👴', description: 'like a wise, old grandfather', voice: 'Fenrir' },
  { name: 'លោកយាយ', emoji: '👵', description: 'like a gentle, old grandmother', voice: 'Zephyr' },
  { name: 'លោកពូ', emoji: '👨‍🦳', description: 'like a friendly, middle-aged uncle', voice: 'Kore' },
  { name: 'អ្នកមីង', emoji: '👩‍🦳', description: 'like a friendly, middle-aged aunt', voice: 'Zephyr' },
  { name: 'កំលោះ', emoji: '👨', description: 'like a confident young man', voice: 'Kore' },
  { name: 'ក្រមុំ', emoji: '👩', description: 'like a sweet young woman', voice: 'Zephyr' },
];

interface VoiceEmotion {
  name: string;
  emoji: string;
  description: string;
  promptKeyword: string;
}

const voiceEmotions: VoiceEmotion[] = [
  { name: 'សប្បាយរីករាយ', emoji: '😄', description: 'សំឡេងមានថាមពល ខ្ពស់បន្តិច', promptKeyword: 'in a cheerful tone' },
  { name: 'ព្រួយសោក', emoji: '😢', description: 'សំឡេងទន់ ធ្លាក់ស្ទើរលើទឹកភ្នែក', promptKeyword: 'in a sad tone' },
  { name: 'ខឹង', emoji: '😡', description: 'សំឡេងខ្ពស់ តឹងរឹង ឬលឿន', promptKeyword: 'in an angry tone' },
  { name: 'ស្ងប់អារម្មណ៍', emoji: '😌', description: 'សំឡេងស្រទន់ ស្ងប់ស្ងាត់ ត្រលប់មកធម្មតាវិញ', promptKeyword: 'in a calm and soothing tone' },
  { name: 'ភ័យ', emoji: '😨', description: 'សំឡេងខ្សោយ ខ្លីៗ ឬដង្ហើមលឿន', promptKeyword: 'in a fearful tone' },
  { name: 'ស្រឡាញ់', emoji: '😍', description: 'សំឡេងទន់ អៀន ឬមានស្នាមញញឹម', promptKeyword: 'in a loving tone' },
  { name: 'ធម្មតា', emoji: '😐', description: 'សំឡេងធម្មតា មានសមតុល្យ', promptKeyword: 'in a normal, balanced tone' },
  { name: 'កំប្លែង', emoji: '😂', description: 'សំឡេងលេងសើច ឬបញ្ចេញចំណង់កំប្លែង', promptKeyword: 'in a humorous tone' },
  { name: 'ធ្លាក់ទឹកចិត្ត', emoji: '😔', description: 'សំឡេងទន់ និងយឺតបន្តិច', promptKeyword: 'in a depressed tone' },
  { name: 'សង្ស័យ', emoji: '🤔', description: 'សំឡេងលើកចំណងសួរ ឬស្ទាក់ស្ទើរ', promptKeyword: 'in a doubtful tone' },
  { name: 'មានទំនុកចិត្ត', emoji: '😎', description: 'សំឡេងជាអ្នកដឹកនាំ ឬគួរឱ្យគោរព', promptKeyword: 'in a confident tone' },
];

interface Subtitle {
    startTime: number;
    text: string;
}

interface CaptionStyle {
    id: string;
    name: string;
    textColor: string;
    fontFamily: string;
    fontWeight: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    backgroundPadding?: number;
    borderRadius?: number;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    isNeon?: boolean;
    fontStyle?: string;
}

const captionStyles: CaptionStyle[] = [
    { id: 'classic', name: 'Classic', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.1, shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 4, shadowOffsetY: 2 },
    { id: 'yellow', name: 'Yellow Pop', textColor: '#FACC15', fontFamily: 'Arial', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.15, shadowColor: '#000000', shadowOffsetY: 4, shadowBlur: 0 },
    { id: 'black_box', name: 'Black Box', textColor: '#FFFFFF', fontFamily: 'Verdana', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.8)', backgroundPadding: 0.3 },
    { id: 'neon_blue', name: 'Neon Blue', textColor: '#FFFFFF', fontFamily: 'Courier New', fontWeight: 'bold', strokeColor: '#00FFFF', strokeWidth: 0.05, shadowColor: '#00FFFF', shadowBlur: 15, isNeon: true },
];

// --- Main Component ---

const VideoCaptionTranslator: React.FC = () => {
    const [videoFile, setVideoFile] = useState<{ base64: string, mimeType: string } | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [srtFileName, setSrtFileName] = useState<string | null>(null);
    
    const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
    
    const [transcription, setTranscription] = useState('');
    const [result, setResult] = useState(''); // Stores translated text
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [currentSubtitle, setCurrentSubtitle] = useState('');
    const [showCaptions, setShowCaptions] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<CharacterType>(characterTypes[0]);
    const [selectedEmotion, setSelectedEmotion] = useState<VoiceEmotion>(voiceEmotions[6]);
    const [playbackMode, setPlaybackMode] = useState<'original' | 'voiceover'>('original');
    const [autoGenerateVoice, setAutoGenerateVoice] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Style State
    const [activeCaptionStyle, setActiveCaptionStyle] = useState<CaptionStyle>(captionStyles[0]);
    const [fontScale, setFontScale] = useState(1.0);
    const [verticalPosition, setVerticalPosition] = useState(10);
    const [isUppercase, setIsUppercase] = useState(false);

    const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');

    // Export States
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportRatio, setExportRatio] = useState<'original' | '16:9' | '9:16' | '720p' | '1080p'>('original');
    
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const subtitlesRef = useRef<Subtitle[]>([]);

    // PERSISTENCE LISTENERS
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'video-caption-translator') return;
            const projectData = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'video-caption-translator',
                category: 'video',
                title: transcription.substring(0, 30) || "សម្រាយរឿង V.1",
                data: {
                    videoFile,
                    srtFileName,
                    selectedLanguage,
                    transcription,
                    result,
                    subtitles,
                    activeCaptionStyle,
                    fontScale,
                    verticalPosition,
                    isUppercase
                }
            };
            const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        };

        const handleLoadRequest = (e: any) => {
            if (e.detail.tool !== 'video-caption-translator') return;
            const d = e.detail.data;
            if (d.videoFile) setVideoFile(d.videoFile);
            if (d.srtFileName) setSrtFileName(d.srtFileName);
            if (d.selectedLanguage) setSelectedLanguage(d.selectedLanguage);
            if (d.transcription) setTranscription(d.transcription);
            if (d.result) setResult(d.result);
            if (d.subtitles) setSubtitles(d.subtitles);
            if (d.activeCaptionStyle) setActiveCaptionStyle(d.activeCaptionStyle);
            if (d.fontScale) setFontScale(d.fontScale);
            if (d.verticalPosition) setVerticalPosition(d.verticalPosition);
            if (d.isUppercase !== undefined) setIsUppercase(d.isUppercase);
            setError(null);
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        window.addEventListener('LOAD_PROJECT', handleLoadRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
            window.removeEventListener('LOAD_PROJECT', handleLoadRequest);
        };
    }, [transcription, videoFile, srtFileName, selectedLanguage, result, subtitles, activeCaptionStyle, fontScale, verticalPosition, isUppercase]);

    useEffect(() => {
        subtitlesRef.current = subtitles;
    }, [subtitles]);

    useEffect(() => {
        return () => { 
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (audioUrl) URL.revokeObjectURL(audioUrl); 
        };
    }, [videoUrl, audioUrl]);

    useEffect(() => {
        const video = previewVideoRef.current;
        const audio = audioRef.current;
        
        if (!video || !audio) return;

        const handlePlay = () => {
            if (playbackMode === 'voiceover' && audioUrl) {
                if (audio.duration && video.duration && audio.duration > 0 && video.duration > 0) {
                    const ratio = audio.duration / video.duration;
                    audio.playbackRate = isFinite(ratio) && ratio > 0 ? ratio : 1;
                }
                audio.play().catch(() => {});
            }
        };
        const handlePause = () => {
            if (playbackMode === 'voiceover') audio.pause();
        };
        const handleSeek = () => {
            if (playbackMode === 'voiceover' && audio.duration && video.duration) {
                const targetAudioTime = (video.currentTime / video.duration) * audio.duration;
                if (Math.abs(audio.currentTime - targetAudioTime) > 0.5) {
                    audio.currentTime = targetAudioTime;
                }
            }
        };
        const handleTimeUpdate = () => {
            const time = video.currentTime;
            const activeSub = subtitlesRef.current.find(s => time >= s.startTime && time < s.startTime + 5);
            if (activeSub) setCurrentSubtitle(activeSub.text);
            else setCurrentSubtitle('');
        };

        video.muted = playbackMode === 'voiceover' && !!audioUrl;

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeking', handleSeek);
        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeek);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [audioUrl, playbackMode]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isSRT = file.name.toLowerCase().endsWith('.srt');

        if (isSRT) {
            setSrtFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setTranscription(text);
                setResult('');
                setSubtitles([]);
                setError(null);
                setActiveTab('original');
            };
            reader.onerror = () => setError('Failed to read SRT file.');
            reader.readAsText(file);
            return;
        }

        const tempMedia = file.type.startsWith('audio') ? document.createElement('audio') : document.createElement('video');
        tempMedia.preload = 'metadata';
        
        tempMedia.onloadedmetadata = () => {
            window.URL.revokeObjectURL(tempMedia.src);
            if (tempMedia.duration > 600) { 
                setError("File is too long! Please upload a file shorter than 10 minutes.");
                return;
            }
            
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setVideoFile({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
                setResult('');
                setSubtitles([]);
                setTranscription('');
                setSrtFileName(null);
                setError(null);
                setAudioUrl(null);
                setPlaybackMode('original');
                setActiveTab('original');
            };
            reader.readAsDataURL(file);
        };
        tempMedia.src = URL.createObjectURL(file);
    };

    const parseSubtitles = (text: string): Subtitle[] => {
        const lines = text.split('\n');
        const subs: Subtitle[] = [];
        const timeRegex = /(?:\[)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\])?/;

        lines.forEach(line => {
            const match = line.match(timeRegex);
            if (match) {
                let minutes = 0;
                let seconds = 0;
                if (match[3]) {
                     minutes = parseInt(match[1]) * 60 + parseInt(match[2]);
                     seconds = parseInt(match[3]);
                } else {
                     minutes = parseInt(match[1]);
                     seconds = parseInt(match[2]);
                }
                const startTime = minutes * 60 + seconds;
                const cleanText = line.replace(timeRegex, '').replace(/^[\s\-\:\]\)]+/, '').trim();
                if (cleanText) subs.push({ startTime, text: cleanText });
            }
        });
        return subs;
    };

    const handleProcess = useCallback(async () => {
        const textToTranslate = activeTab === 'original' ? transcription : result;
        if (!textToTranslate) {
            setError('Please upload a file or transcribe first.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus(`Translating to ${selectedLanguage.name}...`);
        
        try {
            const isSrtContent = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(textToTranslate);
            const prompt = isSrtContent 
                ? `Translate the text in the following SRT file to ${selectedLanguage.value}, maintaining the timestamps and structure perfectly:\n\n${textToTranslate}`
                : `Translate the following video captions into ${selectedLanguage.value}. Maintain the [MM:SS] format if present:\n\n${textToTranslate}`;

            const translationResult = await translateText(prompt, 'Detected Language', selectedLanguage.value);
            
            setResult(translationResult);
            setActiveTab('translated');
            const parsedSubs = parseSubtitles(translationResult);
            setSubtitles(parsedSubs);
            
            if (autoGenerateVoice) {
                setStatus('Generating voiceover...');
                await handleGenerateVoice(translationResult);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    }, [transcription, result, selectedLanguage, autoGenerateVoice, activeTab]);

    const handleTranscribeOnly = async () => {
        if (!videoFile) return;
        setIsLoading(true);
        setError(null);
        setStatus('Transcribing...');
        try {
            const text = await transcribeVideo(videoFile.base64, videoFile.mimeType);
            setTranscription(text);
            setActiveTab('original');
        } catch (err) {
            setError('Transcription failed.');
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    };

    const handleGenerateVoice = async (textToSpeak?: string) => {
        let targetText = textToSpeak || (activeTab === 'original' ? transcription : result);
        if (!targetText) return;

        targetText = targetText.replace(/(?:\[)?\d{1,2}:\d{2}(?::\d{2})?(?:\])?/g, '').replace(/[\n\r]+/g, '. ');

        setIsGeneratingVoice(true);
        setError(null);
        try {
            const base64Audio = await generateVoiceover(
                targetText, 
                selectedLanguage.value, 
                selectedVoice.voice, 
                selectedEmotion.promptKeyword
            );
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            setPlaybackMode('voiceover');
        } catch (err) {
            setError('Voice generation failed.');
        } finally {
            setIsGeneratingVoice(false);
        }
    };

    const handleDownloadResult = () => {
        const text = activeTab === 'original' ? transcription : result;
        if (!text) return;
        
        const isSrt = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(text);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `translated-result-${Date.now()}.${isSrt ? 'srt' : 'txt'}`;
        link.click();
    };

    const handleExportVideo = async () => {
        if (!videoUrl || !audioUrl) return;
        setIsExporting(true);
        setExportProgress(0);

        try {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.muted = true;
            video.crossOrigin = "anonymous";
            
            const audio = new Audio(audioUrl);
            audio.crossOrigin = "anonymous";

            await Promise.all([
                new Promise(r => { video.onloadedmetadata = r; }),
                new Promise(r => { audio.onloadedmetadata = r; })
            ]);

            const canvas = document.createElement('canvas');
            const vWidth = video.videoWidth || 1280;
            const vHeight = video.videoHeight || 720;

            let width = vWidth, height = vHeight;
            if (exportRatio === '720p') { height = 720; width = 720 * (vWidth / vHeight); }
            else if (exportRatio === '1080p') { height = 1080; width = 1080 * (vWidth / vHeight); }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Canvas Error");

            const audioCtx = new AudioContext();
            const dest = audioCtx.createMediaStreamDestination();
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(dest);

            const stream = canvas.captureStream(30);
            stream.addTrack(dest.stream.getAudioTracks()[0]);
            
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            recorderRef.current = recorder;
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `translated_video_${Date.now()}.mp4`;
                a.click();
                setIsExporting(false);
            };

            recorder.start();
            video.play();
            audio.play();

            const drawFrame = () => {
                if (video.paused || video.ended || video.currentTime >= video.duration - 0.1) {
                    if(recorder.state === 'recording') recorder.stop();
                    return;
                }
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, width, height);

                // Captions
                const time = video.currentTime;
                const activeSub = subtitlesRef.current.find(s => time >= s.startTime && time < s.startTime + 5);
                if (activeSub && showCaptions) {
                    const style = activeCaptionStyle;
                    const fs = Math.max(20, height * 0.05) * fontScale;
                    ctx.font = `${style.fontWeight} ${fs}px ${style.fontFamily}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    const text = isUppercase ? activeSub.text.toUpperCase() : activeSub.text;
                    const x = width / 2;
                    const y = height - (height * (verticalPosition / 100));
                    
                    if (style.backgroundColor) {
                        const p = fs * 0.3;
                        const metrics = ctx.measureText(text);
                        ctx.fillStyle = style.backgroundColor;
                        ctx.fillRect(x - metrics.width/2 - p, y - fs - p, metrics.width + p*2, fs + p*2);
                    }
                    ctx.fillStyle = style.textColor;
                    ctx.fillText(text, x, y);
                }
                setExportProgress((video.currentTime / video.duration) * 100);
                requestAnimationFrame(drawFrame);
            };
            drawFrame();
        } catch (err) {
            setIsExporting(false);
        }
    };

    const handleClear = () => {
        setVideoUrl(null);
        setVideoFile(null);
        setSrtFileName(null);
        setResult('');
        setTranscription('');
        setSubtitles([]);
        setError(null);
        setAudioUrl(null);
    };

    const currentDisplayText = activeTab === 'original' ? transcription : result;

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col p-4 animate-fade-in">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="space-y-6">
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col h-full">
                        <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                            <span>📹</span> សម្រាយរឿង V.1 (Source)
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center relative overflow-hidden group">
                                {videoUrl ? (
                                    <video src={videoUrl} controls className="w-full h-full object-contain" />
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition p-4 text-center">
                                        <UploadIcon />
                                        <span className="text-gray-400 text-xs font-bold uppercase">Video / Audio</span>
                                        <input type="file" accept="video/*,audio/*" onChange={handleFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                            <div className="aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center relative overflow-hidden group">
                                {srtFileName ? (
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-2">📄</div>
                                        <p className="text-cyan-400 font-bold text-[10px] truncate w-full">{srtFileName}</p>
                                        <button onClick={() => {setSrtFileName(null); setTranscription('');}} className="text-[9px] text-red-400 hover:underline mt-2">REMOVE</button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition p-4 text-center">
                                        <FileUploadIcon />
                                        <span className="text-gray-400 text-xs font-bold uppercase">Upload SRT</span>
                                        <input type="file" accept=".srt" onChange={handleFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
                            {languages.map((lang, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedLanguage(lang)}
                                    className={`p-2 rounded-lg border text-[10px] font-black transition-all ${selectedLanguage.name === lang.name ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                                >
                                    <span className="block text-lg mb-0.5">{lang.flag}</span>
                                    {lang.name.split(' ')[0]}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-auto">
                            <button onClick={handleTranscribeOnly} disabled={isLoading || !videoFile} className="py-3 bg-gray-700 hover:bg-gray-600 text-white text-xs font-black rounded-xl border border-gray-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {isLoading && status.includes('Transcribe') ? <Spinner className="h-4 w-4 mr-0" /> : '📝'} Transcribe
                            </button>
                            <button onClick={handleProcess} disabled={isLoading || (!videoFile && !transcription)} className="py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {isLoading && status.includes('Translate') ? <Spinner className="h-4 w-4 mr-0" /> : '🌍'} Translate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Result Panel */}
                <div className="space-y-6">
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col h-full min-h-[600px]">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                                <button onClick={() => setActiveTab('original')} className={`px-3 py-1.5 text-[10px] font-black rounded-md transition ${activeTab === 'original' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>ORIGINAL</button>
                                <button onClick={() => setActiveTab('translated')} className={`px-3 py-1.5 text-[10px] font-black rounded-md transition ${activeTab === 'translated' ? 'bg-cyan-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>TRANSLATED</button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(!isEditing)} className={`px-3 py-1.5 text-[10px] font-black rounded border transition ${isEditing ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                                    {isEditing ? 'SAVE' : 'EDIT'}
                                </button>
                                <button onClick={handleDownloadResult} disabled={!currentDisplayText} className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 transition disabled:opacity-50">
                                    <DownloadIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col mb-4">
                             <textarea 
                                value={currentDisplayText} 
                                onChange={(e) => activeTab === 'original' ? setTranscription(e.target.value) : setResult(e.target.value)}
                                readOnly={!isEditing}
                                placeholder="Result text will appear here..."
                                className={`w-full flex-grow bg-transparent p-4 text-gray-300 text-sm font-mono leading-relaxed resize-none outline-none custom-scrollbar ${isEditing ? 'ring-1 ring-cyan-500/50' : ''}`}
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {characterTypes.map(char => (
                                    <button key={char.name} onClick={() => setSelectedVoice(char)} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${selectedVoice.name === char.name ? 'bg-purple-600 border-purple-400 text-white scale-105' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                                        <span className="text-xl mb-1">{char.emoji}</span>
                                        <span className="text-[8px] font-black uppercase leading-tight">{char.name}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex gap-3">
                                <button onClick={() => handleGenerateVoice()} disabled={isGeneratingVoice || !currentDisplayText} className="flex-grow py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isGeneratingVoice ? <Spinner className="h-4 w-4 mr-0"/> : '🔊'} {isGeneratingVoice ? 'Producing...' : 'Create Voiceover'}
                                </button>
                                <button onClick={handleExportVideo} disabled={isExporting || !audioUrl} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isExporting ? <Spinner className="h-4 w-4 mr-0" /> : '🎬'} Export Final
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isExporting && (
                <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] p-10 text-center animate-fade-in">
                    <Spinner className="h-16 w-16 text-cyan-500 mb-8" />
                    <h4 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Exporting Media</h4>
                    <p className="text-gray-400 text-sm mb-6">Combining Translated Script + Voiceover + Original Visuals</p>
                    <div className="w-full max-w-md bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700 mb-4">
                        <div className="bg-cyan-500 h-full transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">{Math.round(exportProgress)}% COMPLETE</p>
                    <p className="mt-10 text-xs text-gray-500 italic">* Please do not close this tab until export is finished.</p>
                </div>
            )}
            
            {error && (
                <div className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-red-900/90 border border-red-700 text-red-200 rounded-xl shadow-2xl animate-shake text-center font-bold text-sm">
                    {error}
                </div>
            )}
            
            <audio ref={audioRef} src={audioUrl} className="hidden" />
        </div>
    );
};

export default VideoCaptionTranslator;
