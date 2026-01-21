
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateVoiceover, PrebuiltVoice } from '../services/geminiService.ts';

// --- Icons ---
const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

// --- Constants ---

const languages = [
    { code: 'Khmer', name: '🇰🇭 Khmer', label: 'ភាសាខ្មែរ' },
    { code: 'English', name: '🇺🇸 English (US)', label: 'English' },
    { code: 'British', name: '🇬🇧 English (UK)', label: 'British' },
    { code: 'Japanese', name: '🇯🇵 Japanese', label: '日本語' },
    { code: 'Korean', name: '🇰🇷 Korean', label: '한국어' },
    { code: 'Chinese', name: '🇨🇳 Chinese', label: '中文' },
    { code: 'Thai', name: '🇹🇭 Thai', label: 'ไทย' },
    { code: 'Vietnamese', name: '🇻🇳 Vietnamese', label: 'Tiếng Việt' },
    { code: 'French', name: '🇫🇷 French', label: 'Français' },
    { code: 'German', name: '🇩🇪 German', label: 'Deutsch' },
    { code: 'Spanish', name: '🇪🇸 Spanish', label: 'Español' },
    { code: 'Russian', name: '🇷🇺 Russian', label: 'Русский' },
];

// Translated Voice Descriptions
const voices: { id: PrebuiltVoice; name: string; gender: 'Male' | 'Female'; style: string }[] = [
    { id: 'Kore', name: 'Kore', gender: 'Male', style: 'ធ្ងន់, ស្ងប់ស្ងាត់ (Deep, Calm)' },
    { id: 'Fenrir', name: 'Fenrir', gender: 'Male', style: 'គ្រើម, និទានរឿង (Rough, Storyteller)' },
    { id: 'Puck', name: 'Puck', gender: 'Male', style: 'ស្វាហាប់, ក្មេង (Energetic)' },
    { id: 'Charon', name: 'Charon', gender: 'Female', style: 'សំឡេងព័ត៌មាន (Professional)' },
    { id: 'Zephyr', name: 'Zephyr', gender: 'Female', style: 'ទន់ភ្លន់ (Soft)' },
];

// Translated Emotions
const emotions = [
    { value: 'Neutral', label: 'ធម្មតា' },
    { value: 'Happy', label: 'សប្បាយ' },
    { value: 'Sad', label: 'កំសត់' },
    { value: 'Angry', label: 'ខឹង' },
    { value: 'Excited', label: 'រំភើប' },
    { value: 'Whispering', label: 'ខ្សឹប' },
    { value: 'Terrified', label: 'ភ័យខ្លាច' },
    { value: 'Hopeful', label: 'សង្ឃឹម' },
    { value: 'Sarcastic', label: 'ឌឺដង' },
    { value: 'Professional', label: 'ផ្លូវការ' }
];

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

const TextToVoiceV2: React.FC = () => {
    const [text, setText] = useState('');
    const [language, setLanguage] = useState('Khmer');
    const [selectedVoice, setSelectedVoice] = useState<PrebuiltVoice>('Kore');
    const [selectedEmotion, setSelectedEmotion] = useState('Neutral');
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setIsPlaying(false);
        const handlePause = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
        };
    }, [audioUrl]);

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError("សូមបញ្ចូលអត្ថបទដើម្បីបង្កើតសំឡេង។");
            return;
        }
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setIsPlaying(false);

        try {
            const prompt = selectedEmotion !== 'Neutral' ? `(Speak in a ${selectedEmotion} tone) ${text}` : text;
            
            const base64Audio = await generateVoiceover(prompt, language, selectedVoice);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            
            setAudioUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "បរាជ័យក្នុងការបង្កើត।");
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
        }
    };

    const handleClear = () => {
        setText('');
        setAudioUrl(null);
        setError(null);
        setIsPlaying(false);
        setLanguage('Khmer');
        setSelectedVoice('Kore');
        setSelectedEmotion('Neutral');
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-full">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6">
                            ការកំណត់ (Settings)
                        </h2>

                        {/* Language */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">ភាសា (Language)</label>
                            <div className="relative">
                                <select 
                                    value={language} 
                                    onChange={(e) => setLanguage(e.target.value)} 
                                    className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-3 appearance-none focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>

                        {/* Voice Selection */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">អ្នកបញ្ចូលសំឡេង (Voice Actor)</label>
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                {voices.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVoice(v.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${selectedVoice === v.id ? 'bg-cyan-900/40 border-cyan-500 text-white shadow-md' : 'bg-gray-700/50 border-transparent text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${v.gender === 'Male' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                                                {v.name[0]}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-sm">{v.name}</div>
                                                <div className="text-[10px] opacity-70">{v.style}</div>
                                            </div>
                                        </div>
                                        {selectedVoice === v.id && <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Emotion */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">អារម្មណ៍ / សំនៀង (Emotion / Tone)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {emotions.map(em => (
                                    <button
                                        key={em.value}
                                        onClick={() => setSelectedEmotion(em.value)}
                                        className={`px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${selectedEmotion === em.value ? 'bg-purple-600 text-white border-purple-400' : 'bg-gray-700 text-gray-400 border-transparent hover:bg-gray-600'}`}
                                    >
                                        {em.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Panel: Input & Output */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 min-h-[500px] flex flex-col relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">📝</span> បញ្បញ្ចូលអត្ថបទ (Text Input)
                            </h2>
                            <div className="text-xs text-gray-500 font-mono">{text.length} chars</div>
                        </div>

                        <textarea 
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="សរសេរ ឬ បិទភ្ជាប់អត្ថបទរបស់អ្នកនៅទីនេះ..."
                            className="flex-grow w-full bg-gray-900/50 border border-gray-600 rounded-xl p-5 text-white text-base leading-relaxed resize-none focus:ring-2 focus:ring-cyan-500 outline-none mb-4 custom-scrollbar"
                        />

                        {/* Control Bar */}
                        <div className="bg-gray-900 rounded-xl p-3 flex items-center justify-between border border-gray-700">
                             <div className="flex items-center gap-4 w-full">
                                {audioUrl ? (
                                    <div className="flex items-center gap-3 w-full">
                                        <button 
                                            onClick={togglePlay}
                                            className="w-12 h-12 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-black rounded-full shadow-lg transition transform hover:scale-105"
                                        >
                                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                        </button>
                                        
                                        <div className="flex-grow h-12 bg-gray-800 rounded-lg border border-gray-700 flex items-center px-4 relative overflow-hidden">
                                            {/* Fake waveform viz */}
                                            <div className="flex gap-1 items-center h-1/2 w-full opacity-50">
                                                 {Array.from({length: 40}).map((_, i) => (
                                                     <div key={i} className="flex-1 bg-cyan-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.05}s` }}></div>
                                                 ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <a 
                                                href={audioUrl} 
                                                download={`speech_${Date.now()}.wav`}
                                                className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition"
                                                title="ទាញយក (Download)"
                                            >
                                                <DownloadIcon />
                                            </a>
                                            <button 
                                                onClick={() => setAudioUrl(null)} 
                                                className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-gray-600 transition"
                                                title="បង្កើតថ្មី (New)"
                                            >
                                                <RefreshIcon />
                                            </button>
                                        </div>
                                        <audio ref={audioRef} src={audioUrl} className="hidden" />
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={isLoading || !text.trim()}
                                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {isLoading ? <Spinner /> : <SpeakerIcon />}
                                        {isLoading ? 'កំពុងបង្កើត...' : 'បង្កើតសំឡេង (Generate)'}
                                    </button>
                                )}
                             </div>
                        </div>
                        
                        {error && (
                            <div className="absolute bottom-20 left-6 right-6 bg-red-900/90 text-red-100 p-3 rounded-lg text-center text-sm border border-red-700 backdrop-blur-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TextToVoiceV2;
