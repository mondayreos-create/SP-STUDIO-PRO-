
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from './LanguageContext.tsx';
import JsonViewer from './JsonViewer.tsx';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ExportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);

const ProjectVault: React.FC = () => {
  const { t } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

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
    window.addEventListener('HISTORY_UPDATED', loadHistory);
    return () => window.removeEventListener('HISTORY_UPDATED', loadHistory);
  }, []);

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("តើអ្នកប្រាកដជាចង់លុបគម្រោងនេះមែនទេ? (Delete permanently?)")) return;
    const updated = history.filter(p => p.id !== id);
    localStorage.setItem('global_project_history', JSON.stringify(updated));
    setHistory(updated);
  };

  const handleShare = async (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
        title: project.title || 'Studio Pro Project',
        text: `Check out this ${project.tool?.replace(/-/g, ' ')} production: ${project.title}`,
        url: window.location.href,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error('Share failed:', err);
        }
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
        alert('Project details copied to clipboard!');
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return history;
    return history.filter(p => 
        (p.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
        (p.tool?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-4 flex items-center text-gray-500"><SearchIcon /></div>
              <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vault..."
                  className="w-full bg-[#0f172a] border-2 border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-bold text-sm shadow-inner"
              />
          </div>
          <button 
            onClick={() => {
                const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `STUDIO_PRO_BACKUP.json`;
                a.click();
            }}
            className="px-6 py-3.5 bg-[#1e293b] hover:bg-gray-800 text-gray-300 font-black rounded-2xl border-2 border-gray-700 transition-all flex items-center gap-3 uppercase text-xs shadow-xl"
          >
            <ExportIcon /> Export All Data
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((project) => (
              <div 
                key={project.id} 
                className="bg-[#1e293b]/60 p-6 rounded-[2rem] border-2 border-gray-800 hover:border-cyan-500/50 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden"
              >
                  <div className="mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] bg-cyan-900/40 text-cyan-400 font-black px-2 py-0.5 rounded-full border border-cyan-800 uppercase tracking-tighter">
                            {project.tool?.replace(/-/g, ' ')}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={(e) => handleShare(project, e)} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Share Project"><ShareIcon /></button>
                            <button onClick={(e) => handleDeleteProject(project.id, e)} className="text-gray-600 hover:text-red-500 transition-colors" title="Delete Project"><TrashIcon /></button>
                        </div>
                      </div>
                      <h4 className="text-white font-black text-sm uppercase truncate mb-1">{project.title || "Untitled Production"}</h4>
                      <p className="text-[10px] text-gray-500 font-bold">{new Date(project.timestamp).toLocaleDateString()}</p>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedProject(project)}
                    className="w-full mt-2 py-3 bg-gray-900/50 hover:bg-gray-800 border border-gray-700 rounded-xl text-xs font-black uppercase tracking-widest text-cyan-400 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="flex items-center gap-2"><EyeIcon /> {t('btn_view_more')}</span>
                  </button>
              </div>
          ))}
          
          {filteredHistory.length === 0 && (
              <div className="col-span-full py-32 text-center text-gray-600 font-black uppercase tracking-[0.4em] opacity-20">
                   Vault is empty
              </div>
          )}
      </div>

      {/* DETAIL MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
            <div className="bg-[#0b0f1a] border border-gray-700 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedProject.title || "Blueprint Inspection"}</h2>
                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mt-1">Data Asset ID: {selectedProject.id}</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={(e) => handleShare(selectedProject, e)}
                            className="p-3 bg-gray-800 hover:bg-cyan-600 text-white rounded-full transition-all flex items-center gap-2 px-6"
                        >
                            <ShareIcon /> <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
                        </button>
                        <button onClick={() => setSelectedProject(null)} className="p-3 bg-gray-800 hover:bg-red-600 text-white rounded-full transition-all">✕</button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Production Origin</label>
                                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 text-sm font-bold text-white uppercase">
                                    {selectedProject.tool}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Timestamp</label>
                                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 text-sm font-bold text-gray-400">
                                    {new Date(selectedProject.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col h-full min-h-[400px]">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Structure Inspector</label>
                            <JsonViewer data={selectedProject.data} title="Asset Data" />
                        </div>
                    </div>
                </div>
                
                <div className="p-8 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-4">
                    <button 
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('LOAD_PROJECT', { detail: selectedProject }));
                            setSelectedProject(null);
                        }}
                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-xl transform active:scale-95 transition-all"
                    >
                        Load Into Studio
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProjectVault;
