
import React, { useState, useMemo, useEffect } from 'react';

// Import all components
import WorkTimer from './components/WorkTimer.tsx';
import AnimatedTitle from './components/AnimatedTitle.tsx';
import { useAuth } from './components/AuthContext.tsx';
import { useLanguage } from './components/LanguageContext.tsx';
import UserProfile from './components/UserProfile.tsx';
import SettingsMenu from './components/SettingsMenu.tsx';
import VipPlan from './components/VipPlan.tsx';
import KaMongKhnhomGenerator from './components/KaMongKhnhomGenerator.tsx';
import SamrayRueungGenerator from './components/SamrayRueungGenerator.tsx';
import ThreeDStudioPro from './components/ThreeDStudioPro.tsx';
import ProjectVault from './components/ProjectVault.tsx';
import DesignCarGenerator from './components/DesignCarGenerator.tsx';
import DesignHouseGenerator from './components/DesignHouseGenerator.tsx';
import DesignMotoGenerator from './components/DesignMotoGenerator.tsx';
import DesignRoomAsmr from './components/DesignRoomAsmr.tsx';
import DesignBicycleGenerator from './components/DesignBicycleGenerator.tsx';
import RoomCleaningPro from './components/RoomCleaningPro.tsx';
import SleepingRoomPro from './components/SleepingRoomPro.tsx';
import BuildingForestHouseGenerator from './components/BuildingForestHouseGenerator.tsx';
import FarmingProGenerator from './components/FarmingProGenerator.tsx';
import LightningGenerator from './components/LightningGenerator.tsx';
import ProductionLineGenerator from './components/ProductionLineGenerator.tsx';
import RoomRenovationPro from './components/RoomRenovationPro.tsx';
import ConstructionBuildingGenerator from './components/ConstructionBuildingGenerator.tsx';
import SuperCarManufacturing from './components/SuperCarManufacturing.tsx';
import SuperTruckManufacturing from './components/SuperTruckManufacturing.tsx';
import ModernAgriTechGenerator from './components/ModernAgriTechGenerator.tsx';
import AsmrSilentRevivalGenerator from './components/AsmrSilentRevivalGenerator.tsx';
import HollywoodMvGenerator from './components/HollywoodMvGenerator.tsx';
import StoryGeneratorMv from './components/StoryGeneratorMv.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import ExteriorHomeGenerator from './components/ExteriorHomeGenerator.tsx';
import RestorationAsmrGenerator from './components/RestorationAsmrGenerator.tsx';

const VERSION = "4.5.3 PRO";

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const AnimatedCheckmark = ({ className = "w-4 h-4" }) => (
    <svg className={`${className} animate-pop-in`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
    </svg>
);

const App: React.FC = () => {
  const [activeSubCategory, setActiveSubCategory] = useState<string>('studio_management');
  const [activeTool, setActiveTool] = useState<string>('project-vault');
  const { t } = useLanguage();
  const { isGoogleBypassed } = useAuth();
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    studio_management: true,
    architecture: true,
    auto_tech: false,
    creative: false,
    industrial: false
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toolRegistry: Record<string, Record<string, any>> = {
    studio_management: {
      'project-vault': { labelKey: 'tool_project_vault', icon: '📦', component: ProjectVault, color: 'from-blue-500 to-indigo-600' },
      'vip-plan': { labelKey: 'tool_vip_plan', icon: '💎', component: VipPlan, color: 'from-purple-500 to-pink-600' }
    },
    architecture: {
      'design-house': { labelKey: 'tool_design_house', icon: '🏠', component: DesignHouseGenerator, color: 'from-emerald-500 to-teal-600' },
      'construction-building': { labelKey: 'tool_construction_building', icon: '🏗️', component: ConstructionBuildingGenerator, color: 'from-orange-500 to-amber-600' },
      'forest-house': { labelKey: 'tool_forest_house', icon: '🌲', component: BuildingForestHouseGenerator, color: 'from-green-600 to-emerald-800' }
    },
    auto_tech: {
      'restoration-asmr': { labelKey: 'tool_restoration_asmr', icon: '🛠️', component: RestorationAsmrGenerator, color: 'from-amber-500 to-red-600' },
      'design-car': { labelKey: 'tool_design_car', icon: '🚗', component: DesignCarGenerator, color: 'from-orange-500 to-red-600' },
      'design-moto': { labelKey: 'tool_design_moto', icon: '🏍️', component: DesignMotoGenerator, color: 'from-blue-500 to-indigo-600' },
      'design-bicycle': { labelKey: 'tool_design_bicycle', icon: '🚲', component: DesignBicycleGenerator, color: 'from-green-500 to-teal-600' },
      'exterior-home': { labelKey: 'tool_exterior_home', icon: '🛖', component: ExteriorHomeGenerator, color: 'from-amber-600 to-yellow-600' }
    },
    creative: {
      'story-gen-mv': { labelKey: 'tool_story_gen_mv', icon: '🎬', component: StoryGeneratorMv, color: 'from-purple-600 to-indigo-700' },
      'hollywood-mv': { labelKey: 'tool_hollywood_mv', icon: '🎥', component: HollywoodMvGenerator, color: 'from-red-600 to-rose-700' },
      'kamong-khnhom': { labelKey: 'tool_kamong_khnhom', icon: '🧞‍♂️', component: KaMongKhnhomGenerator, color: 'from-pink-500 to-rose-600' },
      'samray-rueung': { labelKey: 'tool_samray_rueung', icon: '🎞️', component: SamrayRueungGenerator, color: 'from-cyan-500 to-blue-600' },
      'the-lightning': { labelKey: 'tool_the_lightning', icon: '⚡', component: LightningGenerator, color: 'from-yellow-400 to-orange-500' }
    },
    industrial: {
      'super-car-factory': { labelKey: 'tool_super_car_manufacturing', icon: '🏎️', component: SuperCarManufacturing, color: 'from-red-600 to-slate-800' },
      'super-truck-factory': { labelKey: 'tool_super_truck_manufacturing', icon: '🚛', component: SuperTruckManufacturing, color: 'from-blue-700 to-slate-900' },
      'production-line': { labelKey: 'tool_production_line', icon: '🏭', component: ProductionLineGenerator, color: 'from-slate-600 to-gray-800' },
      'farming-pro': { labelKey: 'tool_farming_pro', icon: '🌾', component: FarmingProGenerator, color: 'from-green-600 to-emerald-800' },
      'modern-agri-tech': { labelKey: 'tool_modern_agri_tech', icon: '🛰️', component: ModernAgriTechGenerator, color: 'from-emerald-500 to-cyan-600' }
    }
  };

  useEffect(() => {
    const handleNavigation = (e: any) => {
      const project = e.detail;
      if (project.tool) {
        for (const [catName, tools] of Object.entries(toolRegistry)) {
            if (tools[project.tool]) {
                setActiveSubCategory(catName);
                setActiveTool(project.tool);
                setExpandedCategories(prev => ({ ...prev, [catName]: true }));
                break;
            }
        }
      }
    };
    window.addEventListener('LOAD_PROJECT', handleNavigation);
    return () => window.removeEventListener('LOAD_PROJECT', handleNavigation);
  }, [toolRegistry]);

  const handleSaveProjectTrigger = () => {
    if (activeTool !== 'project-vault' && activeTool !== 'vip-plan') {
      window.dispatchEvent(new CustomEvent('REQUEST_PROJECT_SAVE', { 
        detail: { tool: activeTool } 
      }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const ActiveComponent = useMemo(() => {
    return toolRegistry[activeSubCategory]?.[activeTool]?.component || ProjectVault;
  }, [activeSubCategory, activeTool]);

  if (!isGoogleBypassed) {
    return <LoginScreen />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-[#0b0f1a] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="h-20 border-b border-gray-800/50 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-[60] px-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 transform rotate-3">
             <span className="text-2xl font-black text-white">SP</span>
          </div>
          <div className="hidden md:block">
             <AnimatedTitle title="STORY STUDIO PRO" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:block">
             <WorkTimer />
          </div>

          {activeTool !== 'project-vault' && activeTool !== 'vip-plan' && (
            <button 
              onClick={handleSaveProjectTrigger}
              className={`hidden sm:flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r ${saveStatus === 'saved' ? 'from-green-600 via-emerald-600 to-green-700' : 'from-emerald-500 to-teal-600'} hover:from-emerald-400 hover:to-teal-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-xl transition-all active:scale-95 border-b-4 ${saveStatus === 'saved' ? 'border-green-900 scale-105' : 'border-emerald-800'}`}
            >
              {saveStatus === 'saved' ? <AnimatedCheckmark /> : <SaveIcon />}
              {saveStatus === 'saved' ? 'Saved Successfully!' : t('btn_save_project')}
            </button>
          )}

          <div className="flex items-center gap-3">
             <UserProfile />
             <SettingsMenu isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-gray-800/50 bg-[#0f172a]/40 backdrop-blur-md hidden md:flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {Object.entries(toolRegistry).map(([catId, tools]) => (
              <div key={catId} className="space-y-1">
                <button 
                  onClick={() => toggleCategory(catId)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] hover:text-cyan-400 transition-colors"
                >
                  {t(`cat_${catId}`)}
                  <span className={`transform transition-transform ${expandedCategories[catId] ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                {expandedCategories[catId] && (
                  <div className="space-y-1 animate-fade-in">
                    {Object.entries(tools).map(([toolId, config]: [string, any]) => (
                      <button
                        key={toolId}
                        onClick={() => { setActiveSubCategory(catId); setActiveTool(toolId); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTool === toolId ? `bg-gradient-to-r ${config.color} text-white shadow-xl scale-[1.02]` : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform">{config.icon}</span>
                        <span className="text-[11px] font-bold uppercase tracking-tight truncate">{t(config.labelKey)}</span>
                        {activeTool === toolId && (
                           <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-6 border-t border-gray-800/50 bg-black/20">
              <div className="flex justify-between items-center text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  <span>Version</span>
                  <span className="text-cyan-500/80">{VERSION}</span>
              </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-transparent to-blue-900/5 p-4 sm:p-8">
           <ActiveComponent />
        </main>
      </div>

      <nav className="md:hidden h-16 border-t border-gray-800 bg-[#0f172a] fixed bottom-0 left-0 right-0 z-[70] flex items-center justify-around px-2">
         {Object.entries(toolRegistry.studio_management).map(([id, config]: [string, any]) => (
            <button key={id} onClick={() => { setActiveSubCategory('studio_management'); setActiveTool(id); }} className={`flex flex-col items-center gap-1 ${activeTool === id ? 'text-cyan-400' : 'text-gray-500'}`}>
                <span className="text-xl">{config.icon}</span>
                <span className="text-[8px] font-bold uppercase">{t(config.labelKey).split(' ')[0]}</span>
            </button>
         ))}
         <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 -mt-8 border-4 border-[#0b0f1a] flex items-center justify-center shadow-2xl">
            <span className="text-xl">🚀</span>
         </button>
         {Object.entries(toolRegistry.architecture).slice(0, 2).map(([id, config]: [string, any]) => (
            <button key={id} onClick={() => { setActiveSubCategory('architecture'); setActiveTool(id); }} className={`flex flex-col items-center gap-1 ${activeTool === id ? 'text-cyan-400' : 'text-gray-500'}`}>
                <span className="text-xl">{config.icon}</span>
                <span className="text-[8px] font-bold uppercase">{t(config.labelKey).split(' ')[0]}</span>
            </button>
         ))}
      </nav>
    </div>
  );
};

export default App;
