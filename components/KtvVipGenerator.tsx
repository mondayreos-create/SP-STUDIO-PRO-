
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { extractLyricsFromMedia, generateLyricsFromTitle } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 mr-2"}) => (
    <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const MagicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const aspectRatios = [
    { label: '16:9 (Landscape)', width: 1920, height: 1080 },
    { label: '9:16 (Portrait)', width: 1080, height: 1920 },
    { label: '1:1 (Square)', width: 1080, height: 1080 },
    { label: '4:3 (Standard)', width: 1440, height: 1080 },
    { label: '3:4 (Tall)', width: 1080, height: 1440 },
    { label: '21:9 (Ultrawide)', width: 2560, height: 1080 },
    { label: '9:21 (Tall Mobile)', width: 1080, height: 2560 },
    { label: '5:4 (Classic)', width: 1350, height: 1080 },
    { label: '4:5 (Insta Portrait)', width: 1080, height: 1350 },
    { label: '2:1 (Cinema)', width: 2160, height: 1080 },
    { label: '1:2 (Tall)', width: 1080, height: 2160 },
    { label: '3:2 (Photo)', width: 1620, height: 1080 },
    { label: '2:3 (Portrait Photo)', width: 1080, height: 1620 },
    { label: '18:9 (Mobile)', width: 2160, height: 1080 },
    { label: '9:18 (Mobile Vertical)', width: 1080, height: 2160 },
    { label: '16:10 (Monitor)', width: 1728, height: 1080 },
    { label: '10:16 (Tablet)', width: 1080, height: 1728 },
    { label: '1.85:1 (Film)', width: 1998, height: 1080 },
    { label: '2.39:1 (Widescreen)', width: 2581, height: 1080 },
    { label: '7:5 (Old TV)', width: 1512, height: 1080 }
];

const visualizerStyles = [
    { value: 'bar', label: '1. Radial Bars (Classic)' },
    { value: 'wave', label: '2. Circular Wave' },
    { value: 'line', label: '3. Bottom Spectrum' },
    { value: 'bar_bottom', label: '4. Bottom Bars' },
    { value: 'mirror', label: '5. Mirror Bars' },
    { value: 'wave_line', label: '6. Linear Wave' },
    { value: 'pulse_circle', label: '7. Circle Pulse' },
    { value: 'concentric', label: '8. Concentric Rings' },
    { value: 'dots', label: '9. Circle Dots' },
    { value: 'dual_wave', label: '10. Dual Wave' },
    { value: 'shatter', label: '11. Shatter Circle' },
    { value: 'hills', label: '12. Frequency Hills' },
    { value: 'pixel', label: '13. Pixel Rain' },
    { value: 'star_burst', label: '14. Star Burst' },
    { value: 'hexagon', label: '15. Hexagon Pulse' },
    { value: 'spiral', label: '16. Spiral Audio' },
    { value: 'tunnel', label: '17. Frequency Tunnel' },
    { value: 'heart', label: '18. Heart Beat' },
    { value: 'barcode', label: '19. Barcode' },
    { value: 'eclipse', label: '20. Eclipse' }
];

const particleStyles = [
    { value: 'floating', label: '1. Floating Dust' },
    { value: 'snow', label: '2. Snow Fall' },
    { value: 'rise', label: '3. Rising Bubbles' },
    { value: 'rain', label: '4. Rain Drops' },
    { value: 'fireflies', label: '5. Fireflies' },
    { value: 'confetti', label: '6. Confetti' },
    { value: 'star_warp', label: '7. Star Warp' },
    { value: 'side_wind', label: '8. Side Wind' },
    { value: 'hearts', label: '9. Floating Hearts' },
    { value: 'notes', label: '10. Musical Notes' },
    { value: 'glitch', label: '11. Glitch Squares' },
    { value: 'leaves', label: '12. Falling Leaves' },
    { value: 'smoke', label: '13. Rising Smoke' },
    { value: 'sparkles', label: '14. Sparkles' },
    { value: 'bubbles', label: '15. Big Bubbles' },
    { value: 'triangles', label: '16. Spinning Triangles' },
    { value: 'spiral_part', label: '17. Spiraling Out' },
    { value: 'matrix', label: '18. Matrix Code' },
    { value: 'bouncing', label: '19. Bouncing Balls' },
    { value: 'petals', label: '20. Sakura Petals' }
];

// Helper to read file as base64
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

const KtvVipGenerator: React.FC = () => {
    // --- State ---
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [backgroundFile, setBackgroundFile] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<string | null>(null);
    const [selectedRatio, setSelectedRatio] = useState(aspectRatios[0]);
    
    // Config State
    const [textTop, setTextTop] = useState('');
    const [textCenter, setTextCenter] = useState('');
    const [lyricsText, setLyricsText] = useState('');
    const [fontSize, setFontSize] = useState(40);
    const [logoSize, setLogoSize] = useState(25); // percentage
    const [visualizerSize, setVisualizerSize] = useState(60); // percentage
    const [visualizerColor, setVisualizerColor] = useState('#00ffcc');
    const [rainbowMode, setRainbowMode] = useState(false);
    const [particleCount, setParticleCount] = useState(50);
    
    // Style & Effects
    const [visualizerStyle, setVisualizerStyle] = useState(visualizerStyles[0].value);
    const [particleStyle, setParticleStyle] = useState(particleStyles[0].value);
    
    // Speed Controls
    const [logoSpeed, setLogoSpeed] = useState(2.0); // 0 to 20
    const [lyricsSpeed, setLyricsSpeed] = useState(2.0); // 1 to 20

    const [enableVisualizer, setEnableVisualizer] = useState(true);
    const [enableParticles, setEnableParticles] = useState(true);
    const [enableLogoSpin, setEnableLogoSpin] = useState(true);
    const [enableBeatSync, setEnableBeatSync] = useState(true); 
    const [karaokeMode, setKaraokeMode] = useState(false);
    const [vocalRemover, setVocalRemover] = useState(false);

    // Extraction/Search State
    const [isExtractingLyrics, setIsExtractingLyrics] = useState(false);
    const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);

    // Refs for config to avoid re-renders in loop
    const configRef = useRef({
        textTop, textCenter, lyricsText, fontSize, logoSize, visualizerSize, 
        visualizerColor, logoSpeed, lyricsSpeed, enableVisualizer, enableParticles, 
        enableLogoSpin, enableBeatSync, visualizerStyle, particleStyle, particleCount, 
        rainbowMode, karaokeMode
    });

    // Sync refs
    useEffect(() => {
        configRef.current = {
            textTop, textCenter, lyricsText, fontSize, logoSize, visualizerSize, 
            visualizerColor, logoSpeed, lyricsSpeed, enableVisualizer, enableParticles, 
            enableLogoSpin, enableBeatSync, visualizerStyle, particleStyle, particleCount, 
            rainbowMode, karaokeMode
        };
    }, [textTop, textCenter, lyricsText, fontSize, logoSize, visualizerSize, visualizerColor, logoSpeed, lyricsSpeed, enableVisualizer, enableParticles, enableLogoSpin, enableBeatSync, visualizerStyle, particleStyle, particleCount, rainbowMode, karaokeMode]);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const dryGainRef = useRef<GainNode | null>(null);
    const wetGainRef = useRef<GainNode | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const particlesRef = useRef<any[]>([]);
    const hueRef = useRef(0);
    
    // Animation Refs
    const logoRotationRef = useRef(0);
    const lyricsScrollPosRef = useRef(0);
    const lastTimeRef = useRef<number>(0);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Recording
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // --- Initialization ---
    useEffect(() => {
        const parts = [];
        for (let i = 0; i < 300; i++) { // Max particles buffer
            parts.push(createParticle());
        }
        particlesRef.current = parts;

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    // Handle Vocal Remover Filter Update - Switch between Original and Advanced Phase Cancellation
    useEffect(() => {
        if (audioContextRef.current && dryGainRef.current && wetGainRef.current) {
            const now = audioContextRef.current.currentTime;
            // Smooth crossfade to avoid clicks
            if (vocalRemover) {
                // Engage Vocal Remover: Mute Dry, Unmute Wet
                dryGainRef.current.gain.setTargetAtTime(0, now, 0.1);
                wetGainRef.current.gain.setTargetAtTime(1.5, now, 0.1); // Boost gain slightly to compensate for cut vocals
            } else {
                // Normal Mode: Unmute Dry, Mute Wet
                dryGainRef.current.gain.setTargetAtTime(1, now, 0.1);
                wetGainRef.current.gain.setTargetAtTime(0, now, 0.1);
            }
        }
    }, [vocalRemover]);

    const createParticle = () => ({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 3 + 1,
        speedY: Math.random() * 0.002 + 0.001,
        speedX: (Math.random() - 0.5) * 0.002,
        opacity: Math.random() * 0.5 + 0.2,
        rotation: Math.random() * 360,
        type: Math.floor(Math.random() * 3) 
    });

    // --- Handlers ---
    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            const url = URL.createObjectURL(file);
            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.load();
            }
            setIsPlaying(false);
            // Reset extraction state when new audio is loaded
            setIsExtractingLyrics(false);
            setExtractionError(null);
            
            // Auto Set Top Title from Filename (removing extension)
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            setTextTop(nameWithoutExt);
        }
    };

    const handleImageUpload = (setter: React.Dispatch<React.SetStateAction<string | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setter(url);
        }
    };

    const handleAutoGetLyrics = async () => {
        if (!audioFile) {
            setExtractionError("Please upload an audio file first.");
            return;
        }
        setIsExtractingLyrics(true);
        setExtractionError(null);
        
        try {
            const base64Audio = await fileToBase64(audioFile);
            const lyrics = await extractLyricsFromMedia(base64Audio, audioFile.type);
            setLyricsText(lyrics);
        } catch (err) {
            console.error("Failed to extract lyrics:", err);
            setExtractionError(err instanceof Error ? err.message : "Failed to extract lyrics.");
        } finally {
            setIsExtractingLyrics(false);
        }
    };

    const handleSearchLyrics = async () => {
        // Prioritize the "Top Title" as the search query, or fallback to file name if available
        const searchTerm = textTop || (audioFile ? audioFile.name.replace(/\.[^/.]+$/, "") : "");
        
        if (!searchTerm || searchTerm.trim().length === 0) {
            setExtractionError("Please enter a song title in 'Top Title' to search.");
            return;
        }

        setIsSearchingLyrics(true);
        setExtractionError(null);

        try {
            const lyrics = await generateLyricsFromTitle(searchTerm);
            setLyricsText(lyrics);
        } catch (err) {
            setExtractionError("Could not find lyrics for this title.");
        } finally {
            setIsSearchingLyrics(false);
        }
    };

    const togglePlay = async () => {
        if (!audioRef.current || !audioFile) return;

        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
            const ctx = audioContextRef.current;

            // Master Analyser
            analyserRef.current = ctx.createAnalyser();
            analyserRef.current.fftSize = 4096; 
            analyserRef.current.smoothingTimeConstant = 0.8; 

            // Gains for switching modes
            const dryGain = ctx.createGain();
            dryGainRef.current = dryGain;
            
            const wetGain = ctx.createGain();
            wetGain.gain.value = 0; // Default off
            wetGainRef.current = wetGain;

            sourceRef.current = ctx.createMediaElementSource(audioRef.current);

            // --- Path 1: Normal Audio (Dry) ---
            sourceRef.current.connect(dryGain);
            dryGain.connect(analyserRef.current);
            
            // --- Path 2: Vocal Remover (Advanced Phase Cancellation with Bass Recovery) ---
            // 1. Split Channels to L and R
            const splitter = ctx.createChannelSplitter(2);
            sourceRef.current.connect(splitter);

            // 2. Phase Inversion Path (The Karaoke Effect)
            // Invert Right channel
            const inverter = ctx.createGain();
            inverter.gain.value = -1;
            splitter.connect(inverter, 1); // Connect Right to Inverter

            // Merge L + (-R). This cancels out center-panned content (Vocals)
            const phaseMerger = ctx.createChannelMerger(2);
            splitter.connect(phaseMerger, 0, 0); // L -> L
            splitter.connect(phaseMerger, 0, 1); // L -> R (Mono-ish output to both ears)
            inverter.connect(phaseMerger, 0, 0); // -R -> L
            inverter.connect(phaseMerger, 0, 1); // -R -> R

            // High Pass on the cancelled signal to remove muddy artifacts
            const highPass = ctx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 120; 
            highPass.Q.value = 0.7;
            phaseMerger.connect(highPass);

            // 3. Bass Recovery Path (Keep the beat!)
            // Since phase cancellation kills bass (which is center), we need to add it back from the source
            const lowPass = ctx.createBiquadFilter();
            lowPass.type = 'lowpass';
            lowPass.frequency.value = 120; // Extract bass below 120Hz
            lowPass.Q.value = 0.7;
            
            const bassGain = ctx.createGain();
            bassGain.gain.value = 1.0; // Full volume for bass

            // Sum source to mono for consistent bass
            const bassMerger = ctx.createChannelMerger(2);
            sourceRef.current.connect(lowPass);
            lowPass.connect(bassGain);
            bassGain.connect(bassMerger, 0, 0);
            bassGain.connect(bassMerger, 0, 1);

            // 4. Final Mix (Cancelled Mids/Highs + Original Bass)
            // Create a master merge node for the "Wet" (Karaoke) signal
            // We cannot simply merge two mergers. We connect them to the WetGain.
            
            highPass.connect(wetGain); // No-Vocal Mids/Highs
            bassGain.connect(wetGain); // Original Bass
            
            // Final Destination
            wetGain.connect(analyserRef.current);
            analyserRef.current.connect(ctx.destination);
            
            // Initial State Check
            if (vocalRemover) {
                 dryGain.gain.value = 0;
                 wetGain.gain.value = 1.5;
            }
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleClear = () => {
        setAudioFile(null);
        setBackgroundFile(null);
        setLogoFile(null);
        setTextTop('');
        setTextCenter('');
        setLyricsText('');
        setIsPlaying(false);
        setLogoSpeed(2.0);
        setLyricsSpeed(2.0);
        setVisualizerStyle('bar');
        setParticleStyle('floating');
        setVisualizerColor('#00ffcc');
        setRainbowMode(false);
        setKaraokeMode(false);
        setVocalRemover(false);
        setIsExtractingLyrics(false);
        setIsSearchingLyrics(false);
        setExtractionError(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const startRecording = () => {
        if (!canvasRef.current || !audioRef.current || !analyserRef.current) return;
        const canvasStream = canvasRef.current.captureStream(60);
        if (audioContextRef.current && analyserRef.current) {
             const dest = audioContextRef.current.createMediaStreamDestination();
             // Connect the current output (post-processing) to the recorder
             analyserRef.current.connect(dest);
             const audioTrack = dest.stream.getAudioTracks()[0];
             canvasStream.addTrack(audioTrack);
        }
        const recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 10000000 });
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ktv-vip-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        if (!isPlaying) togglePlay();
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
        if (isPlaying) togglePlay();
    };

    // --- Rendering Loop ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bgImg = new Image();
        if (backgroundFile) bgImg.src = backgroundFile;
        const logoImg = new Image();
        if (logoFile) logoImg.src = logoFile;

        const render = (time: number) => {
            if (!ctx || !canvas) return;
            const config = configRef.current;

            if (!lastTimeRef.current) lastTimeRef.current = time;
            const deltaTime = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;
            const safeDelta = Math.min(deltaTime, 0.1); 

            // Clear & BG
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (backgroundFile && bgImg.complete) {
                const ratio = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
                const cx = (canvas.width - bgImg.width * ratio) / 2;
                const cy = (canvas.height - bgImg.height * ratio) / 2;
                ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, cx, cy, bgImg.width * ratio, bgImg.height * ratio);
            } else {
                const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                grad.addColorStop(0, '#1a1a2e');
                grad.addColorStop(1, '#16213e');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Audio Analysis
            let frequencyData = new Uint8Array(0);
            let averageFreq = 0;
            if (analyserRef.current) {
                const bufferLength = analyserRef.current.frequencyBinCount;
                frequencyData = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(frequencyData);
                let sum = 0;
                for(let i = 0; i < bufferLength; i++) sum += frequencyData[i];
                averageFreq = sum / bufferLength;
            }

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const minDim = Math.min(canvas.width, canvas.height);
            const radiusBase = (minDim * (config.visualizerSize / 100)) / 2;
            const pulse = (averageFreq / 255) * 30;

            // Update Hue for Rainbow
            if (config.rainbowMode) {
                hueRef.current = (hueRef.current + 1) % 360;
            }
            const activeColor = config.rainbowMode ? `hsl(${hueRef.current}, 100%, 50%)` : config.visualizerColor;

            // --- PARTICLES ---
            if (config.enableParticles) {
                const activeParticles = particlesRef.current.slice(0, config.particleCount * 2);
                activeParticles.forEach(p => {
                    let moveX = p.speedX;
                    let moveY = p.speedY;

                    switch(config.particleStyle) {
                        case 'snow': moveY = p.speedY * 2; moveX = Math.sin(time / 1000 + p.y * 10) * 0.001; break;
                        case 'rise': moveY = -p.speedY * 2; moveX = Math.sin(time / 1000 + p.y * 10) * 0.001; break;
                        case 'rain': moveY = p.speedY * 10; moveX = 0; break;
                        case 'fireflies': moveX = (Math.random() - 0.5) * 0.005; moveY = (Math.random() - 0.5) * 0.005; break;
                        case 'side_wind': moveX = p.speedY * 3; moveY = Math.sin(time/500 + p.x)*0.001; break;
                        case 'spiral_part': 
                            const angle = time / 1000 + p.y * 10;
                            moveX = Math.cos(angle) * 0.005;
                            moveY = Math.sin(angle) * 0.005;
                            break;
                        default: break; // floating
                    }

                    p.x += moveX;
                    p.y += moveY;
                    p.rotation += 2;

                    if (p.y < -0.1) p.y = 1.1; if (p.y > 1.1) p.y = -0.1;
                    if (p.x < -0.1) p.x = 1.1; if (p.x > 1.1) p.x = -0.1;

                    ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = activeColor;
                    ctx.strokeStyle = activeColor;
                    
                    const px = p.x * canvas.width;
                    const py = p.y * canvas.height;
                    const size = p.size * (1 + (averageFreq/255));

                    ctx.save();
                    ctx.translate(px, py);
                    ctx.rotate((p.rotation * Math.PI) / 180);

                    if (['confetti', 'glitch', 'matrix'].includes(config.particleStyle)) {
                        ctx.fillRect(-size, -size, size*2, size*2);
                    } else if (['hearts'].includes(config.particleStyle)) {
                        ctx.font = `${size*4}px Arial`; ctx.fillText('❤', 0, 0);
                    } else if (['notes'].includes(config.particleStyle)) {
                        ctx.font = `${size*4}px Arial`; ctx.fillText('♪', 0, 0);
                    } else if (['petals'].includes(config.particleStyle)) {
                        ctx.font = `${size*4}px Arial`; ctx.fillText('🌸', 0, 0);
                    } else if (['leaves'].includes(config.particleStyle)) {
                        ctx.font = `${size*4}px Arial`; ctx.fillText('🍂', 0, 0);
                    } else if (['star_warp', 'sparkles'].includes(config.particleStyle)) {
                        ctx.beginPath();
                        for(let i=0; i<5; i++){
                            ctx.lineTo(Math.cos((18+i*72)*0.0174)*size*2, Math.sin((18+i*72)*0.0174)*size*2);
                            ctx.lineTo(Math.cos((54+i*72)*0.0174)*size, Math.sin((54+i*72)*0.0174)*size);
                        }
                        ctx.fill();
                    } else if (['rain'].includes(config.particleStyle)) {
                        ctx.fillRect(0, 0, 2, size * 10);
                    } else if (['triangles'].includes(config.particleStyle)) {
                        ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); ctx.fill();
                    } else {
                        // Default Circle
                        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                });
                ctx.globalAlpha = 1;
            }

            // 6. Draw Logo
            if (logoFile && logoImg.complete) {
                const logoR = radiusBase * (config.logoSize / 30);
                ctx.save();
                ctx.translate(centerX, centerY);
                if (isPlaying && config.enableLogoSpin) {
                    const rotationSpeed = config.logoSpeed * 0.5; 
                    const beatBoost = config.enableBeatSync ? (averageFreq / 255) * 2.0 : 0; // Use Beat Sync config
                    logoRotationRef.current += (rotationSpeed + beatBoost) * safeDelta;
                }
                ctx.rotate(logoRotationRef.current);
                ctx.beginPath();
                ctx.arc(0, 0, logoR, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(logoImg, -logoR, -logoR, logoR * 2, logoR * 2);
                
                // Beat overlay
                if (isPlaying) {
                    ctx.fillStyle = `rgba(255,255,255,${(averageFreq/255)*0.2})`;
                    ctx.fill();
                }

                ctx.restore();
                
                // Ring
                ctx.beginPath();
                ctx.arc(centerX, centerY, logoR, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 0;
                ctx.stroke();
            }

            // 7. Text Overlay
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            const fontFamily = "'Moul', 'Hanuman', 'Battambang', 'Arial', sans-serif";

            if (config.textTop) {
                ctx.font = `bold ${config.fontSize * 1.2}px ${fontFamily}`;
                ctx.fillText(config.textTop, centerX, canvas.height * 0.1);
            }

            if (config.textCenter) {
                ctx.font = `${config.fontSize}px ${fontFamily}`;
                ctx.fillStyle = activeColor;
                ctx.fillText(config.textCenter, centerX, centerY + radiusBase + 100);
            }

            // 8. Lyrics Scrolling
            if (config.lyricsText) {
                const formattedLyrics = config.lyricsText.replace(/\n/g, '   •   ');
                const totalWidth = ctx.measureText(formattedLyrics).width;
                const screenWidth = canvas.width;

                const scrollSpeedPixelsPerSecond = config.lyricsSpeed * 30;
                lyricsScrollPosRef.current += scrollSpeedPixelsPerSecond * safeDelta;

                if (lyricsScrollPosRef.current > totalWidth + screenWidth) {
                    lyricsScrollPosRef.current = 0;
                }

                const renderX = screenWidth - lyricsScrollPosRef.current;
                const renderY = canvas.height - 50;

                if (config.karaokeMode) {
                    // Premium KTV Styling (White Text, Blue Glow/Stroke)
                    const fontSize = config.fontSize * 1.5; 
                    ctx.font = `900 ${fontSize}px ${fontFamily}`;
                    
                    // 1. Outer Glow
                    ctx.shadowColor = '#0066ff'; // Bright Blue Glow
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    
                    // 2. Heavy Stroke (Blue)
                    ctx.lineWidth = 7;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#002288'; // Darker Blue for stroke definition
                    ctx.strokeText(formattedLyrics, renderX, renderY);
                    
                    // 3. Inner Fill (White)
                    ctx.fillStyle = '#FFFFFF';
                    // Reset shadow to ensure the white text is crisp on top
                    ctx.shadowBlur = 0; 
                    ctx.fillText(formattedLyrics, renderX, renderY);
                    
                } else {
                    // Standard Scrolling (Ticker Style)
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(0, canvas.height - 80, canvas.width, 60);
                    
                    ctx.fillStyle = '#ffcc00';
                    ctx.font = `bold ${config.fontSize * 0.9}px ${fontFamily}`;
                    ctx.fillText(formattedLyrics, renderX, renderY);
                }
                
                ctx.textBaseline = 'alphabetic';
            }

            animationFrameRef.current = requestAnimationFrame(render);
        };

        animationFrameRef.current = requestAnimationFrame(render);

    }, [backgroundFile, logoFile, isPlaying, selectedRatio]); // Re-render when ratio changes

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const updateTime = () => {
                setCurrentTime(audio.currentTime);
                setDuration(audio.duration || 0);
            };
            const handleEnded = () => setIsPlaying(false);
            audio.addEventListener('timeupdate', updateTime);
            audio.addEventListener('ended', handleEnded);
            return () => {
                audio.removeEventListener('timeupdate', updateTime);
                audio.removeEventListener('ended', handleEnded);
            };
        }
    }, []);

    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col h-full">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel */}
                <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700 space-y-6 h-fit max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-4">
                            KTV VIP (Visualizer)
                        </h2>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">1. Upload Audio</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-grow flex items-center justify-center px-4 py-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition border border-gray-600">
                                    <span className="ml-2 text-sm text-gray-200 truncate">{audioFile ? audioFile.name : 'Select MP3 File...'}</span>
                                    <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                                </label>
                                {audioFile && (
                                    <button onClick={() => { setAudioFile(null); if(audioRef.current) audioRef.current.src = ""; setIsPlaying(false); }} className="p-3 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg border border-red-600/50 transition">
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Background</label>
                                <div className="relative w-full h-20">
                                    <label className="block w-full h-full bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 border border-gray-600 overflow-hidden relative">
                                        {backgroundFile ? (
                                            <img src={backgroundFile} alt="BG" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-gray-400">Add IMG</div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleImageUpload(setBackgroundFile)} className="hidden" />
                                    </label>
                                    {backgroundFile && (
                                        <button onClick={() => setBackgroundFile(null)} className="absolute top-1 right-1 p-1 bg-red-600/50 hover:bg-red-600 text-white rounded-full transition text-[10px]">
                                            <TrashIcon className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Center Logo</label>
                                <div className="relative w-full h-20">
                                    <label className="block w-full h-full bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 border border-gray-600 overflow-hidden relative">
                                        {logoFile ? (
                                            <img src={logoFile} alt="Logo" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-gray-400">Add IMG</div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleImageUpload(setLogoFile)} className="hidden" />
                                    </label>
                                    {logoFile && (
                                        <button onClick={() => setLogoFile(null)} className="absolute top-1 right-1 p-1 bg-red-600/50 hover:bg-red-600 text-white rounded-full transition text-[10px]">
                                            <TrashIcon className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Aspect Ratio / Size</label>
                                <select 
                                    value={selectedRatio.label} 
                                    onChange={(e) => setSelectedRatio(aspectRatios.find(r => r.label === e.target.value) || aspectRatios[0])}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                                >
                                    {aspectRatios.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Top Title</label>
                                <input type="text" value={textTop} onChange={e => setTextTop(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Center Text</label>
                                <input type="text" value={textCenter} onChange={e => setTextCenter(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1 gap-1">
                                    <label className="block text-xs font-semibold text-gray-400">Lyrics</label>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={handleSearchLyrics}
                                            disabled={isSearchingLyrics || (!textTop && (!audioFile || !audioFile.name))}
                                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded transition disabled:opacity-50"
                                            title="Search lyrics by Title (uses Top Title or Filename)"
                                        >
                                            {isSearchingLyrics ? <Spinner className="h-3 w-3 m-0"/> : <SearchIcon />}
                                            🔍 Search Lyrics
                                        </button>
                                        <button 
                                            onClick={handleAutoGetLyrics}
                                            disabled={isExtractingLyrics || !audioFile}
                                            className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] rounded transition disabled:opacity-50"
                                            title="Auto-transcribe from audio"
                                        >
                                            {isExtractingLyrics ? <Spinner className="h-3 w-3 m-0"/> : <MagicIcon />}
                                            ✨ Get from Audio
                                        </button>
                                    </div>
                                </div>
                                <textarea 
                                    value={lyricsText} 
                                    onChange={e => setLyricsText(e.target.value)} 
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm h-20 resize-y placeholder-gray-500" 
                                    placeholder={isExtractingLyrics ? "Listening to song..." : isSearchingLyrics ? "Searching for lyrics..." : "Paste lyrics here or use tools above..."}
                                    disabled={isExtractingLyrics || isSearchingLyrics}
                                />
                                {extractionError && <p className="text-[10px] text-red-400 mt-1">{extractionError}</p>}
                            </div>
                        </div>

                        <div className="mt-4 space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">Effects (20 Styles)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Visualizer</label>
                                    <select value={visualizerStyle} onChange={e => setVisualizerStyle(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded text-xs p-1 text-white">
                                        {visualizerStyles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Particles</label>
                                    <select value={particleStyle} onChange={e => setParticleStyle(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded text-xs p-1 text-white">
                                        {particleStyles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="block text-xs text-gray-400">Color</label>
                                <input type="color" value={visualizerColor} onChange={e => setVisualizerColor(e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer p-0"/>
                                <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-300">
                                    <input type="checkbox" checked={rainbowMode} onChange={e => setRainbowMode(e.target.checked)} className="rounded bg-gray-700 border-gray-600"/> Rainbow Mode 🌈
                                </label>
                            </div>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Size %</span><span>{visualizerSize}</span></div>
                                <input type="range" min="10" max="150" value={visualizerSize} onChange={e => setVisualizerSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"/>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Particles</span><span>{particleCount}</span></div>
                                <input type="range" min="0" max="150" value={particleCount} onChange={e => setParticleCount(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"/>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Logo Speed</span><span>{logoSpeed.toFixed(1)}</span></div>
                                <input type="range" min="0" max="20" step="0.1" value={logoSpeed} onChange={e => setLogoSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"/>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Lyrics Speed</span><span>{lyricsSpeed.toFixed(1)}</span></div>
                                <input type="range" min="0.5" max="20" step="0.1" value={lyricsSpeed} onChange={e => setLyricsSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"/>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-300">
                                <label className="flex items-center gap-1 cursor-pointer bg-gray-900 p-1.5 rounded"><input type="checkbox" checked={enableVisualizer} onChange={e => setEnableVisualizer(e.target.checked)}/> Visual</label>
                                <label className="flex items-center gap-1 cursor-pointer bg-gray-900 p-1.5 rounded"><input type="checkbox" checked={enableParticles} onChange={e => setEnableParticles(e.target.checked)}/> Part</label>
                                <label className="flex items-center gap-1 cursor-pointer bg-gray-900 p-1.5 rounded"><input type="checkbox" checked={enableLogoSpin} onChange={e => setEnableLogoSpin(e.target.checked)}/> Spin</label>
                                <label className="flex items-center gap-1 cursor-pointer bg-gray-900 p-1.5 rounded"><input type="checkbox" checked={enableBeatSync} onChange={e => setEnableBeatSync(e.target.checked)}/> 🎵 Beat Sync</label>
                            </div>
                             <div className="grid grid-cols-1 gap-2 text-[10px] text-gray-300 pt-2 border-t border-gray-700">
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-900 p-2 rounded border border-yellow-500/30 hover:border-yellow-500">
                                    <input type="checkbox" checked={karaokeMode} onChange={e => setKaraokeMode(e.target.checked)} className="text-yellow-500 focus:ring-yellow-500"/> 
                                    🎤 អក្សររត់តាមបទ (Karaoke Style)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-900 p-2 rounded border border-red-500/30 hover:border-red-500">
                                    <input type="checkbox" checked={vocalRemover} onChange={e => setVocalRemover(e.target.checked)} className="text-red-500 focus:ring-red-500"/> 
                                    🔇 បិទសំលេងច្រៀង (Vocal Remover)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="bg-black rounded-lg border border-gray-700 overflow-hidden shadow-2xl relative flex items-center justify-center" style={{ aspectRatio: `${selectedRatio.width}/${selectedRatio.height}`, maxHeight: '70vh' }}>
                        <canvas 
                            ref={canvasRef} 
                            width={selectedRatio.width} 
                            height={selectedRatio.height} 
                            className="w-full h-full object-contain"
                        />
                        <audio ref={audioRef} crossOrigin="anonymous" className="hidden" />
                    </div>

                    <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button onClick={togglePlay} disabled={!audioFile} className={`w-12 h-12 flex items-center justify-center rounded-full transition shadow-lg ${isPlaying ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'} ${!audioFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> : <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}
                            </button>
                            <div className="flex-grow">
                                <p className="text-xs text-gray-400 font-mono mb-1">{formatTime(currentTime)} / {formatTime(duration)}</p>
                                <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-pink-500 transition-all duration-100" style={{ width: `${(currentTime/duration)*100 || 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            {isRecording ? (
                                <button onClick={stopRecording} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg animate-pulse"><span className="w-3 h-3 bg-white rounded-sm"></span> Stop</button>
                            ) : (
                                <button onClick={startRecording} disabled={!audioFile} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Record</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KtvVipGenerator;
