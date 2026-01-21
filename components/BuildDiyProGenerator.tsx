
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateImage } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5 text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const VideoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const HistoryIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const quickActions = [
    { label: 'New Build', icon: '🏗️', prompt: 'A brand new modern construction project, fresh materials, high detail foundation, scaffolding, crane in background, cinematic sunset light.' },
    { label: 'Room idea', icon: '🛋️', prompt: 'Interior design concept for a cozy living space, modern furniture, ambient lighting, large windows showing nature outside.' },
    { label: 'Build Sport Car', icon: '🏎️', prompt: 'DIY custom built sports car project in a garage, highly detailed engine components, glossy carbon fiber body, mechanic tools scattered.' },
    { label: 'Build DIY', icon: '🛠️', prompt: 'Creative DIY home project, handcrafted wooden structure, carpentry workshop setting, high resolution wood grain.' },
    { label: 'Luxury DIY Concept', icon: '✨', prompt: 'High-end luxury DIY design, premium materials, gold accents, marble textures, professional architectural render.' },
    { label: 'Random Idea', icon: '🎲', prompt: 'A unique and innovative architectural structure, futuristic and creative design, bioluminescent lighting effects.' },
    { label: 'DIY Home Renovation', icon: '🏠', prompt: 'DIY home renovation project in progress, tools scattered, painting walls, installing fixtures, realistic construction scene, dust in air particles.' },
    { label: 'Wood Floor Restoration', icon: '🪵', prompt: 'Restoring old wooden floor, heavy sanding machine in action, applying clear varnish, half done vs new comparison, macro detail.' },
    { label: 'Canal Restoration', icon: '🌊', prompt: 'Canal restoration project, excavators digging, stabilizing banks with stone, engineering work, water flow improvement.' },
    { label: 'Heavy Machinery', icon: '🏗️', prompt: 'Heavy machinery in action, long reach excavator dredging a river, mud splashing, dynamic construction angle, raw industrial power.' },
    { label: 'Bamboo Hut', icon: '🎋', prompt: 'Building an eco-friendly bamboo hut, detailed weaving techniques, natural materials, tropical jungle setting, warm atmospheric lighting.' },
    { label: 'Container Home', icon: '🚢', prompt: 'Modern shipping container house under construction, crane lowering a cargo unit, industrial chic design, steel textures, building site details.' },
    { label: 'Treehouse Build', icon: '🌳', prompt: 'DIY treehouse project in a massive oak tree, suspension bridge, wooden planks, climbing rope, sunny forest background.' },
    { label: 'Garden Pond', icon: '⛲', prompt: 'DIY backyard pond and waterfall construction, rubber liners, natural rocks being positioned, water splashing, lush landscaping.' },
    { label: 'Concrete Wall', icon: '🧱', prompt: 'Construction workers pouring liquid concrete into a tall wall mold, vibrating tools, grey industrial textures, realistic site dust.' },
    { label: 'Iron Welding', icon: '👨‍🏭', prompt: 'A welder working on a custom metal gate, sparks flying everywhere, protective gear, glowing blue welding light, workshop interior.' },
    { label: 'Tile Art', icon: '📐', prompt: 'Laying intricate geometric floor tiles in a large entryway, laser level line visible, thinset mortar, professional craftsmanship, macro view.' },
    { label: 'Kitchen Remodel', icon: '🍳', prompt: 'High-end kitchen renovation, installing marble countertops, modern gold faucets, worker fitting custom cabinetry, bright clean lighting.' },
    { label: 'Mud Brick Build', icon: '🏚️', prompt: 'Traditional mud brick house construction, sun-dried bricks, hands-on masonry, rural desert setting, high-detail earthy textures.' },
    { label: 'Solar Install', icon: '☀️', prompt: 'Installing solar panels on a modern slanted roof, technician with drill, reflective glass panels, blue sky, energy-efficient home project.' },
    { label: 'Furniture Craft', icon: '🪑', prompt: 'Building a custom live-edge wooden dining table, routing the wood, sawdust on table, epoxy resin being poured, carpentry masterpiece.' },
    { label: 'Pool Tiling', icon: '🏊', prompt: 'Empty luxury swimming pool being tiled with turquoise mosaic, workers crouching with trowels, sunny backyard, water reflections ready.' },
    { label: 'Modern Garage', icon: '🚘', prompt: 'DIY dream garage renovation, epoxy floor coating, custom tool walls, sleek lighting, premium car restoration space.' },
    { label: 'Greenhouse Build', icon: '🌱', prompt: 'Building a glass and wood greenhouse in a garden, transparent panels reflecting the sun, seedlings inside, garden tools nearby.' },
    { label: 'Roofing Work', icon: '🏘️', prompt: 'Roofers installing new terracotta shingles on a classic house, safety harness, stack of tiles, cinematic sunset sky background.' },
    { label: 'Plumbing DIY', icon: '🚰', prompt: 'Repairing under-sink copper piping, wrenches, copper pipe joints, water drops, high-detail industrial plumbing work.' },
    { label: 'Electric Setup', icon: '⚡', prompt: 'Installing modern electrical panel, colorful wires, wire cutters, organized circuit breakers, professional sparky work.' },
    { label: 'Landscape Art', icon: '🏞️', prompt: 'Large scale landscaping project, retaining stone walls, planting mature trees, garden lighting, excavator moving fertile soil.' },
];

const designStyles = [
    'Glass House', 'Container Home', 'Heritage / Classic', 
    'Bamboo Eco', 'Khmer Style', 'Stone Floor / Rustic', 
    'Modern Cave', 'Industrial', 'Minimalist'
];

const ratioOptions = [
    { id: '16:9', label: '16:9', width: 'w-8', height: 'h-4.5', apiValue: '16:9' },
    { id: '9:16', label: '9:16', width: 'w-4.5', height: 'h-8', apiValue: '9:16' },
    { id: '1:1', label: '1:1', width: 'w-6', height: 'h-6', apiValue: '1:1' },
    { id: '4:3', label: '4:3', width: 'w-6', height: 'h-4.5', apiValue: '4:3' },
    { id: '3:4', label: '3:4', width: 'w-4.5', height: 'h-6', apiValue: '3:4' },
    { id: '4:5', label: '4:5', width: 'w-4.8', height: 'h-6', apiValue: '3:4' }, 
    { id: '5:4', label: '5:4', width: 'w-6', height: 'h-4.8', apiValue: '4:3' },
];

const BuildDiyProGenerator: React.FC = () => {
    const [inputImage, setInputImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState(designStyles[0]);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    // Persistence
    useEffect(() => {
        const handleSave = (e: any) => {
            if (e.detail.tool !== 'build-diy-pro') return;
            const data = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                tool: 'build-diy-pro',
                category: 'vip',
                title: prompt.substring(0, 30) || "DIY Studio Project",
                data: { inputImage, prompt, selectedStyle, aspectRatio, generatedImage }
            };
            const history = JSON.parse(localStorage.getItem('global_project_history') || '[]');
            localStorage.setItem('global_project_history', JSON.stringify([data, ...history]));
            loadLocalHistory();
        };
        const handleLoad = (e: any) => {
            if (e.detail.tool !== 'build-diy-pro') return;
            const d = e.detail.data;
            if (d.inputImage) setInputImage(d.inputImage);
            if (d.prompt) setPrompt(d.prompt);
            if (d.selectedStyle) setSelectedStyle(d.selectedStyle);
            if (d.aspectRatio) setAspectRatio(d.aspectRatio);
            if (d.generatedImage) setGeneratedImage(d.generatedImage);
            setShowHistory(false);
        };
        window.addEventListener('REQUEST_PROJECT_SAVE', handleSave);
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSave);
            window.removeEventListener('LOAD_PROJECT', handleLoad);
        };
    }, [inputImage, prompt, selectedStyle, aspectRatio, generatedImage]);

    const loadLocalHistory = useCallback(() => {
        const historyRaw = localStorage.getItem('global_project_history');
        if (historyRaw) {
            try {
                const history = JSON.parse(historyRaw);
                const toolHistory = history.filter((p: any) => p.tool === 'build-diy-pro');
                setLocalHistory(toolHistory);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        loadLocalHistory();
    }, [loadLocalHistory]);

    const handleReloadHistory = (project: any) => {
        window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: project }));
        setShowHistory(false);
    };

    const generateDiyContent = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const parts: any[] = [];
            
            if (inputImage) {
                parts.push({ 
                    inlineData: { 
                        mimeType: inputImage.mimeType, 
                        data: inputImage.base64 
                    } 
                });
            }

            const currentRatio = ratioOptions.find(r => r.id === aspectRatio)?.apiValue || '16:9';

            const fullPrompt = `
                Generate a photorealistic 8k image based on this concept:
                Subject: ${prompt || "A creative DIY building project"}
                Style: ${selectedStyle}
                ${inputImage ? "Instruction: Use the provided image as a structural reference/blueprint and apply the described style and subject to it." : ""}
                Details: High quality, cinematic lighting, architectural photography, detailed textures, 100% realistic.
            `;
            
            parts.push({ text: fullPrompt });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    imageConfig: { aspectRatio: currentRatio as any }
                }
            });

            let foundImage = false;
            if (response.candidates && response.candidates.length > 0) {
                 for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        setGeneratedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                        foundImage = true;
                        break;
                    }
                }
            }
            
            if (!foundImage) throw new Error("No image generated.");

        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setInputImage({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `DIY_Studio_Pro_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };
    
    const getVideoProcessPrompt = () => {
        const subject = prompt || "a DIY building project";
        const styleText = selectedStyle || "Modern";
        return `Cinematic 4K construction timelapse. From empty ground to final structure: ${subject}. Style: ${styleText}. High-speed builders, sun moving across sky, intense satisfying process.`;
    };

    const handleClear = () => {
        setInputImage(null);
        setPrompt('');
        setSelectedStyle(designStyles[0]);
        setGeneratedImage(null);
        setError(null);
        setAspectRatio('16:9');
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 flex flex-col items-center">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>

            <div className="w-full flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            loadLocalHistory();
                            setShowHistory(!showHistory);
                        }} 
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 border shadow-lg ${showHistory ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-[#1e293b] border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                    >
                        <HistoryIcon /> {showHistory ? 'Hide History' : 'Reload History | ប្រវត្តផលិត'}
                    </button>
                </div>
                <button onClick={handleClear} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-300 bg-red-950/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-colors duration-200">
                    <TrashIcon className="h-4 w-4" /> Reset Studio | សម្អាត
                </button>
            </div>

            {showHistory && (
                <div className="w-full bg-[#0f172a]/95 border-2 border-indigo-500/50 p-6 rounded-3xl mb-8 animate-slide-down shadow-2xl relative z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5" /> DIY Studio History Vault
                        </h4>
                        <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-3xl transition-colors">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto custom-scrollbar pr-3">
                        {localHistory.length > 0 ? (
                            localHistory.map((project, idx) => (
                                <div 
                                    key={project.id} 
                                    onClick={() => handleReloadHistory(project)}
                                    className="bg-[#1e293b]/60 hover:bg-[#1e293b] border border-gray-700 p-5 rounded-2xl cursor-pointer transition-all group shadow-inner"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2.5 py-1 rounded-full font-black border border-indigo-800/50 uppercase tracking-tighter">#{localHistory.length - idx}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate mb-1">{project.data.prompt || "Untitled Project"}</p>
                                    <p className="text-gray-400 text-[10px] line-clamp-1 italic">{project.data.selectedStyle} • {project.data.aspectRatio}</p>
                                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">Click to Reload ➜</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest italic opacity-40">No previous productions found.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                {/* LEFT PANEL: CONFIGURATION */}
                <div className="lg:col-span-5 space-y-6 h-full">
                    <div className="bg-[#111827]/80 p-6 rounded-2xl border border-cyan-900/30 shadow-2xl h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="text-3xl">🏗️</span>
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-tighter">
                                DIY Studio Pro
                            </h2>
                        </div>

                        {/* 1. IMAGE REFERENCE */}
                        <div className="mb-8">
                            <label className="block text-[11px] font-black text-cyan-400 mb-3 uppercase tracking-[0.1em]">
                                1. IMAGE REFERENCE
                            </label>
                            <div className="relative w-full h-36 bg-[#0f172a] rounded-xl border-2 border-dashed border-gray-800 flex items-center justify-center overflow-hidden hover:border-cyan-500/50 transition-all group">
                                {inputImage ? (
                                    <>
                                        <img src={`data:${inputImage.mimeType};base64,${inputImage.base64}`} alt="Ref" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                             <button onClick={() => setInputImage(null)} className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition"><TrashIcon /></button>
                                        </div>
                                    </>
                                ) : (
                                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-center px-4">
                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Upload Reference Image</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* 2. ASPECT RATIO */}
                        <div className="mb-8">
                             <div className="flex items-center gap-2 text-cyan-400 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                <label className="text-[11px] font-black uppercase tracking-[0.1em]">
                                    ASPECT RATIO (PANEL SIZE)
                                </label>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {ratioOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setAspectRatio(option.id)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all transform active:scale-95 ${
                                            aspectRatio === option.id 
                                            ? 'bg-cyan-900/40 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                                            : 'bg-gray-800/40 border-gray-800 text-gray-600 hover:border-gray-700'
                                        }`}
                                    >
                                        <div className={`border-2 ${aspectRatio === option.id ? 'border-cyan-400' : 'border-gray-700'} ${option.width} ${option.height} mb-2 rounded-sm transition-colors`}></div>
                                        <span className="text-[10px] font-black tracking-tighter">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. QUICK ACTIONS */}
                        <div className="mb-8 flex-grow overflow-hidden flex flex-col">
                             <label className="block text-[11px] font-black text-gray-500 mb-3 uppercase tracking-widest">
                                QUICK ACTIONS (TABS)
                            </label>
                            <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-1">
                                {quickActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPrompt(action.prompt)}
                                        className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all text-left group ${prompt === action.prompt ? 'bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] text-white border-transparent shadow-lg' : 'bg-[#1e293b]/40 border-gray-800 text-gray-400 hover:bg-[#1e293b]'}`}
                                    >
                                        <span className="text-sm group-hover:scale-110 transition-transform">{action.icon}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-tight truncate">{action.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. PROMPT DETAILS */}
                        <div className="mb-8">
                            <label className="block text-[11px] font-black text-gray-500 mb-3 uppercase tracking-widest">
                                PROMPT DETAILS
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="A brand new modern construction project..."
                                className="w-full bg-[#0f172a] border border-gray-800 rounded-xl p-4 text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none h-24 resize-none shadow-inner leading-relaxed"
                            />
                        </div>

                        {/* 5. SELECT STYLE */}
                        <div className="mb-10">
                             <div className="flex items-center gap-2 text-gray-400 mb-4">
                                <span className="text-sm">🍄</span>
                                <label className="text-[11px] font-black uppercase tracking-widest">
                                    SELECT STYLE
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {designStyles.map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => setSelectedStyle(style)}
                                        className={`px-4 py-2 text-[10px] font-black rounded-full border-2 transition-all transform active:scale-95 ${
                                            selectedStyle === style 
                                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                                            : 'bg-gray-800/40 text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={generateDiyContent} 
                            disabled={isLoading || (!prompt && !inputImage)}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:brightness-110 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                        >
                            {isLoading ? <Spinner /> : '🚀'} 
                            {isLoading ? 'BUILDING...' : 'GENERATE DESIGN'}
                        </button>
                    </div>
                </div>

                {/* RIGHT PANEL: PREVIEW AREA */}
                <div className="lg:col-span-7 flex flex-col h-full">
                    <div className="bg-[#111827]/60 p-6 rounded-2xl border border-gray-800 flex flex-col h-full shadow-2xl relative min-h-[700px]">
                         {generatedImage ? (
                            <div className="w-full h-full flex flex-col">
                                <div className="relative flex-grow rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-black flex items-center justify-center">
                                    <img src={generatedImage} alt="Result" className="w-full h-auto object-contain max-h-[80vh]" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={handleDownload} className="px-8 py-4 bg-white text-black font-black rounded-full shadow-2xl hover:scale-105 transition flex items-center gap-3 uppercase text-xs tracking-widest"><DownloadIcon /> Download Design</button>
                                    </div>
                                </div>

                                <div className="mt-6 w-full bg-[#0f172a] p-4 rounded-2xl border border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button 
                                            onClick={() => handleCopyText(prompt || "DIY Design", 'prompt')} 
                                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-black rounded-xl border transition-all ${copyStatus === 'prompt' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            <CopyIcon /> {copyStatus === 'prompt' ? 'COPIED!' : 'PROMPT'}
                                        </button>
                                        <button 
                                            onClick={() => handleCopyText(getVideoProcessPrompt(), 'vprompt')} 
                                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-black rounded-xl border transition-all ${copyStatus === 'vprompt' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-purple-900/20 border-purple-900/50 text-purple-400 hover:bg-purple-900/40'}`}
                                        >
                                            <VideoIcon /> {copyStatus === 'vprompt' ? 'COPIED!' : 'VIDEO PROMPT'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 px-4 py-2 bg-black/40 rounded-lg border border-gray-800">
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{aspectRatio} RATIO</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-700 animate-fade-in">
                                <div className="w-24 h-24 bg-[#0f172a] rounded-full flex items-center justify-center mb-8 border-2 border-dashed border-gray-800">
                                    <span className="text-5xl opacity-20">🏗️</span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-600 uppercase tracking-tighter mb-2">Architectural Canvas</h3>
                                <p className="text-sm text-gray-500 max-w-sm text-center leading-relaxed">
                                    Configure your DIY vision on the left and click Generate to begin the high-speed production render.
                                </p>
                            </div>
                        )}
                        
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl z-50">
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 border-4 border-cyan-500/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 animate-pulse">Constructing Your Design...</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black">AI High-Resolution 8K Pipeline Active</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildDiyProGenerator;
