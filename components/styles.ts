
export interface Style {
  name: string;
  value: string; // The value to be used in the prompt
  imageUrl: string;
  category: '4d' | '3d' | '2d' | 'anime' | 'roblox' | 'stickman' | 'fantasy';
}

export const styles: Style[] = [
  // --- 4D VIDEO STYLES ---
  { name: 'Cinematic Hyper-Realism', category: '4d', value: '4D Cinematic Hyper-Realism, ultra-realistic lighting, 8k raw photo, macro detail, cinematic motion blur, professional color grading', imageUrl: 'https://images.pexels.com/photos/3035151/pexels-photo-3035151.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { name: 'Unreal Engine 5 Render', category: '4d', value: 'Unreal Engine 5 cinematic render, ray-traced reflections, global illumination, nanite detail, high-end production aesthetic', imageUrl: 'https://images.pexels.com/photos/2526105/pexels-photo-2526105.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { name: 'Futuristic Cyber-Glow', category: '4d', value: '4D Futuristic Cyber-Glow, neon luminescence, holographic particles, high-tech atmosphere, deep shadows, electric blue and magenta palette', imageUrl: 'https://images.pexels.com/photos/2526105/pexels-photo-2526105.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { name: 'Satisfying ASMR Macro', category: '4d', value: '4D satisfying ASMR macro photography, extreme close-up, high-speed shutter, detailed material textures, soft natural lighting', imageUrl: 'https://images.pexels.com/photos/7848995/pexels-photo-7848995.jpeg?auto=compress&cs=tinysrgb&w=150' },
  
  // --- 3D STYLE ---
  { name: 'Disney-Pixar 3D', category: '3d', value: 'Disney-style 3D animation, whimsical lighting, rounded expressive characters, vibrant colors, heartwarming cinematic feel', imageUrl: 'https://images.pexels.com/photos/7848995/pexels-photo-7848995.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: '3D Claymation', category: '3d', value: 'Handcrafted claymation style, stop-motion texture, fingerprint details on surfaces, bright poppy colors, Aardman aesthetic', imageUrl: 'https://images.pexels.com/photos/385997/pexels-photo-385997.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Voxel Adventure', category: '3d', value: '3D Voxel blocky style, vibrant primary colors, Minecraft-inspired grid, sharp shadows, cute geometric models', imageUrl: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=100' },

  // --- ANIME ---
  { name: 'Studio Ghibli Lush', category: 'anime', value: 'Studio Ghibli hand-painted aesthetic, watercolor sky, lush green nature, nostalgic summer vibe, soft character lines', imageUrl: 'https://images.pexels.com/photos/3762299/pexels-photo-3762299.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Makoto Shinkai Sky', category: 'anime', value: 'Makoto Shinkai style, atmospheric depth, vibrant lens flares, breathtaking clouds, photorealistic anime lighting', imageUrl: 'https://images.pexels.com/photos/1906658/pexels-photo-1906658.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Retro 90s Cel', category: 'anime', value: '90s retro anime style, grainy cel animation, neon nights, lo-fi aesthetic, sharp black outlines', imageUrl: 'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=100' },

  // --- 2D STYLE ---
  { name: 'Flat Vector Modern', category: '2d', value: '2D flat vector illustration, minimal color palette, geometric simplicity, modern corporate design style', imageUrl: 'https://images.pexels.com/photos/159751/book-address-book-learning-learn-159751.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { name: 'Paper Cutout layered', category: '2d', value: '2D paper cutout style, visible paper textures, layered depth shadows, vibrant colors, handcrafted feel', imageUrl: 'https://images.pexels.com/photos/673648/pexels-photo-673648.jpeg?auto=compress&cs=tinysrgb&w=100' }
];
