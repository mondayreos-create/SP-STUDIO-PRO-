
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { assistWriting, generateVoiceover, generateImageForScene, generateYouTubeMetadata, YouTubeMetadata, generateCharacters, extendStoryWithImage } from '../services/geminiService.ts';

interface Chapter {
    id: number;
    chapterNumber: number;
    content: string;
    imagePrompt?: string;
    imageUrl?: string;
    isEditing?: boolean;
}

// --- Icons ---
const CopyIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const EditIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const SaveIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const Spinner: React.FC<{size?: string}> = ({size = 'h-4 w-4'}) => <svg className={`animate-spin ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);
const YouTubeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
);
const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);
const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200"
            aria-label="Clear current project"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const aspectRatios = [
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
    { label: '1:1', value: '1:1' },
    { label: '4:3', value: '4:3' },
    { label: '3:4', value: '3:4' },
    { label: '4:5', value: '4:5' },
    { label: '5:4', value: '5:4' },
];

const resolutions = [
    { label: 'Original', scale: 1 },
    { label: '720p', width: 1280 },
    { label: '1080p', width: 1920 },
    { label: '2K', width: 2560 },
    { label: '4K', width: 3840 },
    { label: '8K', width: 7680 },
];

const imageStyles = [
    "Realistic", "Cinematic", "Anime", "3D Pixar Style", "2D Cartoon",
    "Disney Style", "Studio Ghibli", "Cyberpunk", "Steampunk", "Sci-Fi",
    "Watercolor", "Oil Painting", "Sketch", "Charcoal", "Vintage 1950s", 
    "Retro 80s", "Noir Black & White", "Claymation", "Paper Cutout", "Origami",
    "Low Poly 3D", "Voxel Art", "Unreal Engine 5", "Isometric", "Line Art", 
    "Pop Art", "Comic Book", "Gothic", "Minimalist", "Abstract", "Graffiti", "Ukiyo-e"
];

const khmerStoryCategories = [
    { id: 'ghost', label: 'រឿងខ្មោច (Ghost Story)', color: 'border-red-500/50 text-red-400 bg-red-950/20' },
    { id: 'folklore', label: 'រឿងនិទានបុរាណ (Folklore)', color: 'border-amber-500/50 text-amber-400 bg-amber-950/20' },
    { id: 'novel', label: 'រឿងប្រលោមលោក (Novel)', color: 'border-pink-500/50 text-pink-400 bg-pink-950/20' },
    { id: 'horror', label: 'រឿងភ័យរន្ធត់ (Horror)', color: 'border-orange-500/50 text-orange-400 bg-orange-950/20' },
    { id: 'detective', label: 'រឿងស៊ើបអង្កេត (Detective)', color: 'border-blue-500/50 text-blue-400 bg-blue-950/20' },
    { id: 'research', label: 'រឿងបែបស្រាវជ្រាវ (Research)', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20' },
    { id: 'fiction', label: 'រឿងបែបប្រឌិត (Fiction)', color: 'border-purple-500/50 text-purple-400 bg-purple-950/20' },
    { id: 'legend', label: 'រឿងព្រេងនិទាន (Legend)', color: 'border-yellow-500/50 text-yellow-400 bg-yellow-950/20' },
    { id: 'comedy', label: 'រឿងបែបកំប្លែង (Comedy)', color: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/20' },
    { id: 'action', label: 'រឿងបែបវាយប្រហារ (Action)', color: 'border-red-600/50 text-red-500 bg-red-950/20' },
];

const khmerStoryExamples: Record<string, string[]> = {
    'ghost': [
        "វិញ្ញាណវិលវល់ក្នុងវិឡាចាស់កណ្តាលព្រៃ (A spirit wandering in an old villa deep in the forest)",
        "ខ្មោចដើមជ្រៃក្បែរភូមិដែលគ្មានអ្នកហ៊ានដើរកាត់យប់ព្រលប់ (The banyan tree ghost near the village no one dares pass at night)",
        "អាថ៌កំបាំងកញ្ចក់បុរាណដែលឆ្លុះឃើញព្រលឹងអ្នកស្លាប់ (The secret of the ancient mirror reflecting the souls of the dead)"
    ],
    'folklore': [
        "ដើមកំណើតផ្កាម្លិះ និងភក្តីភាពនៃស្នេហាបរិសុទ្ធ (The origin of Jasmine and the loyalty of pure love)",
        "ជ័យ និងនាគរាជបាតសមុទ្រ (Chey and the Great Naga under the sea)",
        "រឿងសុភាទន្សាយ និងតោដែលចង់ត្រួតត្រាព្រៃ (The story of Sophea Rabbit and the lion who wanted to rule the forest)"
    ],
    'novel': [
        "ស្នេហាកណ្តាលវាលស្រែ និងការតស៊ូនៃជីវិតកសិករ (Love in the rice fields and the struggle of farmer life)",
        "វិលវិញណាសមាសស្ងួន (Return to me, my love - a story of long-distance longing)",
        "កុលាបប៉ៃលិន (The Rose of Pailin - classic romantic adventure remake)"
    ],
    'horror': [
        "ផ្ទះជួលអាថ៌កំបាំងកណ្តាលក្រុងភ្នំពេញ (The mysterious rental house in central Phnom Penh)",
        "យប់ដ៏រន្ធត់ក្នុងមន្ទីរពេទ្យចោល (A horrific night in an abandoned hospital)",
        "sម្លេងយំខ្សឹបៗចេញពីបន្ទប់ក្រោមដី (Soft crying sounds coming from the basement)"
    ],
    'detective': [
        "អាថ៌កំបាំងពេជ្របាត់បង់ក្នុងពិធីជប់លៀង (Mystery of the lost diamond at the gala)",
        "ឃាតកម្មក្នុងភូមិស្ងាត់ និងស្នាមមេដៃអាថ៌កំបាំង (Murder in the silent village and the mysterious thumbprint)",
        "អ្នកស៊ើបអង្កេតវ័យក្មេង និងករណីចោរប្លន់ធនាគារ (The young detective and the bank robbery case)"
    ],
    'research': [
        "ការស្វែងរកទីក្រុងបុរាណដែលបាត់បង់ក្នុងព្រៃជ្រៅ (Searching for the ancient lost city in the deep jungle)",
        "អាថ៌កំបាំងនៃអក្សរចារឹកលើជញ្ជាំងប្រាសាទ (Secrets of the inscriptions on the temple walls)",
        "ការរុករកវត្ថុស័ក្តិសិទ្ធិក្នុងភ្នំដងរែក (Exploring sacred artifacts in the camp)"
    ],
    'fiction': [
        "កម្ពុជានៅឆ្នាំ ២០៨០ និងបច្គេកវិទ្យាទំនើប (Cambodia in 2080 and advanced technology)",
        "ដំណើរទៅកាន់ភពផ្កាយថ្មីដោយយានអវកាសខ្មែរ (Journey to a new planet via Khmer spaceship)",
        "មនុស្សយន្តដំបូងដែលមានបេះដូងជាខ្មែរ (The first robot with a Khmer heart)"
    ],
    'legend': [
        "រឿងភ្នំប្រុសភ្នំស្រី និងការភ្នាល់សាងសង់ភ្នំ (The legend of Phnom Pros Phnom Srey and the mountain building bet)",
        "អាថ៌កំបាំងព្រះខ័នជ័យ ដែលផ្តល់អំណាចស័ក្តិសិទ្ធិ (The secret of Preah Khan Chey giving sacred power)",
        "រឿងតាព្រហ្ម និងការកសាងប្រាសាទថ្មដ៏អស្ចារ្យ (The story of Ta Prohm and the construction of the great stone temple)"
    ],
    'comedy': [
        "រឿងចៅពៅ និងចៅជេត ក្នុងដំណើរកំសាន្តចម្លែក (Chao Pov and Chao Chet in a strange adventure)",
        "គ្រូទាយកំប្លែង និងការទស្សន៍ទាយខុសឥតឈប់ (The funny fortune teller and endless wrong predictions)",
        "អាពារហ៍ពិពាហ៍ភាន់ច្រឡំ និងការយល់ច្រឡំសើចចុកពោះ (The mistaken wedding and belly-laughing misunderstandings)"
    ],
    'action': [
        "យុទ្ធជនគុនខ្មែរ និងការការពារភូមិឋាន (Kun Khmer warrior protecting the homeland)",
        "ប្រតិបត្តិការសម្ងាត់កណ្តាលទីក្រុង (Secret operations in the city center)",
        "ការសងសឹករបស់អ្នកក្លានក្នុងព្រៃជ្រៅ (The revenge of the brave in the deep jungle)"
    ]
};

const countryOptions = [
    { id: 'khmer', label: 'Khmer 🇰🇭', flag: '🇰🇭', prompt: 'Cambodian culture, Khmer names, Angkorian or rural village settings.' },
    { id: 'english', label: 'English 🏴󠁧󠁢󠁥󠁮󠁧󠁿', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', prompt: 'British settings, UK English nuances, European backdrop.' },
    { id: 'chinese', label: 'Chinese 🇨🇳', flag: '🇨🇳', prompt: 'Ancient or modern Chinese settings, traditional aesthetics.' },
    { id: 'americas', label: 'Americas 🇺🇸', flag: '🇺🇸', prompt: 'North American settings, Western cultural vibes.' },
    { id: 'japan', label: 'Japan 🇯🇵', flag: '🇯🇵', prompt: 'Japanese anime-style settings, Shinto shrines or neon Tokyo.' },
    { id: 'indian', label: 'Indian 🇮🇳', flag: '🇮🇳', prompt: 'Indian colorful festivals, vibrant cities or historical palaces.' },
    { id: 'indonesian', label: 'Indonesian 🇮🇩', flag: '🇮🇩', prompt: 'Bali tropical vibes, Indonesian islands and culture.' },
    { id: 'philippines', label: 'Philippines 🇵🇭', flag: '🇵🇭', prompt: 'Philippine island life and local heritage.' },
    { id: 'others', label: 'Other Countries 🌐', flag: '🌐', prompt: 'International global setting.' },
];

const StoryWriter: React.FC = () => {
    const [storyTopic, setStoryTopic] = useState('');
    const [characterInfo, setCharacterInfo] = useState(''); 
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [currentChapterNum, setCurrentChapterNum] = useState(1);
    
    // Config
    const [chapterLimit, setChapterLimit] = useState(10);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [selectedImageStyle, setSelectedImageStyle] = useState('Realistic');
    const [overlayText, setOverlayText] = useState('');
    const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
    const [overlayLogo, setOverlayLogo] = useState<string | null>(null);
    const [language, setLanguage] = useState<'km' | 'en'>('km');
    const [selectedKhmerCategory, setSelectedKhmerCategory] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string>('khmer');

    // Auto Character Generation State
    const [autoGenChar, setAutoGenChar] = useState(false);
    const [charCount, setCharCount] = useState(2);
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);

    // AI Logic & Progress
    const [isLoading, setIsLoading] = useState(false);
    const [writeProgress, setWriteProgress] = useState(0);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // UI State
    const [isEditingContent, setIsEditingContent] = useState(false);
    const [contentCopyStatus, setContentCopyStatus] = useState(false);
    const [showFullProjectMenu, setShowFullProjectMenu] = useState(false);

    // YouTube Metadata
    const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
    const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
    const [copiedMeta, setCopiedMeta] = useState<string | null>(null);
    
    // Download Menu State
    const [showDownloadMenu, setShowDownloadMenu] = useState<number | null>(null);

    // AUTO-SAVE HANDLER
    const triggerAutoSave = useCallback(() => {
        const projectData = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            tool: 'story-writer',
            category: 'writing',
            title: storyTopic.substring(0, 30) || "Tools+Ai បង្កើតរឿង",
            data: {
                storyTopic,
                characterInfo,
                chapters,
                chapterLimit,
                currentChapterNum,
                language,
                selectedKhmerCategory,
                selectedCountry
            }
        };
        const existing = JSON.parse(localStorage.getItem('global_project_history') || '[]');
        if (chapters.length === 0 && !storyTopic) return;
        localStorage.setItem('global_project_history', JSON.stringify([projectData, ...existing]));
        window.dispatchEvent(new Event('HISTORY_UPDATED'));
    }, [storyTopic, characterInfo, chapters, chapterLimit, currentChapterNum, language, selectedKhmerCategory, selectedCountry]);

    // LISTEN FOR GLOBAL LOAD EVENT
    useEffect(() => {
        const handleLoad = (e: any) => {
            const project = e.detail;
            if (project.tool === 'story-writer' && project.data) {
                const data = project.data;
                setStoryTopic(data.storyTopic || '');
                setCharacterInfo(data.characterInfo || '');
                setChapters(data.chapters || []);
                setChapterLimit(data.chapterLimit || 10);
                setCurrentChapterNum(data.currentChapterNum || 1);
                setLanguage(data.language || 'km');
                setSelectedKhmerCategory(data.selectedKhmerCategory || null);
                setSelectedCountry(data.selectedCountry || 'khmer');
                setIsLoading(false);
                setWriteProgress(0);
                setError(null);
                setIsEditingContent(false);
            }
        };
        window.addEventListener('LOAD_PROJECT', handleLoad);
        return () => window.removeEventListener('LOAD_PROJECT', handleLoad);
    }, []);

    // PERSISTENCE LISTENER FOR GLOBAL SAVE
    useEffect(() => {
        const handleSaveRequest = (e: any) => {
            if (e.detail.tool !== 'story-writer') return;
            triggerAutoSave();
        };

        window.addEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        return () => {
            window.removeEventListener('REQUEST_PROJECT_SAVE', handleSaveRequest);
        };
    }, [triggerAutoSave]);

    const handleAutoGenerateCharacters = async () => {
        if (!storyTopic.trim()) {
            setError("Please enter a Story Topic first.");
            return;
        }
        setIsGeneratingChars(true);
        setError(null);
        try {
            const countryPrompt = countryOptions.find(c => c.id === selectedCountry)?.prompt || "";
            let culturalContext = countryPrompt;
            let langInstruction = language === 'km' ? "Generate content in Khmer language." : "Generate content in English.";

            if (selectedKhmerCategory || (selectedCountry === 'khmer')) {
                culturalContext = `
                STRICT CAMBODIAN CULTURAL STYLE:
                1. Names: Characters must have authentic Khmer (Cambodian) names.
                2. Traits: Include Cambodian cultural elements (e.g. skin tone, wearing Krama, Sarong, or traditional Cambodian attire).
                3. Context: Characters should feel like they belong in Cambodia.
                4. Language: Generate names and descriptions in KHMER language.
                `;
                langInstruction = "Generate content completely in KHMER language.";
            }

            const chars = await generateCharacters(storyTopic, charCount, `${culturalContext} ${langInstruction}`);
            const charText = chars.map((c, i) => `Character ${i + 1}: ${c.name} (${c.gender}, ${c.age})\nDescription: ${c.description}`).join('\n\n');
            setCharacterInfo(charText);
            triggerAutoSave();
        } catch (err) {
            setError("Failed to generate characters.");
        } finally {
            setIsGeneratingChars(false);
        }
    };

    const handleWriteChapter = useCallback(async (targetChapter?: number) => {
        const chapterToProcess = targetChapter || currentChapterNum;
        setIsLoading(true);
        setWriteProgress(1);
        setError(null);

        const interval = setInterval(() => {
            setWriteProgress(prev => {
                if (prev >= 98) {
                    clearInterval(interval);
                    return 98;
                }
                return prev + 1;
            });
        }, 150);

        const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
        let context = `STORY TOPIC: ${storyTopic}\n`;
        
        if (selectedKhmerCategory) {
            const cat = khmerStoryCategories.find(c => c.id === selectedKhmerCategory)?.label || "";
            context += `STORY CATEGORY: ${cat}\n`;
        }

        if (characterInfo) {
            context += `CHARACTERS: ${characterInfo}\n`;
        }

        const prevChapter = sortedChapters.find(c => c.chapterNumber === chapterToProcess - 1);
        let continuityInstruction = "";
        if (prevChapter) {
            const lastLines = prevChapter.content.slice(-500);
            context += `PREVIOUS CHAPTER (Chapter ${prevChapter.chapterNumber}) ENDED EXACTLY WITH: "${lastLines}"\n`;
            continuityInstruction = `
            CRITICAL CONTINUITY MASTER RULE:
            You MUST start Chapter ${chapterToProcess} exactly where Chapter ${prevChapter.chapterNumber} ended. 
            Example: If the previous chapter ended with "Phirum walking to the forest gate", this chapter MUST start with "Phirum stood at the forest gate...".
            Do not repeat events. Advance the plot. Maintain perfect 1:1 narrative linkage.
            `;
        }
        
        const langInstruction = language === 'km' 
            ? "IMPORTANT: Write the story content completely in KHMER (CAMBODIAN) language."
            : "IMPORTANT: Write the story content in ENGLISH language.";

        const prompt = `
        ${context}
        TASK: Write **Chapter ${chapterToProcess}** of a ${chapterLimit}-chapter story.
        REQUIREMENTS:
        1. Consistency: Continue the storyline logically.
        2. ${continuityInstruction}
        3. Length: Strictly between 550 and 599 words.
        4. Output: Only the story content.
        5. Language: ${langInstruction}
        `;

        try {
            const content = await assistWriting({
                story: prompt,
                instruction: `Write Chapter ${chapterToProcess} with perfect narrative flow from the previous chapter's ending.`,
                genre: "Fiction",
                tone: "Captivating"
            });

            const newChapter: Chapter = {
                id: Date.now(),
                chapterNumber: chapterToProcess,
                content: content,
            };

            const updatedChapters = [...chapters];
            const existingIndex = updatedChapters.findIndex(c => c.chapterNumber === chapterToProcess);
            
            if (existingIndex >= 0) {
                updatedChapters[existingIndex] = newChapter;
            } else {
                updatedChapters.push(newChapter);
            }
            
            updatedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
            setChapters(updatedChapters);
            setWriteProgress(100);
            triggerAutoSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            clearInterval(interval);
            setIsLoading(false);
            setTimeout(() => setWriteProgress(0), 1000); 
        }
    }, [storyTopic, characterInfo, currentChapterNum, chapterLimit, chapters, language, selectedKhmerCategory, triggerAutoSave]);

    const handleNextAndWrite = () => {
        const nextNum = Math.min(chapterLimit, currentChapterNum + 1);
        setCurrentChapterNum(nextNum);
        handleWriteChapter(nextNum);
    };

    const handleGenerateImage = async (chapter: Chapter) => {
        setIsGeneratingImage(true);
        setError(null);
        try {
            const charPrompt = characterInfo ? `CHARACTER VISUAL DETAILS (MAINTAIN 100%): ${characterInfo}.\n` : '';
            let styleInstruction = `ART STYLE: ${selectedImageStyle}.`;
            let constraints = "Constraint: NO text in image.";
            
            if (selectedImageStyle === 'Realistic') {
                styleInstruction = `ART STYLE: Strictly Photorealistic photography, National Geographic style, high-end commercial look.`;
                constraints += " MANDATORY: NO 3D, NO animation, NO CGI. Result MUST be a real world photo with real skin textures.";
            }

            const prompt = `
            STORY ACTION IN THIS CHAPTER: ${chapter.content.substring(0, 1500)}...
            ${charPrompt}
            ${styleInstruction}
            ${constraints}
            EPISODE VISUAL CONSISTENCY MASTER DIRECTIVE:
            You MUST keep the characters’ faces, bodies, and characteristics exactly the same as in Chapter 1. 
            Maintain the exact same setting, lighting, and environmental features. 
            Consistent character face and clothing is mandatory.
            `;
            const imageUrl = await generateImageForScene(prompt, aspectRatio);
            const updatedChapters = chapters.map(c => c.id === chapter.id ? { ...c, imageUrl: imageUrl, imagePrompt: prompt } : c);
            setChapters(updatedChapters);
            triggerAutoSave();
        } catch (err) {
            setError("Image generation failed.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleDeleteImage = (chapterId: number) => {
         const updatedChapters = chapters.map(c => c.id === chapterId ? { ...c, imageUrl: undefined, imagePrompt: undefined } : c);
        setChapters(updatedChapters);
    };

    const handleDownloadImage = async (url: string, chapterNum: number, resConfig: any) => {
        try {
            const finalDataUrl = await processImageForDownload(url, resConfig);
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = `Chapter_${chapterNum}_Art.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowDownloadMenu(null);
        } catch (e) {
            alert("Failed to process image.");
        }
    };

    const processImageForDownload = async (imageUrl: string, resolutionConfig: { label: string; scale?: number; width?: number }): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject("Canvas error");
                let targetWidth = img.width;
                let targetHeight = img.height;
                if (resolutionConfig.width) {
                    const ratio = img.height / img.width;
                    targetWidth = resolutionConfig.width;
                    targetHeight = Math.round(targetWidth * ratio);
                } else if (resolutionConfig.scale) {
                    targetWidth = img.width * resolutionConfig.scale;
                    targetHeight = img.height * resolutionConfig.scale;
                }
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                if (overlayText) {
                    const fontSize = Math.max(20, targetHeight * 0.05);
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = fontSize * 0.1;
                    ctx.strokeText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                    ctx.fillStyle = overlayTextColor;
                    ctx.fillText(overlayText, targetWidth / 2, targetHeight - (fontSize * 0.5));
                }
                if (overlayLogo) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = "anonymous";
                    logoImg.onload = () => {
                        const logoSize = Math.min(targetWidth, targetHeight) * 0.15; 
                        const padding = logoSize * 0.2;
                        ctx.drawImage(logoImg, targetWidth - logoSize - padding, padding, logoSize, logoSize);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    logoImg.onerror = () => resolve(canvas.toDataURL('image/png'));
                    logoImg.src = overlayLogo;
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            };
            img.onerror = (e) => reject(e);
            img.src = imageUrl;
        });
    };

    const handleDownloadText = (chapter: Chapter) => {
        const blob = new Blob([chapter.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Chapter_${chapter.chapterNumber}_Text.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadFullStory = (format: 'txt' | 'json') => {
        let content = "";
        let filename = `Full_Story_${storyTopic.substring(0, 20)}.${format}`;
        
        if (format === 'txt') {
            content = `STORY TITLE: ${storyTopic}\n\n`;
            content += `CHARACTERS:\n${characterInfo}\n\n`;
            content += `--- FULL STORY CONTENT ---\n\n`;
            chapters.forEach(c => {
                content += `CHAPTER ${c.chapterNumber}\n\n${c.content}\n\n------------------------\n\n`;
            });
        } else {
            content = JSON.stringify({
                topic: storyTopic,
                characters: characterInfo,
                chapters: chapters
            }, null, 2);
        }

        const blob = new Blob([content], { type: format === 'txt' ? 'text/plain;charset=utf-8' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateMetadata = async () => {
        const fullContent = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.content}`).join('\n\n');
        if (!fullContent) return;
        setIsGeneratingMeta(true);
        try {
            const meta = await generateYouTubeMetadata(storyTopic || "Bedtime Story", fullContent.substring(0, 5000), 'Story'); 
            setMetadata(meta);
        } catch (err) {
            setError("Failed to generate metadata.");
        } finally {
            setIsGeneratingMeta(false);
        }
    };
    
    const handleCopyMeta = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMeta(key);
        setTimeout(() => setCopiedMeta(null), 2000);
    };

    const handleCopyContent = (text: string) => {
        const cleanedText = text.replace(/(?:^|\n)(?:Scene|Chapter)\s+\d+[:.-]?\s*/gi, '').trim();
        navigator.clipboard.writeText(cleanedText);
        setContentCopyStatus(true);
        setTimeout(() => setContentCopyStatus(false), 2000);
    };

    const updateChapterContent = (id: number, newContent: string) => {
        setChapters(prev => prev.map(c => c.id === id ? { ...c, content: newContent } : c));
    };

    const handleClear = () => {
        setStoryTopic('');
        setCharacterInfo('');
        setChapters([]);
        setMetadata(null);
        setCurrentChapterNum(1);
        setError(null);
        setLanguage('km');
        setIsEditingContent(false);
        setSelectedKhmerCategory(null);
        setSelectedCountry('khmer');
    };

    const currentChapter = chapters.find(c => c.chapterNumber === currentChapterNum);
    const wordCount = currentChapter?.content ? currentChapter.content.split(/\s+/).filter(w => w.length > 0).length : 0;

    const tagsValue = metadata?.keywords.join(', ') || '';
    const isTitleOver = (metadata?.title.length || 0) > 100;
    const isTagsOver = tagsValue.length > 500;

    return (
        <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col items-center animate-fade-in">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Left Panel: Configuration */}
                <div className="lg:col-span-1 bg-gray-800/50 p-4 sm:p-6 rounded-2xl border border-gray-700 h-fit space-y-6 shadow-xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1 uppercase tracking-tighter">
                            Tools+Ai បង្កើតរឿង
                        </h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Story Writer Studio</p>
                    </div>

                    {/* Country Selector */}
                    <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700">
                        <label className="block text-xs font-black uppercase text-gray-500 mb-3 tracking-widest">រើសប្រទេស (Country)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {countryOptions.map((country) => (
                                <button
                                    key={country.id}
                                    onClick={() => setSelectedCountry(country.id)}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all transform active:scale-95 ${selectedCountry === country.id ? 'bg-cyan-900/40 border-cyan-500 text-cyan-100 shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    <span className="text-xl">{country.flag}</span>
                                    <span className="text-[9px] font-black uppercase text-center leading-tight">{country.label.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Language (ភាសា)</label>
                        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-600">
                            <button onClick={() => setLanguage('km')} className={`flex-1 py-2 text-xs font-bold rounded transition ${language === 'km' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>🇰🇭 Khmer</button>
                            <button onClick={() => setLanguage('en')} className={`flex-1 py-2 text-xs font-bold rounded transition ${language === 'en' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>🇺🇸 English</button>
                        </div>
                    </div>

                    {/* Khmer Category Selector - Auto Hides when story starts */}
                    {language === 'km' && selectedCountry === 'khmer' && chapters.length === 0 && (
                        <div className="animate-fade-in bg-gray-900/40 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-black uppercase text-gray-500 mb-3 tracking-widest">ប្រភេទសាច់រឿងខ្មែរ (Khmer Story Type)</label>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {khmerStoryCategories.map((cat) => (
                                    <div key={cat.id} className="space-y-2">
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer transform active:scale-[0.98] ${selectedKhmerCategory === cat.id ? `${cat.color} ring-2 ring-white/10` : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                            <div className="relative">
                                                <input type="checkbox" className="hidden" checked={selectedKhmerCategory === cat.id} onChange={() => setSelectedKhmerCategory(selectedKhmerCategory === cat.id ? null : cat.id)} />
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedKhmerCategory === cat.id ? 'bg-white border-white' : 'bg-transparent border-gray-500'}`}>
                                                    {selectedKhmerCategory === cat.id && <div className="w-2.5 h-2.5 bg-black rounded-full"></div>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{cat.label}</span>
                                        </label>
                                        {selectedKhmerCategory === cat.id && (
                                            <div className="pl-4 space-y-1.5 animate-slide-down">
                                                {khmerStoryExamples[cat.id]?.map((example, idx) => (
                                                    <button key={idx} onClick={() => setStoryTopic(example)} className="w-full text-left p-2 rounded bg-black/30 border border-gray-700 text-[10px] text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">{idx + 1}. {example}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Story Topic (ប្រធានបទ)</label>
                        <textarea value={storyTopic} onChange={(e) => setStoryTopic(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-24 resize-none focus:ring-2 focus:ring-pink-500 outline-none shadow-inner" placeholder="What's the story about?" />
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-semibold text-gray-300">Character Detail (តួអង្គ)</label>
                             <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
                                <input type="checkbox" checked={autoGenChar} onChange={(e) => setAutoGenChar(e.target.checked)} className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500" />
                                Auto Generate
                            </label>
                        </div>
                        {autoGenChar && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-900/50 rounded border border-gray-600 animate-fade-in">
                                <input type="number" min="1" max="10" value={charCount} onChange={(e) => setCharCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} className="w-12 bg-gray-800 border border-gray-600 text-white text-center rounded text-xs" />
                                <button onClick={handleAutoGenerateCharacters} disabled={isGeneratingChars || !storyTopic} className="flex-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded transition disabled:opacity-50">{isGeneratingChars ? <Spinner size="h-3 w-3" /> : 'Generate Characters'}</button>
                            </div>
                        )}
                        <textarea value={characterInfo} onChange={(e) => setCharacterInfo(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-24 resize-none focus:ring-2 focus:ring-pink-500 outline-none text-xs shadow-inner" placeholder="Names and traits..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-medium text-gray-400 mb-1">Image Size</label>
                             <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-xs outline-none">{aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                        </div>
                         <div>
                             <label className="block text-xs font-medium text-gray-400 mb-1">Total Chapters</label>
                             <input type="number" min="1" max="20" value={chapterLimit} onChange={(e) => setChapterLimit(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-xs outline-none font-bold text-center" />
                        </div>
                    </div>

                    <button onClick={() => handleWriteChapter()} disabled={isLoading || !storyTopic} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                        {isLoading ? <Spinner /> : '✍️'} 
                        {isLoading ? 'Drafting...' : (currentChapter ? `Re-write Chapter ${currentChapterNum}` : `Write Chapter ${currentChapterNum}`)}
                    </button>
                    
                     <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-[0.2em]">Story Structure Navigator</h4>
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: chapterLimit }, (_, i) => i + 1).map((num) => {
                                const exists = chapters.find(c => c.chapterNumber === num);
                                return (
                                    <button key={num} onClick={() => setCurrentChapterNum(num)} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all border-2 ${currentChapterNum === num ? 'bg-pink-600 text-white border-pink-300 scale-110 shadow-lg shadow-pink-500/20' : exists ? 'bg-green-900/40 text-green-300 border-green-700/50 hover:bg-green-800' : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'}`}>{num}</button>
                                );
                            })}
                        </div>
                    </div>
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-xl text-center text-xs font-bold animate-shake">{error}</div>}
                </div>

                {/* Right Panel: Content & Visualization */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800/60 p-4 sm:p-6 rounded-2xl border border-gray-700 min-h-[400px] flex flex-col shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div className="flex flex-col">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Chapter {currentChapterNum}</h3>
                                {currentChapter && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Status: {wordCount} Words • Standard Continuity</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
                                {currentChapter && (
                                    <>
                                        <button onClick={() => setIsEditingContent(!isEditingContent)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition flex-1 sm:flex-none justify-center ${isEditingContent ? 'bg-blue-600 text-white border border-blue-400 shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 shadow-sm'}`}>{isEditingContent ? <SaveIcon /> : <EditIcon />}{isEditingContent ? 'Save' : 'Edit'}</button>
                                        <button onClick={() => handleCopyContent(currentChapter.content)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-black uppercase rounded-xl border border-gray-600 transition flex items-center gap-2 shadow-sm flex-1 sm:flex-none justify-center">{contentCopyStatus ? <CheckIcon /> : <CopyIcon />}{contentCopyStatus ? 'Copied' : 'Copy'}</button>
                                        <button onClick={() => handleDownloadText(currentChapter)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-black uppercase rounded-xl border border-gray-600 transition flex items-center gap-2 shadow-sm flex-1 sm:flex-none justify-center"><DownloadIcon /> Text</button>
                                        <div className="relative flex-1 sm:flex-none">
                                             <button onClick={() => setShowDownloadMenu(showDownloadMenu === currentChapter.id ? null : currentChapter.id)} disabled={!currentChapter.imageUrl} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl border border-emerald-400 transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20 w-full justify-center"><DownloadIcon /> IMAGE ▾</button>
                                             {showDownloadMenu === currentChapter.id && currentChapter.imageUrl && (
                                                <div className="absolute top-full right-0 mt-2 w-full sm:w-32 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl z-20 overflow-hidden border border-gray-700">
                                                    {resolutions.map(res => (
                                                        <button key={res.label} onClick={() => handleDownloadImage(currentChapter.imageUrl!, currentChapterNum, res)} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-gray-700 hover:text-white transition block border-b border-gray-800 last:border-none">{res.label}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar Display */}
                        {isLoading && (
                            <div className="w-full mb-6 bg-gray-900 p-4 rounded-xl border border-[#334155] shadow-inner animate-fade-in">
                                <div className="flex justify-between text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">
                                    <span>AI Story Composition In Progress</span>
                                    <span>{writeProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 via-emerald-400 to-cyan-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                                        style={{ width: `${writeProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {currentChapter ? (
                            <div className="flex-grow space-y-6">
                                <div className="relative">
                                    <textarea value={currentChapter.content} onChange={(e) => updateChapterContent(currentChapter.id, e.target.value)} readOnly={!isEditingContent} className={`w-full h-80 bg-gray-900/50 border border-gray-700 rounded-2xl p-6 text-gray-200 text-base leading-relaxed resize-none focus:outline-none custom-scrollbar font-serif shadow-inner ${isEditingContent ? 'ring-2 ring-blue-500 border-transparent' : ''}`} />
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                                            <div className="flex flex-col items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-2xl">
                                                <Spinner size="h-8 w-8" />
                                                <p className="text-[10px] font-black uppercase text-cyan-400 mt-2 tracking-widest animate-pulse">Syncing Narrative...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="border-t border-gray-700 pt-6">
                                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">VISUAL STYLE:</label>
                                            <select value={selectedImageStyle} onChange={(e) => setSelectedImageStyle(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-white focus:outline-none hover:border-pink-500 transition-colors">{imageStyles.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                        </div>
                                        <p className="text-[9px] text-yellow-500 font-bold uppercase italic">* Episode consistency logic active (Chapter 1 to 10)</p>
                                     </div>

                                     {currentChapter.imageUrl ? (
                                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-700 group shadow-2xl">
                                            <img src={currentChapter.imageUrl} alt={`Chapter ${currentChapterNum}`} className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 pointer-events-none">
                                                {overlayLogo && <div className="absolute top-4 right-4 w-[15%] aspect-square"><img src={overlayLogo} className="w-full h-full object-contain opacity-80" /></div>}
                                                {overlayText && <div className="absolute bottom-6 w-full text-center text-white font-black uppercase tracking-tighter" style={{textShadow: '2px 2px 4px black', color: overlayTextColor, fontSize: 'clamp(1rem, 5vw, 2rem)'}}>{overlayText}</div>}
                                            </div>
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button onClick={() => handleDeleteImage(currentChapter.id)} className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-full transition shadow-xl transform hover:scale-110 active:scale-95" title="Delete Art"><TrashIcon /></button>
                                                <button onClick={() => handleGenerateImage(currentChapter)} disabled={isGeneratingImage} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition shadow-xl transform hover:scale-110 active:scale-95 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest border-2 border-purple-400/30">{isGeneratingImage ? <Spinner /> : <RefreshIcon />}{isGeneratingImage ? 'RE-RENDERING...' : 'GENERATE CHAPTER ART'}</button>
                                            </div>
                                        </div>
                                     ) : (
                                        <button onClick={() => handleGenerateImage(currentChapter)} disabled={isGeneratingImage} className="w-full h-64 border-4 border-dashed border-gray-700/50 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-800/50 hover:border-pink-500/50 hover:text-pink-400 transition-all duration-300 group shadow-inner">
                                            {isGeneratingImage ? (
                                                <div className="flex flex-col items-center">
                                                    <Spinner size="h-10 w-10" />
                                                    <p className="text-xs font-black uppercase text-pink-500 mt-4 tracking-[0.2em] animate-pulse">Rendering Chapter {currentChapterNum} Art...</p>
                                                    <p className="text-[9px] text-gray-600 mt-2 uppercase">Character Consistency Ensured</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-6xl mb-4 opacity-10 group-hover:scale-110 group-hover:opacity-30 transition-all">🖼️</span>
                                                    <span className="text-xs font-black uppercase tracking-[0.3em]">Produce Chapter Illustration</span>
                                                    <span className="text-[10px] text-gray-600 mt-2 italic">(Based on the specific action in this chapter)</span>
                                                </>
                                            )}
                                        </button>
                                     )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 border-4 border-dashed border-gray-700/30 rounded-2xl bg-gray-900/20">
                                <span className="text-8xl mb-6 opacity-5 animate-pulse">📖</span>
                                <p className="text-lg font-black uppercase tracking-[0.3em] opacity-30">Production Floor</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-2 text-center">Click "Write Chapter {currentChapterNum}" to begin authorship</p>
                            </div>
                        )}

                        <div className="flex justify-between mt-8 pt-6 border-t border-gray-700/50">
                             <button onClick={() => setCurrentChapterNum(Math.max(1, currentChapterNum - 1))} disabled={currentChapterNum === 1 || isLoading} className="px-4 sm:px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl border border-gray-700 disabled:opacity-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95">← PREVIOUS</button>
                            <button onClick={handleNextAndWrite} disabled={currentChapterNum === chapterLimit || isLoading} className="px-4 sm:px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl border border-gray-700 disabled:opacity-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-md flex items-center gap-2 group">
                                NEXT →
                                <span className="hidden sm:inline text-[8px] bg-cyan-600 text-white px-1.5 py-0.5 rounded group-hover:bg-cyan-500">AUTO-WRITE</span>
                            </button>
                        </div>
                    </div>

                    {/* YouTube Metadata Section */}
                    <div className="bg-gray-800/60 p-4 sm:p-6 rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h3 className="text-lg font-black text-red-400 flex items-center gap-3 uppercase tracking-tighter"><YouTubeIcon /> CHANNEL DISTRIBUTION KIT</h3>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {metadata && (
                                     <button 
                                        onClick={() => {
                                            const fullPackage = `TITLE:\n${metadata.title}\n\nDESCRIPTION:\n${metadata.description}\n\nHASHTAGS:\n${metadata.hashtags.join(' ')}\n\nTAGS:\n${metadata.keywords.join(', ')}`;
                                            handleCopyMeta(fullPackage, 'full-package');
                                        }} 
                                        className="flex-1 sm:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-black uppercase rounded-xl border border-gray-600 transition flex items-center gap-2 shadow-sm justify-center"
                                    >
                                        {copiedMeta === 'full-package' ? <CheckIcon /> : <CopyIcon />} Copy All Metadata
                                    </button>
                                )}
                                <button onClick={handleGenerateMetadata} disabled={isGeneratingMeta || chapters.length === 0} className="flex-1 sm:flex-none px-5 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 border border-red-800/50 shadow-lg shadow-red-950/20 justify-center">{isGeneratingMeta ? <Spinner size="h-3 w-3" /> : 'Generate Info'}</button>
                            </div>
                        </div>
                        {metadata ? (
                            <div className="space-y-6">
                                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700 shadow-inner">
                                    <div className="flex justify-between text-[9px] font-black text-gray-500 mb-2 tracking-widest">
                                        <span className="flex items-center gap-2">
                                            POST TITLE / VIDEO TITLE 
                                            <span className={`${isTitleOver ? 'text-red-500' : 'text-gray-600'} font-bold`}>
                                                ({metadata.title.length}/100)
                                            </span>
                                        </span>
                                        <button onClick={() => handleCopyMeta(metadata.title, 'title')} className="hover:text-white transition-colors">{copiedMeta === 'title' ? '✓ COPIED' : 'COPY'}</button>
                                    </div>
                                    <div className={`text-white text-sm font-black uppercase tracking-tight ${isTitleOver ? 'text-red-400' : ''}`}>{metadata.title}</div>
                                </div>
                                
                                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700 shadow-inner">
                                    <div className="flex justify-between text-[9px] font-black text-gray-500 mb-2 tracking-widest">
                                        <span>DESCRIPTION FOR YOUTUBE</span>
                                        <button onClick={() => handleCopyMeta(metadata.description, 'desc')} className="hover:text-white transition-colors">{copiedMeta === 'desc' ? '✓ COPIED' : 'COPY'}</button>
                                    </div>
                                    <div className="text-gray-300 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar font-serif leading-relaxed italic">{metadata.description}</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700 shadow-inner">
                                        <div className="flex justify-between text-[9px] font-black text-gray-500 mb-2 tracking-widest">
                                            <span>#HASHTAGS (TOP 15)</span>
                                            <button onClick={() => handleCopyMeta(metadata.hashtags.join(' '), 'hashtags')} className="hover:text-white transition-colors">{copiedMeta === 'hashtags' ? '✓ COPIED' : 'COPY'}</button>
                                        </div>
                                        <div className="text-blue-400 text-xs font-bold font-mono">{metadata.hashtags.join(' ')}</div>
                                    </div>
                                    <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700 shadow-inner">
                                        <div className="flex justify-between text-[9px] font-black text-gray-500 mb-2 tracking-widest">
                                            <span className="flex items-center gap-2">
                                                TAGS / KEYWORDS (YT STUDIO)
                                                <span className={`${isTagsOver ? 'text-red-500' : 'text-gray-600'} font-bold`}>
                                                    ({tagsValue.length}/500)
                                                </span>
                                            </span>
                                            <button onClick={() => handleCopyMeta(tagsValue, 'keywords')} className="hover:text-white transition-colors">{copiedMeta === 'keywords' ? '✓ COPIED' : 'COPY'}</button>
                                        </div>
                                        <div className={`text-cyan-400 text-xs font-medium font-mono leading-relaxed ${isTagsOver ? 'text-red-400' : ''}`}>
                                            {tagsValue}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-600 text-[10px] py-6 font-bold uppercase tracking-[0.2em] opacity-40">Author a chapter to unlock distribution assets.</div>
                        )}
                    </div>

                    {/* NEW: Full Project Export Section */}
                    {chapters.length > 0 && (
                        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-4 sm:p-6 rounded-2xl border border-indigo-500/30 shadow-2xl flex flex-col items-center animate-fade-in">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-3 text-center">
                                🚀 EXPORT FULL PROJECT (SMART)
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-4 w-full">
                                <button 
                                    onClick={() => handleDownloadFullStory('txt')}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest border border-indigo-400/50"
                                >
                                    <DownloadIcon /> Full Story (TXT)
                                </button>
                                <button 
                                    onClick={() => handleDownloadFullStory('json')}
                                    className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 text-cyan-400 font-black rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest border border-gray-700"
                                >
                                    <DownloadIcon /> Full Project (JSON)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryWriter;
