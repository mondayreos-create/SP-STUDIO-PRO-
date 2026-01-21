
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Initialize AI
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Retry logic
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const msg = e.message || "";
      
      if (msg.includes('Requested entity was not found') || msg.includes('API_KEY_INVALID')) {
         if ((window as any).aistudio?.openSelectKey) {
            (window as any).aistudio.openSelectKey();
         }
         throw e; 
      }
      
      if (msg.includes('429') || msg.includes('Resource has been exhausted') || msg.includes('quota')) {
        await new Promise(r => setTimeout(r, 5000 * (i + 1)));
        continue;
      }
      
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  
  throw lastError;
}

// Clean JSON helper
function cleanJson(text: string): string {
  if (!text) return "";
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// --- Types ---
export type ImageQuality = 'Low' | 'Medium' | 'High';
export type PrebuiltVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface Character {
  name: string;
  gender: string;
  age: string;
  description: string;
}

export interface CharacterAnalysis {
  artStyle: string;
  characterDescription: string;
}

export interface StoryScene {
  scene_number: number;
  title: string;
  slug: string;
  scene_description: { line: string };
  dialog: { character: string; line: string }[];
  prompt: string;
  voiceover: string;
}

export interface StoryIdea {
  title: string;
  summary: string;
}

export interface CarIdea {
  title: string;
  description: string;
}

export interface YouTubeMetadata {
    title: string;
    description: string;
    hashtags: string[];
    keywords: string[];
}

export interface ImageReference {
    base64: string;
    mimeType: string;
}

export interface ConsistentScene {
    sceneNumber: number;
    action: string;
    consistentContext: string;
    voiceover: string;
    asmrType?: string;
}

export interface MvDetailedScene {
    scene_number: number;
    action: string;
    full_prompt: string;
}

export interface Dialog {
    character: string;
    line: string;
}

export interface HollywoodMvScene {
    scene_number: number;
    time_range: string;
    description: string;
    video_prompt: string;
}

export interface ScriptOutline {
    title: string;
    outline: {
        chapter: number;
        title: string;
        summary: string;
    }[];
}

export interface VlogScriptResponse {
    title: string;
    script: {
        segment: string;
        speech: string;
        visual: string;
    }[];
}

// COMMENT: Expanded VisualScene interface to include optional metadata fields.
export interface VisualScene {
    scene_number: number;
    narrative: string;
    visual_prompt: string;
    lyric_segment?: string;
    visual_description?: string;
}

export interface VlogStoryboardScene {
    id: number;
    visual: string;
    audio: string;
}

export interface VideoIdea {
    title: string;
    summary: string;
    sampleScriptLine: string;
}

export interface KhmerScene {
    sceneNumber: number;
    action: string;
    visualPrompt: string;
    dialogues: { character: string; text: string }[];
}

export interface TriviaQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    imagePrompt: string;
}

export interface WebtoonPanel {
    panelNumber: number;
    visualDescription: string;
    dialogue: { character: string; text: string; type: 'speech' | 'thought' | 'narration' }[];
}

export interface RelaxingPromptsResponse {
    musicPrompt: string;
    videoSegments: {
        segmentNumber: number;
        prompt: string;
    }[];
}

export interface DetailedOutline {
    title: string;
    chapters: {
        chapter: number;
        title: string;
        purpose: string;
        summary: string;
    }[];
}

export interface KidsMusicProject {
    title: string;
    lyrics: string;
    musicPrompt: string;
    scenes: {
        sceneNumber: number;
        lyricSegment: string;
        visualPrompt: string;
    }[];
}

export interface DanceProject {
    masterPrompt: string;
    musicPrompt: string;
    scenes: {
        sceneNumber: number;
        action: string;
        videoPrompt: string;
    }[];
}

export interface ShortFilmProject {
    title: string;
    synopsis: string;
    genre: string;
    visualStyle: string;
    scenes: {
        sceneNumber: number;
        action: string;
        videoPrompt: string;
    }[];
}

export interface MvScene {
    scene_number: number;
    timestamp: string;
    lyrics: string;
    visual_description: string;
    video_prompt: string;
}

// --- Implementation ---

/**
 * Generates an image from a prompt. 
 */
export const generateImage = async (prompt: string, aspectRatio: string = '1:1', quality: ImageQuality = 'Low'): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const model = (quality === 'Medium' || quality === 'High') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
        const imageSize = quality === 'High' ? '4K' : (quality === 'Medium' ? '2K' : '1K');

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any,
                    imageSize: model === 'gemini-3-pro-image-preview' ? imageSize : undefined
                }
            }
        });
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
             for (const part of response.candidates[0].content.parts) {
                 if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                 }
            }
        }
        throw new Error("No image generated.");
    });
};

/**
 * Generates a video using Veo 3.
 */
export const generateVideo = async (options: { prompt: string; aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p'; image?: ImageReference; model?: string }): Promise<Blob> => {
    return withRetry(async () => {
        const ai = getAi();
        const model = options.model || 'veo-3.1-fast-generate-preview';
        
        const config: any = {
            numberOfVideos: 1,
            resolution: options.resolution || '720p',
            aspectRatio: options.aspectRatio || '16:9'
        };

        const params: any = {
            model,
            prompt: options.prompt,
            config
        };

        if (options.image) {
            params.image = {
                imageBytes: options.image.base64,
                mimeType: options.image.mimeType
            };
        }

        let operation = await ai.models.generateVideos(params);
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation failed.");
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        return await response.blob();
    });
};

/**
 * Translates text from one language to another.
 */
export const translateText = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the following text from ${sourceLang} to ${targetLang}. Output ONLY the translated text:\n\n${text}`
        });
        return response.text || "";
    });
};

/**
 * Transcribes audio/video content.
 */
export const transcribeVideo = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Transcribe the audio from this media precisely. Output ONLY the transcription text." }
                ]
            }
        });
        return response.text || "";
    });
};

/**
 * Generates an image based on multiple references.
 */
// COMMENT: Fixed type of 'scene' and 'style' to singular ImageReference to resolve array property errors.
export const generateImageWithReferences = async (prompt: string, refs: { subjects?: ImageReference[]; scene?: ImageReference; style?: ImageReference }, aspectRatio: string = '1:1'): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const parts: any[] = [];
        
        if (refs.subjects) refs.subjects.forEach(img => parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));
        if (refs.scene) parts.push({ inlineData: { mimeType: refs.scene.mimeType, data: refs.scene.base64 } });
        if (refs.style) parts.push({ inlineData: { mimeType: refs.style.mimeType, data: refs.style.base64 } });
        
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        
        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Reference-based generation failed.");
    });
};

/**
 * Image editing (Inpainting/Transformation).
 */
export const editImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: prompt }
                ]
            }
        });
        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Editing failed.");
    });
};

/**
 * Mixes two images based on a prompt.
 */
export const mixImages = async (base64A: string, mimeA: string, base64B: string, mimeB: string, prompt: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeA, data: base64A } },
                    { inlineData: { mimeType: mimeB, data: base64B } },
                    { text: prompt }
                ]
            }
        });
        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Mixing failed.");
    });
};

/**
 * Clones a prompt from an image.
 */
export const generatePromptFromImage = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Describe this image in extreme detail for a high-quality AI image generator prompt. Focus on subject, style, lighting, and composition." }
                ]
            }
        });
        return response.text || "";
    });
};

/**
 * Clones a prompt from a video.
 */
export const generatePromptFromVideo = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Analyze this video and generate a detailed prompt that captures its visual style, movement, and essence for a high-fidelity video clone." }
                ]
            }
        });
        return response.text || "";
    });
};

/**
 * Generates an image prompt from a media URL.
 */
export const generatePromptFromUrl = async (url: string, platform: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this ${platform} content link: ${url}. Provide a highly detailed AI generation prompt that clones its visual style and narrative vibe.`
        });
        return response.text || "";
    });
};

/**
 * Generates a video prompt from an image.
 */
export const generateVideoPromptFromImage = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Analyze this image and describe how it would move as a cinematic high-quality video. Provide a detailed video generation prompt." }
                ]
            }
        });
        return response.text || "";
    });
};

/**
 * Generates a consistent story script with accurate progression.
 */
export const generateConsistentStoryScript = async (synopsis: string, sceneCount: number): Promise<ConsistentScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate exactly ${sceneCount} consistent storyboard scenes for: ${synopsis}. 
            Ensure a complete narrative from 0% start to 100% finish.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sceneNumber: { type: Type.INTEGER },
                            action: { type: Type.STRING },
                            consistentContext: { type: Type.STRING, description: 'Highly detailed English visual prompt for AI video generation.' },
                            voiceover: { type: Type.STRING },
                            asmrType: { type: Type.STRING }
                        },
                        required: ["sceneNumber", "action", "consistentContext", "voiceover"]
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates characters based on a context using gemini-3-flash-preview.
 */
export const generateCharacters = async (context: string, count: number, styleExtra?: string, smartThinking?: boolean): Promise<Character[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `Create ${count} detailed characters for: ${context}. ${styleExtra || ""}`;
        const response = await ai.models.generateContent({
            model: smartThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            gender: { type: Type.STRING },
                            age: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                        required: ["name", "gender", "age", "description"]
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates story ideas based on a topic.
 */
export const generateStoryIdeas = async (topic: string, smart: boolean = false): Promise<StoryIdea[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: smart ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
            contents: `Generate 5 creative and viral story ideas for topic: ${topic}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates YouTube metadata for a project with advanced SEO features.
 */
export const generateYouTubeMetadata = async (title: string, context: string, type: string): Promise<YouTubeMetadata> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `As a YouTube SEO Expert, generate professional viral YouTube metadata for this ${type} project: ${title}.
            Context for content: ${context}.
            
            REQUIREMENTS:
            1. Title: Catchy, high-CTR, strictly under 100 characters.
            2. Description: Compelling, includes hooks, naturally integrates keywords, and includes placeholders for social links.
            3. Hashtags: Exactly 15 relevant, high-traffic hashtags (starting with #).
            4. Keywords/Tags: Generate a broad set of 30-40 SEO-optimized tags for the YT Studio tag box.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Analyzes an image reference for character traits and style.
 */
export const analyzeCharacterReference = async (base64: string, mimeType: string): Promise<CharacterAnalysis> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Analyze this image for character/subject traits and artistic style. Output JSON with artStyle and characterDescription fields." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        artStyle: { type: Type.STRING },
                        characterDescription: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

export const generateVoiceover = async (text: string, lang: string = 'en', voice: PrebuiltVoice = 'Kore', emotion?: string, instruction?: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `${instruction ? instruction + "\n" : ""}${emotion ? "(" + emotion + ") " : ""}Speak this in ${lang}: ${text}`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("Voice generation failed.");
        return base64Audio;
    });
};

export const generatePodcastScript = async (options: { topic: string; language: string; podcastType: string; characters: any[]; durationInMinutes: number; speakingStyle: string }): Promise<Dialog[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `PODCAST TOPIC: ${options.topic}\nTYPE: ${options.podcastType}\nDURATION: ${options.durationInMinutes} mins\nSTYLE: ${options.speakingStyle}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            character: { type: Type.STRING },
                            line: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

export const generateDialog = async (dialog: Dialog[], speakers: { speaker: string; voiceName: PrebuiltVoice }[], instruction?: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `${instruction ? instruction + "\n" : ""}Convert the following dialog to audio:\n${dialog.map(d => `${d.character}: ${d.line}`).join('\n')}`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakers.map(s => ({
                            speaker: s.speaker,
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voiceName } }
                        }))
                    }
                }
            }
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("Dialog generation failed.");
        return base64Audio;
    });
};

export const generateDetailedMvScript = async (prompt: string, chars: any[], style: string): Promise<MvDetailedScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `PROMPT: ${prompt}, CHARS: ${JSON.stringify(chars)}, STYLE: ${style}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            action: { type: Type.STRING },
                            full_prompt: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

export const generateMvStoryIdeas = async (topic: string): Promise<StoryIdea[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 5 creative and viral MV story ideas for: ${topic}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

export const generateCarRestorationIdeas = async (topic: string): Promise<CarIdea[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 5 car restoration ideas for: ${topic}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates specialized restoration ideas for various subjects.
 */
export const generateHomeRestorationIdeas = (topic: string) => generateCarRestorationIdeas("Home Restoration: " + topic);
export const generatePhoneRestorationIdeas = (topic: string) => generateCarRestorationIdeas("Phone Restoration: " + topic);
export const generateBicycleRestorationIdeas = (topic: string) => generateCarRestorationIdeas("Bicycle Restoration: " + topic);
export const generateRoomCleaningIdeas = (topic: string) => generateCarRestorationIdeas("Room Cleaning: " + topic);
export const generateRoomDesignIdeas = (topic: string) => generateCarRestorationIdeas("Room Design: " + topic);

/**
 * Generates a full story production script.
 */
export const generateStory = async (options: { topic: string; style: string; sceneCount: number; characters: Character[]; smartThinking?: boolean }): Promise<StoryScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: options.smartThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
            contents: `STORY TOPIC: ${options.topic}\nSTYLE: ${options.style}\nSCENE COUNT: ${options.sceneCount}\nCHARACTERS: ${JSON.stringify(options.characters)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            title: { type: Type.STRING },
                            slug: { type: Type.STRING },
                            scene_description: { type: Type.OBJECT, properties: { line: { type: Type.STRING } } },
                            dialog: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { character: { type: Type.STRING }, line: { type: Type.STRING } } } },
                            prompt: { type: Type.STRING },
                            voiceover: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates lyrics for a song.
 */
export const generateLyrics = async (options: { topic: string; style: string; mood: string }): Promise<{ songTitle: string; songLyrics: string }> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate song lyrics. Topic: ${options.topic}. Style: ${options.style}. Mood: ${options.mood}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        songTitle: { type: Type.STRING },
                        songLyrics: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates visual scenes from song lyrics.
 */
export const generateScenesFromLyrics = async (lyrics: string, style: string, count: number, context: string): Promise<VisualScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `LYRICS: ${lyrics}\nSTYLE: ${style}\nCOUNT: ${count}\nCONTEXT: ${context}`,
            config: {
                responseMimeType: "application/json",
                // COMMENT: Expanded schema to include fields needed by VisualScene and KidsStoryGenerator components.
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            lyric_segment: { type: Type.STRING },
                            prompt: { type: Type.STRING },
                            visual_description: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        // COMMENT: Fixed mapping to ensure narrative and visual_prompt are populated for VisualScene return type.
        return JSON.parse(cleanJson(response.text || "[]")).map((s: any) => ({ 
            ...s, 
            narrative: s.lyric_segment, 
            visual_prompt: s.prompt 
        }));
    });
};

/**
 * Generates a simple story with title and content.
 */
export const generateSimpleStory = async (options: { topic: string; style: string; length?: string }): Promise<{ storyTitle: string; storyContent: string }> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a ${options.length || 'short'} story. Topic: ${options.topic}. Style: ${options.style}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        storyTitle: { type: Type.STRING },
                        storyContent: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates visual scenes from a story.
 */
export const generateScenesFromStory = async (storyContext: string, count: number): Promise<VisualScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `STORY CONTEXT: ${storyContext}\nCOUNT: ${count}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            narrative: { type: Type.STRING },
                            visual_prompt: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates a music prompt for a song.
 */
export const generateSongMusicPrompt = async (title: string, style: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a professional Suno/Udio music prompt for a song titled "${title}" in style "${style}". Output only the prompt text.`
        });
        return response.text || "";
    });
};

/**
 * Generates a vlog script with segments.
 */
export const generateVlogScript = async (topic: string, style: string, duration: number): Promise<VlogScriptResponse> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `TOPIC: ${topic}\nSTYLE: ${style}\nDURATION: ${duration} mins`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        script: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    segment: { type: Type.STRING },
                                    speech: { type: Type.STRING },
                                    visual: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates a batch of vlog storyboard scenes.
 */
export const generateVlogStoryboardBatch = async (script: any): Promise<VlogStoryboardScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a visual storyboard for this vlog script: ${JSON.stringify(script)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.INTEGER },
                            visual: { type: Type.STRING },
                            audio: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates a script outline.
 */
export const generateScriptOutline = async (story: string, prompt: string, lang: string): Promise<ScriptOutline> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `STORY: ${story}\nPROMPT: ${prompt}\nLANG: ${lang}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        outline: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    chapter: { type: Type.INTEGER },
                                    title: { type: Type.STRING },
                                    summary: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates a script for a webtoon.
 */
export const generateWebtoonScript = async (topic: string, style: string, count: number, lang: string, chars: Character[]): Promise<WebtoonPanel[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `TOPIC: ${topic}\nSTYLE: ${style}\nCOUNT: ${count}\nLANG: ${lang}\nCHARS: ${JSON.stringify(chars)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            panelNumber: { type: Type.INTEGER },
                            visualDescription: { type: Type.STRING },
                            dialogue: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        character: { type: Type.STRING },
                                        text: { type: Type.STRING },
                                        type: { type: Type.STRING, enum: ['speech', 'thought', 'narration'] }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates a Khmer story script.
 */
export const generateKhmerStory = async (topic: string, style: string, count: number, chars: Character[]): Promise<KhmerScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate Khmer Story. TOPIC: ${topic}. STYLE: ${style}. COUNT: ${count}. CHARS: ${JSON.stringify(chars)}. Output exactly ${count} scenes. Dialogues MUST be in Khmer.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sceneNumber: { type: Type.INTEGER },
                            action: { type: Type.STRING },
                            visualPrompt: { type: Type.STRING },
                            dialogues: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        character: { type: Type.STRING },
                                        text: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Translates story content (scenes).
 */
export const translateStoryContent = async (scenes: KhmerScene[], lang: string): Promise<KhmerScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the dialogues in these scenes to ${lang}: ${JSON.stringify(scenes)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sceneNumber: { type: Type.INTEGER },
                            action: { type: Type.STRING },
                            visualPrompt: { type: Type.STRING },
                            dialogues: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        character: { type: Type.STRING },
                                        text: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates trivia questions.
 */
export const generateTrivia = async (topic: string, count: number, diff: string, lang: string, style: string): Promise<TriviaQuestion[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate ${count} trivia questions. TOPIC: ${topic}. DIFF: ${diff}. LANG: ${lang}. STYLE: ${style}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates a visual story with image and text.
 */
export const generateVisualStory = async (topic: string, style: string, lang: string): Promise<{ content: string; imagePrompt: string }> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a visual story. TOPIC: ${topic}. STYLE: ${style}. LANG: ${lang}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates relaxing video prompts.
 */
export const generateRelaxingPrompts = async (options: any): Promise<RelaxingPromptsResponse> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate relaxing content prompts: ${JSON.stringify(options)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        musicPrompt: { type: Type.STRING },
                        videoSegments: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    segmentNumber: { type: Type.INTEGER },
                                    prompt: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Extracts lyrics from a media file.
 */
export const extractLyricsFromMedia = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Transcribe the lyrics from this song exactly. Output ONLY the lyrics." }
                ]
            }
        });
        return response.text || "";
    });
};

/**
 * Translates song lyrics while preserving rhythm context.
 */
export const translateSongLyrics = async (lyrics: string, source: string, target: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate these lyrics from ${source} to ${target}, preserving rhythm and emotional feel:\n\n${lyrics}`
        });
        return response.text || "";
    });
};

/**
 * Generates lyrics based on a song title.
 */
export const generateLyricsFromTitle = async (title: string, gender?: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write full song lyrics for a song titled "${title}"${gender ? ` suitable for a ${gender} singer` : ''}. Output ONLY the lyrics text.`
        });
        return response.text || "";
    });
};

/**
 * Generates a specific chapter for a story.
 */
export const generateStoryChapter = async (topic: string, num: number, total: number, context: string, plan: any): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `Write Chapter ${num}/${total} for story "${topic}". Context: ${context}. Plan: ${JSON.stringify(plan)}. Length: 550-600 words.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "";
    });
};

/**
 * Generates a visual prompt from a text block.
 */
export const generateVisualPromptFromText = async (text: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a detailed 3D cinematic image generation prompt based on this text:\n\n${text}`
        });
        return response.text || "";
    });
};

/**
 * Generates a detailed story outline in JSON.
 */
export const generateStoryOutlineJson = async (topic: string, chapters: number): Promise<DetailedOutline> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a detailed ${chapters}-chapter outline for: ${topic}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        chapters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    chapter: { type: Type.INTEGER },
                                    title: { type: Type.STRING },
                                    purpose: { type: Type.STRING },
                                    summary: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates a full kids music project.
 */
export const generateKidsMusicProject = async (topic: string, style: string, type: string, vstyle: string, scenes: number, chars: Character[]): Promise<KidsMusicProject> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create Kids Music Project. TOPIC: ${topic}. STYLE: ${style}. CHARS: ${JSON.stringify(chars)}. SCENES: ${scenes}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        lyrics: { type: Type.STRING },
                        musicPrompt: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sceneNumber: { type: Type.INTEGER },
                                    lyricSegment: { type: Type.STRING },
                                    visualPrompt: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates dance prompts.
 */
export const generateDancePrompts = async (style: string, vstyle: string, type: string, scenes: number, chars: Character[]): Promise<DanceProject> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create Dance Project. STYLE: ${style}. VSTYLE: ${vstyle}. CHARS: ${JSON.stringify(chars)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        masterPrompt: { type: Type.STRING },
                        musicPrompt: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sceneNumber: { type: Type.INTEGER },
                                    action: { type: Type.STRING },
                                    videoPrompt: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates a short film project.
 */
export const generateShortFilmProject = async (title: string, synopsis: string, genre: string, style: string, type: string, scenes: number, chars: Character[]): Promise<ShortFilmProject> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create Short Film. TITLE: ${title}. SYNOPSIS: ${synopsis}. GENRE: ${genre}. STYLE: ${style}. CHARS: ${JSON.stringify(chars)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        synopsis: { type: Type.STRING },
                        genre: { type: Type.STRING },
                        visualStyle: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sceneNumber: { type: Type.INTEGER },
                                    action: { type: Type.STRING },
                                    videoPrompt: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
};

/**
 * Generates a home design transformation.
 */
export const generateHomeDesign = async (img: any, mode: string, room: string, style: string, extra: string, ratio: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `Home Design Mode: ${mode}. Room: ${room}. Style: ${style}. Extra: ${extra}. High-quality 8k photorealistic.`;
        const parts: any[] = [];
        if (img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        parts.push({ text: prompt });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio: ratio as any } }
        });
        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Design failed.");
    });
};

/**
 * Generates a conversation script.
 */
export const generateConversationScript = async (topic: string, chars: Character[], dur: number): Promise<Dialog[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create conversation script. TOPIC: ${topic}. CHARS: ${JSON.stringify(chars)}. DUR: ${dur} mins.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            character: { type: Type.STRING },
                            line: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Generates an MV storyboard script.
 */
export const generateMvScript = async (title: string, artist: string): Promise<MvScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create MV storyboard for "${title}" by "${artist}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            timestamp: { type: Type.STRING },
                            lyrics: { type: Type.STRING },
                            visual_description: { type: Type.STRING },
                            video_prompt: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

/**
 * Image transformation/cloning.
 */
export const generateCloneImage = async (base64: string, mimeType: string, prompt: string, aspectRatio: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: prompt }
                ]
            },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Clone failed.");
    });
};

/**
 * Creative AI assistant for writing.
 */
export const assistWriting = async (options: { story: string; instruction: string; genre: string; tone: string }): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `GENRE: ${options.genre}\nTONE: ${options.tone}\nSTORY SO FAR: ${options.story}\nTASK: ${options.instruction}. Output ONLY the new text.`
        });
        return response.text || "";
    });
};

/**
 * Generates an image for a specific scene description.
 */
export const generateImageForScene = async (prompt: string, aspectRatio: string): Promise<string> => {
    return generateImage(prompt, aspectRatio, 'Medium');
};

/**
 * Extends a story with image context.
 */
export const extendStoryWithImage = async (text: string, base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: `Continue this story: ${text}. Based on the visual context provided in the image.` }
                ]
            }
        });
        return response.text || "";
    });
};

export const generateHollywoodNarration = async (topic: string, style: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a professional Hollywood movie trailer narration script for: ${topic}. Style: ${style}. Focus on deep, impactful narration. Output only the script.`
        });
        return response.text || "";
    });
};

export const generateHollywoodMusicPrompt = async (topic: string, style: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a highly detailed music prompt for an AI music generator that matches a Hollywood trailer for: ${topic}. Style: ${style}. Focus on instrumentation, mood, and epic build-up.`
        });
        return response.text || "";
    });
};

export const generateHollywoodMvScript = async (topic: string, style: string, count: number, characters: string): Promise<HollywoodMvScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a Hollywood MV script for: ${topic}. Style: ${style}. Scenes: ${count}. Characters: ${characters}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            time_range: { type: Type.STRING },
                            description: { type: Type.STRING },
                            video_prompt: { type: Type.STRING }
                        },
                        required: ["scene_number", "time_range", "description", "video_prompt"]
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

// COMMENT: Added missing function to generate video ideas.
/**
 * Generates video ideas based on specific criteria.
 */
export const generateVideoIdeas = async (options: { videoType: string; language: string; characterStyle: string; customTopic: string; ideaCount: number }): Promise<VideoIdea[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate ${options.ideaCount} creative video ideas for ${options.videoType} content.
            Topic: ${options.customTopic}
            Language: ${options.language}
            Style: ${options.characterStyle}
            Output JSON with title, summary, and sampleScriptLine.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            sampleScriptLine: { type: Type.STRING }
                        },
                        required: ["title", "summary", "sampleScriptLine"]
                    }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

// COMMENT: Added missing function to generate quote prompts.
/**
 * Generates image prompts for quotes.
 */
export const generateQuotifyPrompts = async (speaker: string, count: number, style: string, focusOnCharacters: boolean): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `As an expert prompt engineer, generate ${count} high-quality and viral-worthy image generation prompts for quotes by ${speaker}. 
            Style: ${style}. 
            ${focusOnCharacters ? "CRITICAL: Put strong focus on the characters and faces in every shot so they are clear." : ""}
            Output JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};

// COMMENT: Added missing function to enhance quote prompts.
/**
 * Enhances image generation prompts.
 */
export const enhanceQuotifyPrompts = async (prompts: string[]): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Enhance these image generation prompts for extreme realism and cinematic quality. Maintain original meaning but add technical lighting and texture details: ${JSON.stringify(prompts)}. Output JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    });
};
