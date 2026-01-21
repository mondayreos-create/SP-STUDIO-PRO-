
import React, { useState, useRef, useEffect } from 'react';
import { generateVoiceover, translateText, PrebuiltVoice } from '../services/geminiService.ts';

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

const TranslateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
);

const PasteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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

interface CharacterModel {
    id: string;
    emoji: string;
    title: string;
    description: string;
    voice: PrebuiltVoice;
    tonePrompt: string;
}

// 🎭 ប្រភេទតួអង្គ (Character Types) Definition
const characterModels: CharacterModel[] = [
    {
        id: 'boy',
        emoji: '👦',
        title: 'ក្មេងប្រុស (Boy)',
        description: 'សំឡេងសប្បាយរីករាយ, ពូកែចលនា, មានភាពចង់ដឹងចង់ឃើញ។',
        voice: 'Puck',
        tonePrompt: 'Speak in a cheerful, energetic, and curious young boy tone.'
    },
    {
        id: 'girl',
        emoji: '👧',
        title: 'ក្មេងស្រី (Girl)',
        description: 'សំឡេងទន់ភ្លន់, មានភាពអរអើពេញចិត្ត, អាចជាស្មោះស្អាត ឬក្មេងស្លូតបូត។',
        voice: 'Zephyr',
        tonePrompt: 'Speak in a gentle, sweet, and innocent young girl tone.'
    },
    {
        id: 'grandpa',
        emoji: '👴',
        title: 'លោកតា (Grandpa)',
        description: 'សំឡេងជ្រៅ, ធ្ងន់ធ្ងរ, មានបទពិសោធន៍, ក្លិនអារម្មណ៍ដូចជាមនុស្សចាស់មានគំនិត។',
        voice: 'Fenrir',
        tonePrompt: 'Speak in a deep, serious, wise, and experienced old grandfather tone.'
    },
    {
        id: 'grandma',
        emoji: '👵',
        title: 'លោកយាយ (Grandma)',
        description: 'សំឡេងទន់ទៀង, មានភាពស្រលាញ់ យកចិត្តទុកដាក់ និងថ្នមថ្នាយ។',
        voice: 'Zephyr',
        tonePrompt: 'Speak in a soft, loving, caring, and gentle old grandmother tone.'
    },
    {
        id: 'uncle',
        emoji: '🧓',
        title: 'លោកពូ / អ្នកមឹង (Uncle)',
        description: 'សំឡេងស្លូតបូត ប៉ុន្តែអាចមានភាពកំប្លែង ឬប្រុងប្រយ័ត្ន។',
        voice: 'Kore',
        tonePrompt: 'Speak in a gentle but slightly humorous or cautious middle-aged uncle tone.'
    },
    {
        id: 'young_man',
        emoji: '👨',
        title: 'កំលោះ (Young Man)',
        description: 'សំឡេងខ្ជាប់ខ្ជួន, មានទំនុកចិត្ត, ក្លាហាន។',
        voice: 'Kore',
        tonePrompt: 'Speak in a firm, confident, and brave young man tone.'
    },
    {
        id: 'young_woman',
        emoji: '👩',
        title: 'ក្រមុំ (Young Woman)',
        description: 'សំឡេងទន់ភ្លន់, មានភាពស្រលាញ់ ឬអៀនខ្មាស់។',
        voice: 'Zephyr',
        tonePrompt: 'Speak in a soft, loving, and slightly shy young woman tone.'
    },
];

const translationLanguages = [
    'English', 
    'Cambodia (Khmer)',
    'Thailand (Thai)',
    'Vietnam (Vietnamese)',
    'Indonesia (Indonesian)',
    'Laos (Lao)',
    'Philippines (Filipino)',
    'Korea (Korean)', 
    'Japan (Japanese)', 
    'China (Chinese)', 
    'India (Hindi)',
    'France (French)', 
    'Spain (Spanish)', 
    'Italy (Italian)', 
    'Portugal (Portuguese)', 
    'Brazil (Portuguese)', 
    'Russia (Russian)',
    'Germany (German)',
    'Saudi Arabia (Arabic)',
    'Turkey (Turkish)'
];

const TextVoiceoverModels: React.FC = () => {
    const [text, setText] = useState('');
    const [selectedCharId, setSelectedCharId] = useState<string>(characterModels[0].id);
    const [language, setLanguage] = useState('Khmer');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [targetLang, setTargetLang] = useState('English');
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    const handlePaste = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            setText(clipboardText);
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    const handleTranslate = async () => {
        if (!text.trim()) {
            setError("Please enter text to translate.");
            return;
        }
        setIsTranslating(true);
        setError(null);
        try {
            const translatedText = await translateText(text, language, targetLang);
            setText(translatedText);
            // Auto update the language context for the voice generation
            setLanguage(targetLang); 
        } catch (err) {
            setError(err instanceof Error ? err.message : "Translation failed.");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError("សូមបញ្ចូលអត្ថបទដើម្បីបង្កើតសំឡេង។ (Please enter text.)");
            return;
        }
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const char = characterModels.find(c => c.id === selectedCharId) || characterModels[0];
            
            // Combine text with tone prompt instruction for Gemini
            // Note: The 'tonePrompt' is passed as the description/instruction to the service
            const base64Audio = await generateVoiceover(text, language, char.voice, undefined, char.tonePrompt);
            
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            
            setAudioUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setText('');
        setAudioUrl(null);
        setError(null);
        setSelectedCharId(characterModels[0].id);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full bg-gray-800/60 p-6 rounded-xl border border-gray-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                        Text Voiceover Models
                    </h2>
                    <p className="text-gray-400 text-sm">បង្កើតសំឡេងតាមតួអង្គ (Generate Character Voices)</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Character Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <span>🎭</span> ប្រភេទតួអង្គ (Character Types)
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {characterModels.map((char) => (
                                <div 
                                    key={char.id}
                                    onClick={() => setSelectedCharId(char.id)}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-4 hover:bg-gray-700/50 ${
                                        selectedCharId === char.id 
                                        ? 'border-indigo-500 bg-indigo-900/20 shadow-lg shadow-indigo-900/20' 
                                        : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="text-4xl bg-gray-800 rounded-full w-12 h-12 flex items-center justify-center border border-gray-700">
                                        {char.emoji}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className={`font-bold text-sm ${selectedCharId === char.id ? 'text-indigo-300' : 'text-gray-200'}`}>
                                                {char.title}
                                            </h4>
                                            {selectedCharId === char.id && (
                                                <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-300"></div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            {char.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Input & Output */}
                    <div className="flex flex-col space-y-6">
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex-grow flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-semibold text-gray-300">បញ្ចូលអត្ថបទ (Text Input)</label>
                                <button 
                                    onClick={handlePaste}
                                    className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition"
                                >
                                    <PasteIcon /> Paste Full Script
                                </button>
                            </div>
                            
                            {/* Language Selector */}
                            <div className="mb-3">
                                <select 
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-gray-800 border border-gray-600 text-white text-xs rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                >
                                    <option value="Khmer">Khmer (ភាសាខ្មែរ)</option>
                                    <option value="English">English</option>
                                    {translationLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <textarea 
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="សរសេរអត្ថបទសម្រាប់តួអង្គនិយាយនៅទីនេះ..."
                                className="w-full flex-grow bg-gray-800 border border-gray-600 rounded-lg p-4 text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none min-h-[200px]"
                            />
                            
                            {/* Translation Toolbar */}
                            <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-600 flex flex-col gap-2">
                                <div className="text-xs font-bold text-gray-400">Translate To:</div>
                                <div className="flex gap-2">
                                    <select 
                                        value={targetLang}
                                        onChange={(e) => setTargetLang(e.target.value)}
                                        className="flex-grow bg-gray-700 text-white text-xs p-2 rounded border border-gray-600 outline-none"
                                    >
                                        {translationLanguages.map(lang => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleTranslate}
                                        disabled={isTranslating || !text.trim()}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded flex items-center gap-2 transition disabled:opacity-50"
                                    >
                                        {isTranslating ? <Spinner /> : <TranslateIcon />}
                                        {isTranslating ? 'Translating...' : 'Translate 🌍'}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={isLoading || !text.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Spinner /> : <SpeakerIcon />}
                                    {isLoading ? 'កំពុងបង្កើត...' : 'បង្កើតសំឡេង (Generate Voice)'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-center text-sm">
                                {error}
                            </div>
                        )}

                        {audioUrl && (
                            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 animate-fade-in">
                                <h4 className="text-sm font-bold text-gray-300 mb-3">លទ្ធផល (Result)</h4>
                                <audio ref={audioRef} controls src={audioUrl} className="w-full mb-3" />
                                <a 
                                    href={audioUrl} 
                                    download={`voice_model_${selectedCharId}_${Date.now()}.wav`}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition border border-gray-600"
                                >
                                    <DownloadIcon /> ទាញយក (Download)
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TextVoiceoverModels;
