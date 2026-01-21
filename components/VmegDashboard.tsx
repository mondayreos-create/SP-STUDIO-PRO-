
import React from 'react';

const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const ToolsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const TasksIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const OrdersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AssetsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CrownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
);

const VmegDashboard: React.FC = () => {
    return (
        <div className="w-full max-w-7xl mx-auto flex gap-0 h-[calc(100vh-150px)] bg-gray-50 text-slate-800 overflow-hidden rounded-xl shadow-2xl border border-gray-200">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col py-6 px-4 hidden lg:flex">
                <div className="flex items-center gap-2 px-2 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-tr from-orange-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
                    <span className="font-bold text-xl tracking-tight text-slate-800">VMEG</span>
                </div>

                <nav className="space-y-1 flex-grow">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium shadow-md shadow-purple-200">
                        <DashboardIcon /> Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg font-medium transition">
                        <ToolsIcon /> All Tools
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg font-medium transition">
                        <TasksIcon /> My Tasks
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg font-medium transition">
                        <OrdersIcon /> My Orders
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg font-medium transition">
                        <AssetsIcon /> My Assets
                    </a>
                </nav>

                <div className="mt-auto">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg font-medium transition">
                        <HelpIcon /> Help Center
                    </a>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {/* Header */}
                <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold shadow-lg shadow-purple-200">
                            <span className="bg-white/20 rounded-full p-0.5"><CrownIcon /></span>
                            Upgrade Plan
                            <span className="bg-black/20 px-1.5 rounded text-[10px]">70% OFF</span>
                        </button>
                        <div className="px-4 py-1.5 border border-purple-200 text-purple-600 rounded-full text-sm font-medium bg-purple-50">
                            180 credits
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                            🌐 English ▾
                        </div>
                        <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center overflow-hidden">
                            <span className="text-lg">🐹</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Banner */}
                    <div className="relative w-full h-32 rounded-xl overflow-hidden bg-gray-900 flex items-center px-10 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-black to-pink-900 opacity-90"></div>
                        {/* Abstract shapes */}
                        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-purple-600/30 to-transparent skew-x-12"></div>
                        
                        <div className="relative z-10 flex items-center gap-4 w-full justify-between">
                            <div className="text-white">
                                <span className="text-3xl font-serif italic mr-2">Black Friday</span>
                                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">UP TO 70% OFF</span>
                            </div>
                            <button className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105">
                                Get the Deals →
                            </button>
                        </div>
                    </div>

                    {/* Hero Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Video Translator */}
                        <div className="bg-purple-50 rounded-2xl p-6 relative overflow-hidden border border-purple-100 shadow-sm hover:shadow-md transition group">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">Video Translator</h3>
                                        <p className="text-sm text-slate-500 mb-6">Translate and dub videos in any language</p>
                                    </div>
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">🔥 HOT</span>
                                </div>
                                <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition">
                                    <span className="text-lg">+</span> Create Now
                                </button>
                            </div>
                            {/* Decorative Illustration */}
                            <div className="absolute right-4 bottom-4 w-32 h-32 bg-white rounded-xl shadow-lg p-2 transform rotate-3 group-hover:rotate-0 transition duration-300">
                                <div className="w-full h-full bg-purple-100 rounded-lg flex flex-col items-center justify-center">
                                    <div className="text-2xl">👩‍💼</div>
                                    <div className="flex gap-1 mt-2">
                                        <span className="w-4 h-4 rounded-full bg-red-500 block"></span>
                                        <span className="w-4 h-4 rounded-full bg-yellow-400 block"></span>
                                        <span className="w-4 h-4 rounded-full bg-blue-500 block"></span>
                                    </div>
                                    <div className="mt-2 text-[8px] bg-purple-200 px-2 py-0.5 rounded-full text-purple-800">170+ Languages</div>
                                </div>
                            </div>
                        </div>

                        {/* Transcription */}
                        <div className="bg-blue-50 rounded-2xl p-6 relative overflow-hidden border border-blue-100 shadow-sm hover:shadow-md transition group">
                            <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">New</div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-slate-800 mb-1">Transcription</h3>
                                <p className="text-sm text-slate-500 mb-6">Convert your video and audio to accurate text</p>
                                <button className="flex items-center gap-2 px-6 py-2.5 bg-transparent border border-purple-500 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition">
                                    <span className="text-lg">+</span> Create Now
                                </button>
                            </div>
                             {/* Decorative Illustration */}
                             <div className="absolute right-4 bottom-4 w-40 h-28 rounded-xl overflow-hidden shadow-lg transform -rotate-2 group-hover:rotate-0 transition duration-300 border-2 border-white">
                                <img src="https://images.pexels.com/photos/416676/pexels-photo-416676.jpeg?auto=compress&cs=tinysrgb&w=400" alt="Surfing" className="w-full h-full object-cover" />
                                <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded text-[8px] text-slate-700">
                                    Surfing is a marine sport combining skill...
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Featured Tools */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Featured Tools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-xl shrink-0">
                                    🌐
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Audio Translator</h4>
                                    <p className="text-xs text-slate-500 mt-1">Translate audio into any language</p>
                                </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 text-xl shrink-0">
                                    T
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Subtitle Translator</h4>
                                    <p className="text-xs text-slate-500 mt-1">Generate and translate subtitles in any language.</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 text-xl shrink-0">
                                    🔊
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Text to Speech</h4>
                                    <p className="text-xs text-slate-500 mt-1">Convert text to speech in any language</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Tasks */}
                    <div>
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Recent Tasks</h3>
                            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 flex items-center">More ›</a>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Task 1 */}
                            <div className="group cursor-pointer">
                                <div className="aspect-video bg-black rounded-xl overflow-hidden relative mb-2">
                                    <img src="https://images.pexels.com/photos/8422032/pexels-photo-8422032.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Task" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-mono">00:21</div>
                                    <div className="absolute bottom-2 left-2 flex gap-1">
                                         <div className="w-4 h-4 rounded-full bg-red-600 border border-white"></div>
                                         <span className="text-white text-xs">›</span>
                                         <div className="w-4 h-4 rounded-full bg-blue-600 border border-white"></div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-white text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span>✓</span> Exported
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="bg-purple-100 text-purple-600 p-1 rounded">文</span> Video Translation
                                    </div>
                                    <span className="text-[10px] text-gray-400">2025/10/22 08:35</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-700 mt-1 truncate">BnqqaRonM1zx1oYpui3B0NCm...</p>
                            </div>

                            {/* Task 2 */}
                            <div className="group cursor-pointer">
                                <div className="aspect-video bg-black rounded-xl overflow-hidden relative mb-2">
                                    <img src="https://images.pexels.com/photos/4491461/pexels-photo-4491461.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Task" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-mono">01:00</div>
                                    <div className="absolute bottom-2 left-2 flex gap-1">
                                         <div className="w-4 h-4 rounded-full bg-red-600 border border-white"></div>
                                         <span className="text-white text-xs">›</span>
                                         <div className="w-4 h-4 rounded-full bg-blue-600 border border-white"></div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-white text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span>✓</span> Exported
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="bg-purple-100 text-purple-600 p-1 rounded">文</span> Video Translation
                                    </div>
                                    <span className="text-[10px] text-gray-400">2025/10/22 08:26</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-700 mt-1 truncate">1L-gk8zlq6voUAXpkp9rLRTRk2...</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default VmegDashboard;
