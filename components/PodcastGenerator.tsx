
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generatePodcastScript, 
    generateVoiceover, 
    generateDialog, 
    generateImage, 
    generateYouTubeMetadata, 
    YouTubeMetadata,
    Dialog,
    PrebuiltVoice
} from '../services/geminiService.ts';

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
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};

interface Character {
    id: number;
    name: string;
    voice: PrebuiltVoice;
    gender: string;
    age: string;
    description?: string;
    imageUrl?: string;
}

const allVoices: PrebuiltVoice[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const ageOptions = ['Child', 'Teenager', 'Adult', 'Senior'];
const genderOptions = ['Male', 'Female'];

const speakingStyles = [
    { key: 'conversational', emoji: '🗣️', en: 'Friendly Conversational' },
    { key: 'storytelling', emoji: '🎞️', en: 'Storytelling' },
    { key: 'news', emoji: '💼', en: 'News Style' },
];

const roomStyles = [
    'Modern Podcast Studio',
    'Cozy Living Room with Bookshelves',
    'Neon Gaming Room',
    'Professional News Desk',
];

const aspectRatios = [
    { label: '1:1 (Square)', value: '1:1', icon: '🔳' },
    { label: '16:9 (Landscape)', value: '16:9', icon: '📺' },
    { label: '9:16 (Portrait)', value: '9:16', icon: '📱' }
];

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const YouTubeIcon: React.FC = () => (
    <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);

const PodcastGenerator: React.FC = () => {
    const [podcastType, setPodcastType] = useState<'solo' | 'team'>('solo');
    const [language, setLanguage] = useState<'km' | 'en'>('km');
    const [topic, setTopic] = useState('');
    const [durationInMinutes, setDurationInMinutes] = useState(2);
    const [speakingStyle, setSpeakingStyle] = useState(speakingStyles[0].en);
    const [roomStyle, setRoomStyle] = useState(roomStyles[0]);
    const [selectedRatio, setSelectedRatio] = useState('1:1');
    const [characters, setCharacters] = useState<Character[]>([
        { id: Date.now(), name: 'Host', voice: 'Kore', gender: 'Male', age: 'Adult', description: 'MC / Host' }
    ]);
    const [script, setScript] = useState<Dialog[] | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [youtubeMeta, setYoutubeMeta] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    
    // Thumbnail Studio
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

    useEffect(() => {
        if (!thumbnailPrompt && topic) {
            setThumbnailPrompt(`Viral YouTube Podcast Thumbnail: "${topic}". Professional 3D render, studio setup, warm lighting, high contrast, 8k.`);
        }
    }, [topic, thumbnailPrompt]);

    const handleTypeChange = (type: 'solo' | 'team') => {
        setPodcastType(type);
        if (type === 'solo') {
            setCharacters([{ id: Date.now(), name: 'Host', voice: 'Kore', gender: 'Male', age: 'Adult', description: 'MC / Host' }]);
        } else {
            setCharacters([
                { id: Date.now(), name: 'Host', voice: 'Kore', gender: 'Male', age: 'Adult', description: 'MC / Host' },
                { id: Date.now() + 1, name: 'Guest', voice: 'Charon', gender: 'Female', age: 'Adult', description: 'Guest speaker' }
            ]);
        }
    };

    const updateCharacter = (id: number, field: keyof Character, value: any) => {
        setCharacters(chars => chars.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Please enter a topic.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setScript(null);
        setAudioUrl(null);
        setProgress("Drafting script...");

        try {
            const podcastScript = await generatePodcastScript({
                topic,
                language,
                podcastType,
                characters,
                durationInMinutes,
                speakingStyle
            });
            setScript(podcastScript);

            setProgress("Rendering host profile...");
            const hostPrompt = `3D animated portrait of a ${characters[0].gender} ${characters[0].age} podcast host. Style: Pixar 3D. Background: ${roomStyle}. High detail, 8k.`;
            const hostUrl = await generateImage(hostPrompt, '1:1');
            updateCharacter(characters[0].id, 'imageUrl', hostUrl);

            setProgress("Generating high-quality voiceover...");
            const speakerConfigs = characters.map(c => ({ speaker: c.name, voiceName: c.voice }));
            const base64Audio = await generateDialog(podcastScript, speakerConfigs);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            setAudioUrl(URL.createObjectURL(wavBlob));

            setProgress("Generating SEO Kit...");
            const meta = await generateYouTubeMetadata(topic, "Podcast conversation about " + topic, "Podcast");
            setYoutubeMeta(meta);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate podcast.");
        } finally {
            setIsLoading(false);
            setProgress("");
        }
    };

    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;
        setIsGeneratingThumbnail(true);
        try {
            const url = await generateImage(thumbnailPrompt, selectedRatio, 'High');
            setThumbnailUrl(url);
        } catch (err) {
            setError("Thumbnail failed.");
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col animate-fade-in text-gray-100 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 uppercase tracking-tighter leading-none">Podcast Studio</h2>
                        
                        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button onClick={() => handleTypeChange('solo')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${podcastType === 'solo' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Solo</button>
                            <button onClick={() => handleTypeChange('team')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${podcastType === 'team' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Team</button>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Topic</label>
                            <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic..." className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-4 text-white text-xs h-24 resize-none outline-none focus:ring-1 focus:ring-purple-500" />
                        </div>

                        <div className="space-y-4">
                            {characters.map((char, idx) => (
                                <div key={char.id} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 space-y-3">
                                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{idx === 0 ? "Host" : "Guest"}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input value={char.name} onChange={e => updateCharacter(char.id, 'name', e.target.value)} placeholder="Name" className="bg-gray-800 border-none rounded p-2 text-xs text-white" />
                                        <select value={char.voice} onChange={e => updateCharacter(char.id, 'voice', e.target.value)} className="bg-gray-800 border-none rounded p-2 text-xs text-white">
                                            {allVoices.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Duration (Min)</label>
                                <input type="number" value={durationInMinutes} onChange={e => setDurationInMinutes(parseInt(e.target.value) || 1)} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-2 text-center font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Backdrop</label>
                                <select value={roomStyle} onChange={e => setRoomStyle(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-2 text-[10px] text-white">
                                    {roomStyles.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={handleGenerate} disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50">
                            {isLoading ? <Spinner /> : '🚀 Launch Production'}
                        </button>
                    </div>
                </div>

                {/* Right side: Results */}
                <div className="lg:col-span-8 space-y-6">
                    {progress && (
                         <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/30 flex items-center gap-4 animate-pulse">
                            <Spinner />
                            <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest">{progress}</span>
                        </div>
                    )}

                    {/* Thumbnail Studio */}
                    <div className="bg-gray-800/40 p-6 rounded-[2.5rem] border border-gray-700 shadow-2xl animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><span className="text-2xl">🖼️</span> Thumbnail Studio</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="aspect-video bg-black rounded-2xl border border-gray-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                                {thumbnailUrl ? <img src={thumbnailUrl} className="w-full h-full object-cover" /> : <div className="text-center text-gray-700"><p className="text-[10px] uppercase font-black tracking-widest">Preview Area</p></div>}
                                {isGeneratingThumbnail && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm"><Spinner className="h-10 w-10 text-purple-500 mb-2" /><span className="text-[10px] font-black text-purple-500 animate-pulse">RENDERING...</span></div>}
                            </div>
                            <div className="flex flex-col justify-between">
                                <textarea value={thumbnailPrompt} onChange={e => setThumbnailPrompt(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-white text-xs h-24 resize-none outline-none focus:ring-1 focus:ring-purple-500" />
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    {aspectRatios.map(r => (
                                        <button key={r.value} onClick={() => setSelectedRatio(r.value)} className={`p-2 rounded-lg border text-[10px] font-black ${selectedRatio === r.value ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{r.value}</button>
                                    ))}
                                </div>
                                <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail} className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-xl uppercase text-xs">Generate Thumbnail</button>
                            </div>
                        </div>
                    </div>

                    {/* SEO Kit */}
                    {youtubeMeta && (
                        <div className="bg-gray-900 p-6 rounded-2xl border border-red-500/30 animate-fade-in space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                            <div className="flex items-center gap-2 text-red-500 mb-2 font-black uppercase text-sm tracking-widest"><YouTubeIcon /> Distribution Kit</div>
                            <div className="space-y-4 text-xs">
                                <div><label className="text-gray-500 uppercase block mb-1">Title</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-white font-bold">{youtubeMeta.title}</div></div>
                                <div><label className="text-gray-500 uppercase block mb-1">Description</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-gray-300 h-32 overflow-y-auto whitespace-pre-wrap">{youtubeMeta.description}</div></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-gray-500 uppercase block mb-1">Hashtags</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-blue-400">{youtubeMeta.hashtags.join(' ')}</div></div>
                                    <div><label className="text-gray-500 uppercase block mb-1">Keywords</label><div className="bg-black/40 p-3 rounded-lg border border-gray-800 text-emerald-400 line-clamp-2">{youtubeMeta.keywords.join(', ')}</div></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Media Player */}
                    {audioUrl && (
                        <div className="bg-[#0f172a] p-6 rounded-3xl border border-gray-700 shadow-xl space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Master Audio Stream</h3>
                            <audio controls src={audioUrl} className="w-full" />
                        </div>
                    )}

                    {/* Script Breakdown */}
                    {script && (
                        <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2 pb-20">
                            {script.map((line, idx) => (
                                <div key={idx} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700 flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 font-bold text-xs text-purple-400 border border-purple-500/30">{idx + 1}</div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">{line.character}</span>
                                        <p className="text-gray-300 text-sm leading-relaxed">{line.line}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PodcastGenerator;
