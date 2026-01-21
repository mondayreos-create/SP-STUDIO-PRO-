
import React, { useState } from 'react';
import { useLanguage } from './LanguageContext.tsx';
import JsonViewer from './JsonViewer.tsx';

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const HandyToolkit: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'color' | 'json' | 'lorem'>('color');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Color Picker State
  const [color, setColor] = useState('#3b82f6');

  // JSON Formatter State
  const [jsonInput, setJsonInput] = useState('');
  const [jsonParsedData, setJsonParsedData] = useState<any>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Lorem Ipsum State
  const [loremParagraphs, setLoremParagraphs] = useState(3);
  const [loremOutput, setLoremOutput] = useState('');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonParsedData(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
      setJsonParsedData(null);
    }
  };

  const generateLorem = () => {
    const text = [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio.",
      "Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
      "Integer in mauris eu nibh euismod gravida.",
      "Duis ac tellus et risus vulputate vehicula.",
      "Donec lobortis risus a elit. Etiam tempor.",
      "Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam.",
      "Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi.",
      "Duis sapien nunc, commodo et, interdum suscipit, sollicitudin et, dolor.",
      "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
      "Aliquam quis nisl. Mauris ac tellus et risus vulputate vehicula.",
    ];

    let result = [];
    for (let i = 0; i < loremParagraphs; i++) {
      let paragraph = [];
      const sentenceCount = Math.floor(Math.random() * 5) + 3;
      for (let j = 0; j < sentenceCount; j++) {
        paragraph.push(text[Math.floor(Math.random() * text.length)]);
      }
      result.push(paragraph.join(' '));
    }
    setLoremOutput(result.join('\n\n'));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col space-y-8 animate-fade-in pb-20">
      <div className="text-center">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 uppercase tracking-tighter mb-2">
          Handy Toolkit
        </h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Essential Utilities for Creators</p>
      </div>

      <div className="bg-[#1e293b]/60 rounded-[2.5rem] border border-gray-800 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Tabs */}
        <div className="flex bg-[#0f172a]/50 p-2 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('color')}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-2xl transition-all ${activeTab === 'color' ? 'bg-[#1e293b] text-white shadow-lg border border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
          >
            🎨 Color Picker
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-2xl transition-all ${activeTab === 'json' ? 'bg-[#1e293b] text-white shadow-lg border border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {"{ }"} JSON Studio
          </button>
          <button
            onClick={() => setActiveTab('lorem')}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-2xl transition-all ${activeTab === 'lorem' ? 'bg-[#1e293b] text-white shadow-lg border border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
          >
            📝 Lorem Ipsum
          </button>
        </div>

        <div className="p-8">
          {/* Color Picker Section */}
          {activeTab === 'color' && (
            <div className="flex flex-col md:flex-row gap-8 items-center animate-fade-in">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-32 rounded-3xl cursor-pointer bg-transparent border-none outline-none"
                  />
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="bg-[#0f172a] p-6 rounded-3xl border border-gray-800 shadow-inner space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">HEX</span>
                    <button
                      onClick={() => handleCopy(color, 'hex')}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors"
                    >
                      {copyStatus === 'hex' ? <CheckIcon /> : <CopyIcon />}
                      <span className="text-white font-mono uppercase">{color}</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">RGB</span>
                    <button
                      onClick={() => {
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        handleCopy(`rgb(${r}, ${g}, ${b})`, 'rgb');
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors"
                    >
                      {copyStatus === 'rgb' ? <CheckIcon /> : <CopyIcon />}
                      <span className="text-white font-mono uppercase">
                        {`rgb(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JSON Formatter Section */}
          {activeTab === 'json' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Input Raw JSON</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"name":"SP Tool","version":"4.5.3"}'
                  className="w-full bg-[#0f172a] border border-gray-800 rounded-3xl p-6 text-white text-sm font-mono h-48 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={formatJson}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-2xl shadow-xl transition transform active:scale-95 text-xs uppercase tracking-widest"
                >
                  Analyze & Inspect
                </button>
                <button
                  onClick={() => { setJsonInput(''); setJsonParsedData(null); setJsonError(null); }}
                  className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-gray-400 font-black rounded-2xl transition shadow-xl text-xs uppercase tracking-widest"
                >
                  Clear
                </button>
              </div>

              {jsonError && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-500 text-xs font-bold animate-shake">
                  Error: {jsonError}
                </div>
              )}

              {jsonParsedData && (
                <div className="space-y-4 animate-fade-in h-96">
                   <JsonViewer data={jsonParsedData} title="Formatted Result" />
                </div>
              )}
            </div>
          )}

          {/* Lorem Ipsum Section */}
          {activeTab === 'lorem' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 space-y-4 w-full">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Number of Paragraphs</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={loremParagraphs}
                    onChange={(e) => setLoremParagraphs(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl p-4 text-white font-black text-xl text-center focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                  />
                </div>
                <button
                  onClick={generateLorem}
                  className="flex-[2] w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black rounded-2xl shadow-xl transition transform active:scale-95 text-xs uppercase tracking-widest"
                >
                  Generate Lorem Ipsum
                </button>
              </div>

              {loremOutput && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Generated Text</label>
                    <button
                      onClick={() => handleCopy(loremOutput, 'lorem-out')}
                      className="flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 rounded-lg text-[10px] font-black uppercase transition-all"
                    >
                      {copyStatus === 'lorem-out' ? <CheckIcon /> : <CopyIcon />}
                      {copyStatus === 'lorem-out' ? 'Copied' : 'Copy Text'}
                    </button>
                  </div>
                  <div className="w-full bg-[#0f172a] border border-gray-800 rounded-3xl p-8 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap shadow-inner max-h-96 overflow-y-auto custom-scrollbar italic font-serif">
                    {loremOutput}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Development Utilities • SP Studio</p>
      </div>
    </div>
  );
};

export default HandyToolkit;
