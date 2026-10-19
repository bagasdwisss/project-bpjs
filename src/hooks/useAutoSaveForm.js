// src/hooks/useAutoSaveForm.js - Graceful Browser Crash Recovery (State Auto-Save)
import { useState, useEffect, useRef } from 'react';

export const useAutoSaveForm = (formKey, currentFormData, isEnabled = true) => {
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const saveTimeoutRef = useRef(null);

  const storageKey = `bpjstk_autosave_${formKey}`;

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEnabled) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          setDraftData(parsed);
          setHasSavedDraft(true);
        }
      }
    } catch (err) {
      console.warn('Could not read autosaved draft:', err);
    }
  }, [storageKey, isEnabled]);

  // Debounced auto-save on currentFormData change
  useEffect(() => {
    if (!isEnabled || !currentFormData) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(currentFormData));
      } catch (err) {
        console.warn('Could not autosave draft:', err);
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentFormData, storageKey, isEnabled]);

  const restoreDraft = () => {
    setHasSavedDraft(false);
    return draftData;
  };

  const discardDraft = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setHasSavedDraft(false);
    setDraftData(null);
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setHasSavedDraft(false);
    setDraftData(null);
  };

  return {
    hasSavedDraft,
    draftData,
    restoreDraft,
    discardDraft,
    clearDraft
  };
};

export default useAutoSaveForm;
