
import { useEffect, useRef, useCallback } from 'react';

export function useAutoSave<T>(toolName: string, state: T, onSave?: () => void) {
  const lastStateRef = useRef<string>(JSON.stringify(state));
  const inactivityTimerRef = useRef<number | null>(null);

  const saveToDraft = useCallback(() => {
    const currentState = JSON.stringify(state);
    if (currentState !== lastStateRef.current) {
      localStorage.setItem(`draft_${toolName}`, currentState);
      lastStateRef.current = currentState;
      if (onSave) onSave();
      console.log(`[AutoSave] Saved draft for ${toolName}`);
    }
  }, [state, toolName, onSave]);

  // Periodic Save (Every 60s)
  useEffect(() => {
    const interval = setInterval(saveToDraft, 60000);
    return () => clearInterval(interval);
  }, [saveToDraft]);

  // Inactivity Save (30s)
  useEffect(() => {
    const handleActivity = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(saveToDraft, 30000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    handleActivity(); // Initialize timer

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    };
  }, [saveToDraft]);

  return { saveToDraft };
}
