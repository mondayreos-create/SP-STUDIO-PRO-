
import React, { useState, useEffect } from 'react';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const VipPlan: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'demo'>('demo');
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = () => {
    const raw = localStorage.getItem('global_project_history');
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadHistory();
    // Listen for updates from other tabs
    window.addEventListener('HISTORY_UPDATED', loadHistory);
    return () => window.removeEventListener('HISTORY_UPDATED', loadHistory);
  }, [activeSubTab]);

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("តើអ្នកប្រាកដជាចង់លុបគម្រោងនេះមែនទេ? (Are you sure you want to delete this project permanently?)")) return;
    const updated = history.filter(p => p.id !== id);
    localStorage.setItem('global_project_history', JSON.stringify(updated));
    setHistory(updated);
    window.dispatchEvent(new Event('HISTORY_UPDATED'));
  };

  const handleExportBackup = () => {
    if (history.length === 0) {
        alert("No projects in vault to export.");
        return;
    }
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STUDIO_PRO_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target?.result as string);
            if (Array.isArray(data)) {
                const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
                const combined = [...data, ...existing].reduce((acc: any[], current: any) => {
                    const x = acc.find(item => item.id === current.id);
                    if (!x) return acc.concat([current]);
                    else return acc;
                }, []);
                
                localStorage.setItem('global_project_history', JSON.stringify(combined));
                setHistory(combined);
                window.dispatchEvent(new Event('HISTORY_UPDATED'));
                alert(`Backup restored! ${data.length} projects imported.`);
            }
        } catch (err) {
            alert("Invalid backup file. Please upload a valid .json project export.");
        }
    };
    reader.readAsText(file);
  };

  const handleLoadProject = (project: any) => {
    // Navigate and populate the tool
    const event = new CustomEvent('LOAD_PROJECT', { detail: project });
    window.dispatchEvent(event);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 text-center animate-fade-in pb-24 font-sans">
      <h2 className="text-5xl font-black text-[#facc15] mb-12 uppercase tracking-tighter drop-shadow-2xl">
        VIP Access Studio
      </h2>

      {/* SUB-TABS */}
      <div className="flex flex-wrap justify-center gap-2 mb-12 bg-[#1e293b]/40 p-1.5 rounded-2xl border border-gray-700/50 w-fit mx-auto shadow-2xl backdrop-blur-md">
        <button 
          onClick={() => setActiveSubTab('plans')}
          className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'plans' ? 'bg-[#1e293b] text-white shadow-lg border border-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-lg">💎</span> VIP Plans
        </button>
        <button 
          onClick={() => setActiveSubTab('demo')}
          className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'demo' ? 'bg-gradient-to-r from-[#9333ea] to-[#4f46e5] text-white shadow-lg border border-purple-500/50' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-lg">📦</span> Project Vault
        </button>
      </div>
      
      {activeSubTab === 'plans' ? (
        <div className="animate-fade-in space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-3xl border border-gray-700 p-8 flex flex-col opacity-80 group hover:border-gray-500 transition-colors">
                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest text-[10px]">Starter</h3>
                <div className="text-4xl font-black text-white my-6">$0<span className="text-lg text-gray-500 font-normal">/free</span></div>
                <ul className="text-gray-400 text-sm space-y-4 mb-10 text-left flex-grow font-medium">
                    <li className="flex items-center"><span className="text-green-500 mr-3">✓</span> Access to Basic Tools</li>
                    <li className="flex items-center"><span className="text-green-500 mr-3">✓</span> Standard Generation Speed</li>
                    <li className="flex items-center text-gray-600"><span className="mr-3">✕</span> 4K Ultra Render Quality</li>
                </ul>
                <button className="w-full py-3 rounded-xl bg-gray-700 text-white font-black uppercase text-[10px] tracking-widest cursor-default">Current Plan</button>
            </div>

            {/* Pro Plan */}
            <div className="bg-[#111827] rounded-3xl border-2 border-yellow-500 p-8 transform md:scale-105 shadow-[0_0_60px_rgba(234,179,8,0.2)] relative z-10 flex flex-col group hover:shadow-[0_0_80px_rgba(234,179,8,0.3)] transition-all">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-[9px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-2xl">Recommended</div>
                <h3 className="text-xl font-black text-yellow-500 uppercase tracking-widest text-[10px]">VIP Pro</h3>
                <div className="text-5xl font-black text-white my-6">$29<span className="text-lg text-gray-500 font-normal">/mo</span></div>
                <ul className="text-gray-300 text-sm space-y-4 mb-10 text-left flex-grow font-bold">
                    <li className="flex items-center"><span className="text-yellow-500 mr-3">★</span> Unlimited High-Res Generations</li>
                    <li className="flex items-center"><span className="text-yellow-500 mr-3">★</span> Ultra-Fast Render Pipeline</li>
                    <li className="flex items-center"><span className="text-yellow-500 mr-3">★</span> 4K Output + Commercial Rights</li>
                    <li className="flex items-center"><span className="text-yellow-500 mr-3">★</span> VIP Only Studio Features</li>
                </ul>
                <button className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black shadow-xl transition-all transform hover:scale-105 uppercase text-xs tracking-widest active:scale-95">Unlock Pro Access</button>
            </div>

            {/* Lifetime Plan */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-3xl border border-gray-700 p-8 flex flex-col group hover:border-indigo-500 transition-colors">
                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest text-[10px]">Lifetime</h3>
                <div className="text-4xl font-black text-white my-6">$199<span className="text-lg text-gray-500 font-normal">/once</span></div>
                <ul className="text-gray-400 text-sm space-y-4 mb-10 text-left flex-grow font-medium">
                    <li className="flex items-center"><span className="text-green-500 mr-3">✓</span> Permanent Access Key</li>
                    <li className="flex items-center"><span className="text-green-500 mr-3">✓</span> All Future Pro Tools Included</li>
                    <li className="flex items-center"><span className="text-green-500 mr-3">✓</span> Private Telegram Channel</li>
                </ul>
                <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest transition transform active:scale-95">Go Lifetime</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-12 max-w-5xl mx-auto">
          
          <div className="bg-[#1a1f2e]/80 p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl flex flex-col items-center">
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter flex items-center gap-3">
                <span className="text-3xl">📦</span> Central Project Manager
            </h3>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-8">Backup, Restore & Reuse your productions</p>
            
            <div className="flex gap-4 mb-12 flex-wrap justify-center">
                <button 
                  onClick={handleExportBackup}
                  className="px-8 py-3.5 bg-[#1e293b] hover:bg-gray-800 text-gray-300 hover:text-white font-black rounded-2xl border border-gray-600 transition-all flex items-center gap-3 shadow-xl uppercase tracking-tighter text-xs"
                >
                    <DownloadIcon /> Export Cloud Backup (.json)
                </button>
                <label className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-[0_10px_25px_rgba(147,51,234,0.3)] transition-all flex items-center gap-3 cursor-pointer uppercase tracking-tighter text-xs transform hover:scale-105 active:scale-95">
                    <span className="text-xl">☁️</span> Restore from File
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
            </div>

            <div className="w-full text-left bg-black/40 p-8 rounded-3xl border border-gray-800/50 shadow-inner">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Production Vault</h4>
                        <p className="text-[9px] text-red-500/70 font-bold uppercase italic">* Files auto-clear after 30 days of inactivity</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-cyan-400 font-black px-4 py-1 bg-cyan-900/30 rounded-full border border-cyan-800/50 shadow-lg uppercase tracking-widest">
                            {history.length} Saved Items
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((project) => {
                        const daysOld = Math.floor((Date.now() - (project.timestamp || Date.now())) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.max(0, 30 - daysOld);
                        
                        return (
                            <div 
                              key={project.id} 
                              className="bg-[#252b3d]/40 p-5 rounded-2xl border border-gray-700/50 hover:border-cyan-500/50 hover:bg-[#252b3d]/60 transition-all flex justify-between items-center group cursor-pointer shadow-lg"
                              onClick={() => handleLoadProject(project)}
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-14 h-14 bg-gray-800/80 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0 border border-gray-700 shadow-inner">
                                        {project.tool?.includes('video') ? '🎬' : (project.tool?.includes('image') || project.tool === 'generate') ? '🎨' : '📝'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-white font-black text-sm truncate uppercase tracking-tight">{project.title || "Untitled Project"}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] bg-indigo-900/40 text-indigo-400 font-black px-2 py-0.5 rounded border border-indigo-800 uppercase">{project.tool?.replace(/-/g, ' ')}</span>
                                            <span className="text-[9px] text-gray-500 font-bold">{new Date(project.timestamp || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 pl-4">
                                    <div className="text-right hidden sm:block">
                                        <p className={`text-[9px] font-black uppercase ${daysRemaining < 5 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                                            Expires in {daysRemaining} d
                                        </p>
                                    </div>
                                    <button 
                                      onClick={(e) => handleDeleteProject(project.id, e)}
                                      className="p-3 bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded-xl transition-all border border-red-900/30 hover:scale-110 active:scale-95"
                                      title="Delete Project"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    
                    {history.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-800">
                             <div className="text-5xl mb-4 opacity-10">📂</div>
                             <p className="text-xs font-black text-gray-600 uppercase tracking-[0.3em]">Vault is currently empty</p>
                             <p className="text-[10px] text-gray-700 mt-2">Start a project and click "Save Project" in the header to see it here.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="pt-8 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] font-black opacity-30">
                    AI Studio Media Management System • 2026
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipPlan;
