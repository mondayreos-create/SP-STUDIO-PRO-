
import React, { useState } from 'react';

interface JsonViewerProps {
    data: any;
    title?: string;
}

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const JsonViewer: React.FC<JsonViewerProps> = ({ data, title = "Data Preview" }) => {
    const [viewMode, setViewMode] = useState<'pretty' | 'raw' | 'compact'>('pretty');
    const [copyStatus, setCopyStatus] = useState(false);

    const getFormattedJson = () => {
        if (viewMode === 'raw') return JSON.stringify(data);
        if (viewMode === 'compact') return JSON.stringify(data, null, 0);
        return JSON.stringify(data, null, 2);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getFormattedJson());
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    // Simple syntax highlighter (simulated with regex for the "pretty" view)
    const highlightJson = (json: string) => {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'text-orange-400'; // number
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-cyan-400'; // key
                } else {
                    cls = 'text-emerald-400'; // string
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-purple-400'; // boolean
            } else if (/null/.test(match)) {
                cls = 'text-gray-500'; // null
            }
            return `<span class="${cls}">${match}</span>`;
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] rounded-2xl border border-gray-800 overflow-hidden shadow-inner">
            <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</span>
                <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
                    {(['pretty', 'compact', 'raw'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-all ${viewMode === mode ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-grow relative overflow-hidden group">
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={handleCopy}
                        className="p-2 bg-gray-800/80 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-xl backdrop-blur-sm flex items-center gap-2"
                    >
                        {copyStatus ? <span className="text-[9px] font-black">COPIED!</span> : <CopyIcon />}
                    </button>
                </div>
                
                <div className="h-full overflow-auto p-4 custom-scrollbar bg-black/20 font-mono text-[11px] leading-relaxed">
                    {viewMode === 'pretty' ? (
                        <pre 
                            className="whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: highlightJson(getFormattedJson()) }}
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap break-words text-gray-400">
                            {getFormattedJson()}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JsonViewer;
