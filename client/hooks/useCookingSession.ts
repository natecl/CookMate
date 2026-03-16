import { useState, useCallback } from 'react';
import type { CookingSession, SessionEvent } from '../../types/session';
import type { Recipe } from '../../types/recipe';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:5000';
const API_BASE = `${API_BASE_URL}/api/cooking`;

export const useCookingSession = () => {
  const [session, setSession] = useState<CookingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSession = useCallback(async (recipe: Recipe): Promise<CookingSession | null> => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');
      setSession(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string): Promise<CookingSession | null> => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Session not found');
      setSession(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendEvent = useCallback(async (eventPayload: SessionEvent, sessionIdOverride?: string): Promise<CookingSession | null> => {
    const id = sessionIdOverride || session?.sessionId;
    if (!id) return null;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Event failed');
      setSession(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [session?.sessionId]);

  const startCooking = useCallback((sessionId?: string) => sendEvent({ type: 'START_COOKING' }, sessionId), [sendEvent]);
  const nextStep = useCallback(() => sendEvent({ type: 'NEXT_STEP' }), [sendEvent]);
  const previousStep = useCallback(() => sendEvent({ type: 'PREVIOUS_STEP' }), [sendEvent]);
  const completeStep = useCallback(() => sendEvent({ type: 'MARK_STEP_COMPLETE' }), [sendEvent]);
  const goToStep = useCallback((stepIndex: number) => sendEvent({ type: 'GO_TO_STEP', stepIndex }), [sendEvent]);
  const pauseSession = useCallback(() => sendEvent({ type: 'PAUSE_SESSION' }), [sendEvent]);
  const resumeSession = useCallback(() => sendEvent({ type: 'RESUME_SESSION' }), [sendEvent]);
  const finishSession = useCallback(() => sendEvent({ type: 'FINISH_SESSION' }), [sendEvent]);
  const resetSession = useCallback(() => sendEvent({ type: 'RESET_SESSION' }), [sendEvent]);

  return {
    session,
    loading,
    error,
    createSession,
    loadSession,
    sendEvent,
    startCooking,
    nextStep,
    previousStep,
    completeStep,
    goToStep,
    pauseSession,
    resumeSession,
    finishSession,
    resetSession
  };
};
