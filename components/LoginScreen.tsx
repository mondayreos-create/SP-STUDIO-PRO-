
import React, { useEffect } from 'react';
import { useAuth } from './AuthContext.tsx';

const LoginScreen: React.FC = () => {
    const { bypassGoogle } = useAuth();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                bypassGoogle();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bypassGoogle]);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0f172a] z-50 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md mx-4 bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center relative z-10 flex flex-col items-center animate-fade-in">
                
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-8 shadow-lg shadow-cyan-500/30 transform rotate-6 hover:rotate-12 transition-transform duration-300">
                    <span className="text-4xl font-black text-white">SP</span>
                </div>

                <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">SP STUDIO PRO</h2>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] mb-10">VIP Studio</span>
                
                <p className="text-gray-400 mb-10 text-sm leading-relaxed">
                    AI Tools V.4 Pro
                    <br/>
                    <span className="text-gray-500">Professional Creative Environment</span>
                </p>
                
                <div className="w-full flex flex-col items-center gap-6">
                    <button 
                        onClick={bypassGoogle}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white font-bold text-lg shadow-xl shadow-blue-900/20 transition-all duration-200 flex items-center justify-center gap-3 group transform hover:scale-[1.02] active:scale-95"
                    >
                        <span className="text-2xl">🚀</span>
                        <span>Enter Studio</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-700/50 w-full text-[10px] text-gray-500 uppercase tracking-widest">
                    SP STUDIO PRO • 2026
                </div>
                <div className="mt-4 text-[10px] text-gray-600 animate-pulse font-bold">
                    Press ENTER to skip
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
