import React, { createContext, useContext, useState } from 'react';
import { MealType, Medication, OnboardingDraft, defaultDraft } from '../types';

interface OnboardingContextValue {
  draft: OnboardingDraft;
  setName: (name: string) => void;
  addDraftMedication: (med: Omit<Medication, 'id' | 'createdAt'>) => void;
  removeDraftMedication: (index: number) => void;
  setReferenceTime: (meal: MealType, time: string) => void;
  resetDraft: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);

  const setName = (name: string) => setDraft((prev) => ({ ...prev, name }));

  const addDraftMedication = (med: Omit<Medication, 'id' | 'createdAt'>) =>
    setDraft((prev) => ({ ...prev, medications: [...prev.medications, med] }));

  const removeDraftMedication = (index: number) =>
    setDraft((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));

  const setReferenceTime = (meal: MealType, time: string) =>
    setDraft((prev) => ({
      ...prev,
      referenceTimes: { ...prev.referenceTimes, [meal]: time },
    }));

  const resetDraft = () => setDraft(defaultDraft);

  return (
    <OnboardingContext.Provider
      value={{
        draft,
        setName,
        addDraftMedication,
        removeDraftMedication,
        setReferenceTime,
        resetDraft,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};
