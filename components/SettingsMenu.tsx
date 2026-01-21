
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext.tsx';
import type { LanguageCode } from '../utils/translations.ts';

const languages: { code: LanguageCode; name: string; flag: string }[] = [
    { code: 'km', name: 'Cambodia (ខ្មែរ)', flag: '🇰🇭' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ko', name: 'Korea (한국어)', flag: '🇰🇷' },
    { code: 'ja', name: 'Japan (日本語)', flag: '🇯🇵' },
    { code: 'zh', name: 'China (中文)', flag: '🇨🇳' },
    { code: 'fr', name: 'France (Français)', flag: '🇫🇷' },
    { code: 'es', name: 'Spain (Español)', flag: '🇪🇸' },
    { code: 'it', name: 'Italy (Italiano)', flag: '🇮🇹' },
    { code: 'pt', name: 'Portugal (Português)', flag: '🇵🇹' },
    { code: 'ru', name: 'Russia (Русский)', flag: '🇷🇺' },
];

interface SettingsMenuProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isDarkMode, toggleTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { language, setLanguage, t } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpenKeyManager = async () => {
        if ((window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
        } else {
            console.warn("AI Studio Key Selector not available in this environment.");
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-colors border ${isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 border-gray-600' : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-sm'}`}
                title={t('settings')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className={`absolute right-0 mt-2 w-80 max-w-[85vw] rounded-2xl shadow-2xl z-[100] p-5 space-y-6 border animate-fade-in ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                    <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className="text-lg font-black uppercase tracking-widest text-cyan-400">{t('settings')}</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500 text-2xl transition-colors">&times;</button>
                    </div>

                    {/* API Key Management Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gemini API Setup</span>
                            <a 
                                href="https://aistudio.google.com/app/apikey" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold"
                            >
                                Get Key 🔗
                            </a>
                        </div>
                        
                        <div className="group relative">
                            <button
                                onClick={handleOpenKeyManager}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all transform active:scale-95 ${isDarkMode ? 'bg-gray-900 border-gray-700 hover:border-indigo-500' : 'bg-gray-50 border-gray-300 hover:border-indigo-400 shadow-sm'}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-xl">🔑</span>
                                    <span className="font-bold text-xs truncate opacity-70">
                                        Change or Input Key
                                    </span>
                                </div>
                                <div className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase flex-shrink-0">
                                    Switch
                                </div>
                            </button>
                        </div>
                        
                        <div className="bg-black/20 rounded-xl p-3 border border-gray-700/50">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Quota Problem? | បញ្ហាកូតា</p>
                            <ul className="text-[8px] text-gray-400 space-y-1 list-disc pl-3">
                                <li>If you get "Resource Exhausted (429)", wait 60s.</li>
                                <li>Switch to a different API key to reset limits.</li>
                                <li>Free tier allows 15 requests/min on Flash models.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="flex justify-between items-center px-1 pt-2 border-t border-gray-700/30">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{isDarkMode ? '🌙' : '☀️'}</span>
                            <span className="font-bold text-sm uppercase tracking-tighter">{isDarkMode ? t('dark_mode') : t('light_mode')}</span>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${isDarkMode ? 'bg-cyan-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Language Select */}
                    <div className="space-y-2 px-1">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Language / ភាសា</label>
                        <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                className={`w-full p-3 text-sm font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.flag} {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsMenu;
