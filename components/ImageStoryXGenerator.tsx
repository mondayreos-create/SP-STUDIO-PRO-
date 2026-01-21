
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateConversationScript, generateImage, generateVoiceover, generateCharacters, PrebuiltVoice, Character } from '../services/geminiService.ts';

// --- Icons ---
const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
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

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const RecordIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 6h8v8H6V6z" clipRule="evenodd" />
    </svg>
);

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

interface DialogueLine {
    character: string;
    line: string;
    audioUrl?: string;
    duration?: number;
}

// Map gender to default voices
const getAutoVoice = (gender: string): PrebuiltVoice => {
    const g = gender.toLowerCase();
    if (g === 'male' || g.includes('boy') || g.includes('man') || g.includes('ប្រុស')) return 'Kore';
    if (g === 'female' || g.includes('girl') || g.includes('woman') || g.includes('ស្រី')) return 'Zephyr';
    return 'Kore'; // Fallback
};

const backgroundStyles = [
    'Modern Doctor Office',
    'Cozy Living Room',
    'City Park',
    'School Classroom',
    'Space Station',
    'Fantasy Forest',
    'Medieval Castle',
    'Cyberpunk Street',
    'Beach Sunset',
    'Coffee Shop',
    'Library',
    'Office Meeting Room',
    'Modern Kitchen',
    'Comfortable Bedroom',
    'Police Station',
    'Hospital Hallway',
    'Airplane Cabin',
    'Supermarket',
    'Gym / Fitness Center',
    'Concert Stage'
];

const exportResolutions = [
    { label: '720p', width: 1280 },
    { label: '1080p', width: 1920 },
    { label: '2K', width: 2560 },
    { label: '4K', width: 3840 },
];

const exportFormats = ['mp4', 'webm'];

const aspectRatios = [
    { label: '9:16 (Story/TikTok)', value: 9/16 },
    { label: '16:9 (YouTube)', value: 16/9 },
    { label: '1:1 (Square)', value: 1 },
    { label: '4:3 (Classic)', value: 4/3 },
    { label: '3:4 (Portrait)', value: 3/4 },
    { label: '4:5 (IG Portrait)', value: 4/5 },
    { label: '5:4 (Landscape)', value: 5/4 },
];

const ImageStoryXGenerator: React.FC = () => {
    // Config State
    const [topic, setTopic] = useState('Visiting the Doctor');
    const [setting, setSetting] = useState(backgroundStyles[0]);
    const [duration, setDuration] = useState(1); // Duration in minutes
    
    // Character Logic
    const [isAutoChar, setIsAutoChar] = useState(false);
    const [numAutoChars, setNumAutoChars] = useState(2);
    
    // Visual Options
    const [selectedAspectRatio, setSelectedAspectRatio] = useState(aspectRatios[0]);
    
    // Overlay Options
    const [overlayText, setOverlayText] = useState('');
    const [overlayLogo, setOverlayLogo] = useState<string | null>(null);
    
    // Character State (Array based)
    const [characters, setCharacters] = useState<Character[]>([
        { name: 'Dr. Smith', gender: 'Male', age: 'Adult', description: 'A kind doctor wearing a white coat and glasses.' },
        { name: 'Sarah', gender: 'Female', age: 'Adult', description: 'A young woman in casual clothes looking slightly worried.' }
    ]);

    // Generated Assets
    const [script, setScript] = useState<DialogueLine[]>([]);
    const [sceneImage, setSceneImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Playback/Export State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [copyScriptStatus, setCopyScriptStatus] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState('mp4');
    const [elapsedTime, setElapsedTime] = useState('00:00');
    
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptRef = useRef<DialogueLine[]>([]); // For access in animation loop
    const currentLineIndexRef = useRef(-1); // Critical for render loop sync
    const imageRef = useRef<HTMLImageElement | null>(null);
    const logoRef = useRef<HTMLImageElement | null>(null);
    const playbackTimeoutRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    const renderIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        scriptRef.current = script;
    }, [script]);

    useEffect(() => {
        currentLineIndexRef.current = currentLineIndex;
    }, [currentLineIndex]);

    // Initialize logo image ref when overlay logo changes
    useEffect(() => {
        if (overlayLogo) {
            const img = new Image();
            img.src = overlayLogo;
            logoRef.current = img;
        } else {
            logoRef.current = null;
        }
    }, [overlayLogo]);

    const handleUpdateCharacter = (index: number, field: keyof Character, value: string) => {
        const newChars = [...characters];
        if (newChars[index]) {
            newChars[index] = { ...newChars[index], [field]: value };
            setCharacters(newChars);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setOverlayLogo(url);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setScript([]);
        setSceneImage(null);
        setCurrentLineIndex(-1);

        try {
            let activeCharacters = characters;

            // 1. Auto-generate characters if selected
            if (isAutoChar) {
                setProgress('Auto-generating Characters...');
                const autoPrompt = `Context: ${topic}. Setting: ${setting}. Create diverse characters for a story.`;
                const genChars = await generateCharacters(autoPrompt, numAutoChars);
                activeCharacters = genChars;
                setCharacters(genChars); 
            }

            if (activeCharacters.length === 0) throw new Error("No characters defined.");

            // 2. Generate Script
            setProgress('Writing Script...');
            const dialogue = await generateConversationScript(topic, activeCharacters, duration);
            // dialogue is Dialog[] {character, line}
            
            // 3. Generate Scene Image
            setProgress('Creating Scene...');
            
            let charVisualDesc = '';
            if (activeCharacters.length === 1) {
                charVisualDesc = `${activeCharacters[0].description} standing in the center.`;
            } else {
                charVisualDesc = `${activeCharacters[0].description} standing on the LEFT side. `;
                const others = activeCharacters.slice(1).map(c => c.description).join(' and ');
                charVisualDesc += `${others} standing on the RIGHT side.`;
            }

            // Determine orientation string for image generation based on aspect ratio
            const orientation = selectedAspectRatio.value < 1 ? 'Vertical' : (selectedAspectRatio.value > 1 ? 'Horizontal' : 'Square');
            
            const imagePrompt = `${orientation} image. 2D Cartoon Style. A scene with characters: ${charVisualDesc} Setting: ${setting}. High quality, detailed background.`;
            const imageUrl = await generateImage(imagePrompt, selectedAspectRatio.value < 1 ? '9:16' : (selectedAspectRatio.value > 1 ? '16:9' : '1:1'));
            setSceneImage(imageUrl);
            
            const img = new Image();
            img.src = imageUrl;
            imageRef.current = img;

            // 4. Generate Audio
            setProgress('Generating Audio...');
            const processedScript: DialogueLine[] = [];
            
            for (let i = 0; i < dialogue.length; i++) {
                const lineData = dialogue[i]; // { character, line }
                const char = activeCharacters.find(c => c.name === lineData.character);
                const gender = char ? char.gender : 'Male';
                const voice = getAutoVoice(gender);
                
                try {
                    const base64Audio = await generateVoiceover(lineData.line, 'en', voice);
                    const bytes = decode(base64Audio);
                    
                    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
                    const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer.slice(0));
                    
                    const blob = new Blob([bytes], { type: 'audio/wav' }); 
                    const audioUrl = URL.createObjectURL(blob);

                    processedScript.push({
                        character: lineData.character,
                        line: lineData.line,
                        audioUrl: audioUrl,
                        duration: audioBuffer.duration
                    });
                    
                } catch (e) {
                    console.error("Audio gen failed for line", i, e);
                    processedScript.push({
                        character: lineData.character,
                        line: lineData.line
                    });
                }
                
                setProgress(`Generating Audio (${i + 1}/${dialogue.length})...`);
                if (i % 3 === 0) await new Promise(r => setTimeout(r, 100));
            }
            
            setScript(processedScript);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsGenerating(false);
            setProgress('');
        }
    };

    const drawCanvas = (lineIndex: number, targetWidth?: number, targetHeight?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use supplied dimensions (for export) or current canvas dimensions
        const width = targetWidth || canvas.width;
        const height = targetHeight || canvas.height;

        // 1. Draw Background
        if (imageRef.current && imageRef.current.complete) {
            // Draw background covering the canvas
            const imgRatio = imageRef.current.width / imageRef.current.height;
            const canvasRatio = width / height;
            let drawW, drawH, offsetX, offsetY;

            if (canvasRatio > imgRatio) {
                drawW = width;
                drawH = width / imgRatio;
                offsetX = 0;
                offsetY = (height - drawH) / 2;
            } else {
                drawW = height * imgRatio;
                drawH = height;
                offsetX = (width - drawW) / 2;
                offsetY = 0;
            }
            ctx.drawImage(imageRef.current, offsetX, offsetY, drawW, drawH);
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Draw Bubble if active line
        if (lineIndex >= 0 && scriptRef.current[lineIndex]) {
            const line = scriptRef.current[lineIndex];
            const charIndex = characters.findIndex(c => c.name === line.character);
            const isLeft = charIndex === 0; 
            
            // Scaling factors
            const scale = width / 1080; // Baseline 1080 width
            
            const bubbleWidth = 400 * scale;
            const bubbleX = isLeft ? 50 * scale : width - bubbleWidth - (50 * scale);
            const bubbleY = height * 0.3; 
            const padding = 30 * scale;
            const fontSize = 28 * scale;
            
            ctx.font = `bold ${fontSize}px Arial`;
            
            const words = line.line.split(' ');
            let lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                let w = ctx.measureText(currentLine + " " + words[i]).width;
                if (w < bubbleWidth - (60 * scale)) {
                    currentLine += " " + words[i];
                } else {
                    lines.push(currentLine);
                    currentLine = words[i];
                }
            }
            lines.push(currentLine);
            
            const lineHeight = 40 * scale;
            const bubbleHeight = (lines.length * lineHeight) + (padding * 2) + (30 * scale);

            // Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10 * scale;
            ctx.shadowOffsetX = 5 * scale;
            ctx.shadowOffsetY = 5 * scale;

            // Bubble Shape
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            // @ts-ignore
            if (ctx.roundRect) {
                 // @ts-ignore
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 30 * scale);
            } else {
                ctx.rect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            }
            ctx.fill();
            
            // Pointer
            ctx.beginPath();
            const pointerSize = 20 * scale;
            if (isLeft) {
                ctx.moveTo(bubbleX + (40*scale), bubbleY + bubbleHeight);
                ctx.lineTo(bubbleX + (20*scale), bubbleY + bubbleHeight + (30*scale));
                ctx.lineTo(bubbleX + (80*scale), bubbleY + bubbleHeight);
            } else {
                ctx.moveTo(bubbleX + bubbleWidth - (40*scale), bubbleY + bubbleHeight);
                ctx.lineTo(bubbleX + bubbleWidth - (20*scale), bubbleY + bubbleHeight + (30*scale));
                ctx.lineTo(bubbleX + bubbleWidth - (80*scale), bubbleY + bubbleHeight);
            }
            ctx.fill();

            // Reset Shadow
            ctx.shadowColor = 'transparent';

            // Speaker Name
            ctx.font = `bold ${24 * scale}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isLeft ? '#007bff' : '#e83e8c';
            ctx.fillText(line.character, bubbleX + padding, bubbleY + (20 * scale));

            // Text Body
            ctx.fillStyle = '#000';
            ctx.font = `${fontSize}px Arial`;
            lines.forEach((l, i) => {
                ctx.fillText(l, bubbleX + padding, bubbleY + (60 * scale) + (i * (35 * scale)));
            });
        }

        // 3. Draw Overlay Text (Bottom Center)
        if (overlayText) {
            const overlayFontSize = width * 0.04;
            ctx.font = `bold ${overlayFontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = overlayFontSize * 0.1;
            
            const textX = width / 2;
            const textY = height - (height * 0.05);
            
            ctx.strokeText(overlayText, textX, textY);
            ctx.fillText(overlayText, textX, textY);
        }

        // 4. Draw Logo (Top Right)
        if (logoRef.current && logoRef.current.complete) {
            const logoSize = width * 0.15; // 15% of width
            const logoPadding = width * 0.02;
            ctx.drawImage(logoRef.current, width - logoSize - logoPadding, logoPadding, logoSize, logoSize);
        }
    };

    // Trigger redraw when overlay props change
    useEffect(() => {
        if (!isPlaying && !isGenerating && script.length > 0) {
            // Redraw current state to show overlay changes immediately
            drawCanvas(currentLineIndex);
        }
    }, [overlayText, overlayLogo, selectedAspectRatio]);

    const playSequence = async (startIndex = 0) => {
        if (!script.length) return;
        setIsPlaying(true);
        setCurrentLineIndex(startIndex);
        drawCanvas(startIndex);

        if (!audioContextRef.current) audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        const playNext = async (index: number) => {
            if (index >= script.length) {
                setIsPlaying(false);
                setCurrentLineIndex(-1);
                drawCanvas(-1);
                return;
            }

            setCurrentLineIndex(index);
            drawCanvas(index);

            const line = script[index];
            if (line.audioUrl) {
                try {
                    const response = await fetch(line.audioUrl);
                    const buffer = await response.arrayBuffer();
                    const audioBuffer = await audioContextRef.current!.decodeAudioData(buffer);
                    
                    const source = audioContextRef.current!.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContextRef.current!.destination);
                    source.start(0);
                    
                    const durationMs = (audioBuffer.duration * 1000) + 500;
                    playbackTimeoutRef.current = window.setTimeout(() => playNext(index + 1), durationMs);
                } catch (e) {
                    setTimeout(() => playNext(index + 1), 2000);
                }
            } else {
                setTimeout(() => playNext(index + 1), 3000);
            }
        };
        playNext(startIndex);
    };

    const stopPlayback = () => {
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
        setIsPlaying(false);
        setCurrentLineIndex(-1);
        drawCanvas(-1);
    };

    const handleStopExport = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        // Stop the render loop
        if (renderIntervalRef.current) {
            clearInterval(renderIntervalRef.current);
            renderIntervalRef.current = null;
        }
        
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
            playbackTimeoutRef.current = null;
        }
        
        setIsExporting(false);
        setElapsedTime("00:00");
    };

    const handleExportVideo = async (resolutionWidth: number, format: string) => {
        const canvas = canvasRef.current;
        if (!canvas || !script.length) return;
        
        setShowExportMenu(false);
        setIsExporting(true);
        setElapsedTime("00:00");

        // 1. Configure High-Res Canvas
        const targetWidth = resolutionWidth;
        const targetHeight = Math.round(targetWidth / selectedAspectRatio.value);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 2. Setup Audio Context & Destination
        if (!audioContextRef.current) audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        const dest = audioContextRef.current.createMediaStreamDestination();

        // 3. Setup Stream & Recorder
        // Use fixed 30 FPS to maintain correct video duration even if browser throttles drawing (tab inactive)
        const stream = canvas.captureStream(30); 
        if (dest.stream.getAudioTracks().length > 0) {
            stream.addTrack(dest.stream.getAudioTracks()[0]);
        }

        // Determine MIME Type based on browser support and requested format
        let mimeType = 'video/webm;codecs=vp9'; // Default high quality
        
        if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, { 
            mimeType, 
            videoBitsPerSecond: 8000000 // 8 Mbps for high quality
        });
        
        mediaRecorderRef.current = recorder;
        
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
            
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `image_story_x_${targetWidth}p_${Date.now()}.${format === 'mp4' ? 'mp4' : 'webm'}`;
            a.click();
            setIsExporting(false);
            setElapsedTime('00:00');
            
            // Reset canvas to preview size
            canvas.width = 360; 
            canvas.height = 360 / selectedAspectRatio.value;
            drawCanvas(currentLineIndexRef.current); 
        };

        // Start Timer
        const startTime = Date.now();
        timerIntervalRef.current = window.setInterval(() => {
            const seconds = Math.floor((Date.now() - startTime) / 1000);
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            setElapsedTime(`${m}:${s}`);
        }, 1000);

        recorder.start();
        
        // 4. Start Continuous Render Loop (Using setInterval for consistent recording)
        // Using setInterval instead of requestAnimationFrame ensures recording continues even if tab is inactive
        renderIntervalRef.current = window.setInterval(() => {
            drawCanvas(currentLineIndexRef.current, targetWidth, targetHeight);
        }, 1000 / 30);
        
        // 5. Play Sequence logic adapted for Export
        let currentIndex = 0;
        
        const playNextForExport = async () => {
            // Check if user stopped it manually
            if (mediaRecorderRef.current?.state !== 'recording') return;

            if (currentIndex >= script.length) {
                mediaRecorderRef.current?.stop();
                setCurrentLineIndex(-1);
                return;
            }

            setCurrentLineIndex(currentIndex);
            // Also draw immediately for sync
            drawCanvas(currentIndex, targetWidth, targetHeight);
            
            const line = script[currentIndex];
            if (line.audioUrl) {
                try {
                    const response = await fetch(line.audioUrl);
                    const buffer = await response.arrayBuffer();
                    const audioBuffer = await audioContextRef.current!.decodeAudioData(buffer);
                    
                    const source = audioContextRef.current!.createBufferSource();
                    source.buffer = audioBuffer;
                    
                    // Connect to recorder destination ONLY (mute locally)
                    source.connect(dest); 
                    
                    source.start(0);
                    
                    // Wait for audio duration + small buffer
                    const durationMs = (audioBuffer.duration * 1000) + 500;
                    const timeoutId = window.setTimeout(() => {
                        currentIndex++;
                        playNextForExport();
                    }, durationMs);
                    playbackTimeoutRef.current = timeoutId;
                } catch (e) {
                    // Fallback if audio fails
                    const timeoutId = window.setTimeout(() => {
                        currentIndex++;
                        playNextForExport();
                    }, 2000);
                    playbackTimeoutRef.current = timeoutId;
                }
            } else {
                // No audio line
                const timeoutId = window.setTimeout(() => {
                    currentIndex++;
                    playNextForExport();
                }, 3000);
                playbackTimeoutRef.current = timeoutId;
            }
        };

        playNextForExport();
    };

    const handleCopyScript = () => {
        const text = script.map(l => `${l.character}: ${l.line}`).join('\n\n');
        navigator.clipboard.writeText(text);
        setCopyScriptStatus(true);
        setTimeout(() => setCopyScriptStatus(false), 2000);
    };

    const handleClear = () => {
        setScript([]);
        setSceneImage(null);
        setCurrentLineIndex(-1);
        setError(null);
        setDuration(1);
        setCharacters([
            { name: 'Dr. Smith', gender: 'Male', age: 'Adult', description: 'A kind doctor wearing a white coat and glasses.' },
            { name: 'Sarah', gender: 'Female', age: 'Adult', description: 'A young woman in casual clothes looking slightly worried.' }
        ]);
        setIsAutoChar(false);
        setOverlayLogo(null);
        setOverlayText('');
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                {/* Left: Configuration */}
                <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500 mb-2 flex items-center gap-2">
                        <span>💬</span> Image Story X
                    </h2>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Topic / Situation</label>
                        <textarea 
                            value={topic} 
                            onChange={(e) => setTopic(e.target.value)} 
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-20 resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Background</label>
                            <select 
                                value={setting} 
                                onChange={(e) => setSetting(e.target.value)} 
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                            >
                                {backgroundStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Aspect Ratio</label>
                            <select 
                                value={selectedAspectRatio.label} 
                                onChange={(e) => setSelectedAspectRatio(aspectRatios.find(r => r.label === e.target.value) || aspectRatios[0])}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                            >
                                {aspectRatios.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (Min)</label>
                            <div className="flex items-center bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
                                <button onClick={() => setDuration(Math.max(1, duration - 1))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white font-bold">-</button>
                                <input 
                                    type="number" 
                                    value={duration} 
                                    onChange={(e) => setDuration(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))} 
                                    className="w-full text-center bg-transparent outline-none text-white font-bold text-sm"
                                />
                                <button onClick={() => setDuration(Math.min(9, duration + 1))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white font-bold">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Add Overlay</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Text..." 
                                    value={overlayText}
                                    onChange={(e) => setOverlayText(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-white text-xs outline-none"
                                />
                                <label className="flex items-center justify-center bg-gray-700 rounded px-2 cursor-pointer border border-gray-600 hover:bg-gray-600">
                                    <span className="text-xs">{overlayLogo ? '✅' : '📷'}</span>
                                    <input type="file" accept="image/*,.gif,.ico" onChange={handleLogoUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Character Management */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-teal-400 uppercase">Characters</h3>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isAutoChar} 
                                    onChange={e => setIsAutoChar(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-500 focus:ring-teal-500"
                                />
                                <span className="text-xs text-gray-300">Auto-generate <SparklesIcon /></span>
                            </label>
                        </div>

                        {isAutoChar ? (
                            <div className="flex items-center gap-4 animate-fade-in">
                                <label className="text-sm text-gray-300">Number of Characters (1-4):</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="4" 
                                    value={numAutoChars} 
                                    onChange={(e) => setNumAutoChars(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
                                    className="w-16 bg-gray-800 border border-gray-600 rounded p-1 text-center text-white"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in max-h-48 overflow-y-auto custom-scrollbar">
                                {characters.map((char, index) => (
                                    <div key={index} className="bg-gray-800 p-2 rounded border border-gray-600">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">
                                                {index === 0 ? "Character 1 (Left)" : `Character ${index + 1} (Right)`}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <input 
                                                type="text" 
                                                value={char.name} 
                                                onChange={e => handleUpdateCharacter(index, 'name', e.target.value)} 
                                                placeholder="Name" 
                                                className="col-span-2 bg-gray-900 border-none rounded p-1 text-xs text-white" 
                                            />
                                            <select 
                                                value={char.gender} 
                                                onChange={e => handleUpdateCharacter(index, 'gender', e.target.value)} 
                                                className="bg-gray-900 border-none rounded p-1 text-xs text-white"
                                            >
                                                <option>Male</option><option>Female</option>
                                            </select>
                                        </div>
                                        <textarea 
                                            value={char.description} 
                                            onChange={e => handleUpdateCharacter(index, 'description', e.target.value)} 
                                            className="w-full bg-gray-900 border-none rounded p-2 text-xs text-white h-10 resize-none" 
                                            placeholder="Description..." 
                                        />
                                    </div>
                                ))}
                                {characters.length < 4 && (
                                    <button 
                                        onClick={() => setCharacters([...characters, { name: '', gender: 'Male', age: 'Adult', description: '' }])}
                                        className="w-full py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition"
                                    >
                                        + Add Character
                                    </button>
                                )}
                                {characters.length > 1 && (
                                    <button 
                                        onClick={() => setCharacters(characters.slice(0, -1))}
                                        className="w-full py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded border border-red-800/30 transition"
                                    >
                                        - Remove Last
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <Spinner /> : '🚀'} 
                        {isGenerating ? progress : 'Generate Story'}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-center text-sm">{error}</div>}
                </div>

                {/* Right: Canvas & Script */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-gray-800/60 p-4 rounded-xl border border-gray-700 flex flex-col justify-center items-center relative min-h-[660px]">
                        {/* Canvas Container with Dynamic Aspect Ratio */}
                        <div className="relative shadow-2xl bg-black" style={{ 
                            width: selectedAspectRatio.value < 1 ? '360px' : '640px', 
                            height: selectedAspectRatio.value < 1 ? '640px' : '360px',
                            maxHeight: '640px',
                            maxWidth: '100%'
                        }}>
                            <canvas 
                                ref={canvasRef} 
                                width={1080} 
                                height={1080 / selectedAspectRatio.value} 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        
                        {/* Controls moved here */}
                        {script.length > 0 && !isGenerating && (
                            <div className="flex gap-4 w-full justify-center px-4 mt-6">
                                <button 
                                    onClick={() => isPlaying ? stopPlayback() : playSequence()}
                                    className="bg-teal-500 hover:bg-teal-400 text-white rounded-full p-3 shadow-lg transition transform hover:scale-110 flex-shrink-0"
                                >
                                    <PlayIcon />
                                </button>
                                
                                <div className="relative">
                                    {isExporting ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="bg-red-600/90 text-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 font-bold animate-pulse">
                                                <StopIcon /> 
                                                <span>Rec: {elapsedTime}</span>
                                            </div>
                                            <button 
                                                onClick={handleStopExport}
                                                className="text-xs text-red-300 hover:text-white underline"
                                            >
                                                Stop & Save
                                            </button>
                                            <p className="text-[10px] text-yellow-300 bg-black/60 px-2 py-1 rounded border border-yellow-600/50">⚠️ KEEP TAB OPEN! (Prevents lag)</p>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="bg-red-600 hover:bg-red-500 text-white rounded-full px-6 py-3 shadow-lg transition transform hover:scale-110 flex items-center gap-2 font-bold"
                                            title="Auto Record Video"
                                        >
                                            <RecordIcon />
                                            🔴 Auto Record
                                        </button>
                                    )}
                                    
                                    {showExportMenu && !isExporting && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-20 overflow-hidden p-2">
                                            <div className="text-[10px] text-gray-400 mb-1 px-2 text-center">⚠️ Important: Keep this tab open & active during recording!</div>
                                            <div className="text-xs text-gray-400 mb-1 px-2">Format</div>
                                            <div className="flex gap-1 mb-2 px-2">
                                                {exportFormats.map(fmt => (
                                                    <button
                                                        key={fmt}
                                                        onClick={() => setSelectedFormat(fmt)}
                                                        className={`flex-1 py-1 text-xs rounded border transition ${selectedFormat === fmt ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                                                    >
                                                        {fmt.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="text-xs text-gray-400 mb-1 px-2">Resolution</div>
                                            <div className="flex flex-col gap-1">
                                                {exportResolutions.map(res => (
                                                    <button
                                                        key={res.label}
                                                        onClick={() => handleExportVideo(res.width, selectedFormat)}
                                                        className="block w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 hover:text-white transition rounded"
                                                    >
                                                        {res.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Script Display */}
                    {script.length > 0 && (
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 max-h-64 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-gray-300">Script Breakdown</h3>
                                <button 
                                    onClick={handleCopyScript} 
                                    className="flex items-center gap-1 text-xs text-teal-400 hover:text-white transition bg-gray-800 px-2 py-1 rounded border border-gray-600"
                                >
                                    {copyScriptStatus ? 'Copied!' : <><CopyIcon /> Copy Script</>}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {script.map((line, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`p-2 rounded text-xs border-l-4 transition ${idx === currentLineIndex ? 'bg-gray-700 border-teal-500' : 'bg-gray-800 border-gray-600'}`}
                                    >
                                        <span className={`font-bold ${characters[0] && line.character === characters[0].name ? 'text-blue-400' : 'text-pink-400'}`}>{line.character}:</span> <span className="text-gray-300">{line.line}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageStoryXGenerator;
