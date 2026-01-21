import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface Subscription {
  subscription: string;
  expiry: string;
  daysLeft: number;
}

export interface GoogleProfile {
  name: string;
  email: string;
  picture: string;
}

interface User {
  name: string;
  picture: string; // URL or data URI for the profile picture
  subscriptions?: Subscription[];
}

interface AuthContextType {
  user: User | null; // This represents the Licensed User (KeyAuth)
  googleUser: GoogleProfile | null; // This represents the Google Account
  setGoogleUser: (profile: GoogleProfile | null) => void;
  login: (userInfo: { username: string; subscriptions?: Subscription[] }) => void;
  logout: () => void;
  isLicensed: boolean;
  setIsLicensed: (isLicensed: boolean) => void;
  isGoogleBypassed: boolean;
  bypassGoogle: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to generate a safe SVG data URI avatar
export const generateAvatar = (name: string) => {
    const letter = (name || '?').charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#4f46e5"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">${letter}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleProfile | null>(null);
  // Default isLicensed to true to remove the license login gate
  const [isLicensed, setIsLicensed] = useState<boolean>(true);
  const [isGoogleBypassed, setIsGoogleBypassed] = useState<boolean>(true);

  // Check for existing Google Session in localStorage
  useEffect(() => {
    const storedGoogle = localStorage.getItem('google_user_profile');
    if (storedGoogle) {
      try {
        setGoogleUser(JSON.parse(storedGoogle));
      } catch (e) {
        console.error("Failed to parse stored google profile");
        localStorage.removeItem('google_user_profile');
      }
    }
  }, []);

  const setGoogleUserHandler = (profile: GoogleProfile | null) => {
    setGoogleUser(profile);
    if (profile) {
      localStorage.setItem('google_user_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('google_user_profile');
    }
  };

  const bypassGoogle = () => {
    setIsGoogleBypassed(true);
  };

  const login = (userInfo: { username: string; subscriptions?: Subscription[] }) => {
    setUser({
      name: userInfo.username,
      picture: googleUser?.picture || generateAvatar(userInfo.username),
      subscriptions: userInfo.subscriptions
    });
  };

  const logout = () => {
    setUser(null);
    setGoogleUser(null);
    localStorage.removeItem('google_user_profile');
    localStorage.removeItem('username');
    localStorage.removeItem('license_key');
    // We don't set isLicensed to false because the app is now fully public
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLicensed, setIsLicensed, googleUser, setGoogleUser: setGoogleUserHandler, isGoogleBypassed, bypassGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};