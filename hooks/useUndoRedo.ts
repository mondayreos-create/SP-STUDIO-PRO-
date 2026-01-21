
import { useState, useCallback, useRef } from 'react';

export function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const pointerRef = useRef<number>(0);

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const resolvedState = typeof newState === 'function' 
          ? (newState as (prev: T) => T)(prev) 
          : newState;

      // Remove any "redo" history if we are in the middle of the stack
      const newHistory = historyRef.current.slice(0, pointerRef.current + 1);
      newHistory.push(resolvedState);
      
      // Limit history to 50 items
      if (newHistory.length > 50) newHistory.shift();
      
      historyRef.current = newHistory;
      pointerRef.current = newHistory.length - 1;
      return resolvedState;
    });
  }, []);

  const undo = useCallback(() => {
    if (pointerRef.current > 0) {
      pointerRef.current -= 1;
      const prevState = historyRef.current[pointerRef.current];
      setState(prevState);
    }
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current < historyRef.current.length - 1) {
      pointerRef.current += 1;
      const nextState = historyRef.current[pointerRef.current];
      setState(nextState);
    }
  }, []);

  const reset = useCallback((newState: T) => {
    historyRef.current = [newState];
    pointerRef.current = 0;
    setState(newState);
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo: pointerRef.current > 0,
    canRedo: pointerRef.current < historyRef.current.length - 1
  };
}
