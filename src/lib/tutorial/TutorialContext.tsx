import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../supabase';
import { FALLBACK_STEPS } from './fallbackSteps';
import type {
  TutorialContextValue,
  TutorialDefinition,
  TutorialPortal,
  TutorialProgress,
  TutorialStatus,
  TutorialStep,
} from './types';

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_KEY: Record<TutorialPortal, string> = {
  client: 'client_first_run',
  manager: 'manager_first_run',
  platform_admin: 'platform_admin_first_run',
};

interface Props {
  portal: TutorialPortal;
  onNavigate?: (route: string) => void;
  children: ReactNode;
}

export function TutorialProvider({ portal, onNavigate, children }: Props) {
  const tutorialKey = TUTORIAL_KEY[portal];
  const [definition, setDefinition] = useState<TutorialDefinition | null>(null);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps: TutorialStep[] = definition?.steps ?? FALLBACK_STEPS[tutorialKey] ?? [];
  const totalSteps = steps.length;
  const step = isOpen && steps[currentStep] ? steps[currentStep] : null;
  const status: TutorialStatus | null = progress?.status ?? null;
  const isActive = isOpen;

  // Load definition + progress on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Load definition
      const { data: defData } = await supabase
        .from('tutorial_definitions')
        .select('*')
        .eq('key', tutorialKey)
        .eq('is_active', true)
        .maybeSingle();

      if (!cancelled && defData) {
        setDefinition({
          ...defData,
          steps: Array.isArray(defData.steps) ? defData.steps : [],
        } as TutorialDefinition);
      }

      // Load or create progress using RPC
      const { data: progressData } = await supabase.rpc('get_or_create_tutorial_progress', {
        p_user_id: user.id,
        p_tutorial_key: tutorialKey,
      });

      if (cancelled || !progressData) return;

      const prog = progressData as unknown as TutorialProgress;
      setProgress(prog);
      setCurrentStep(prog.current_step ?? 0);

      // Auto-launch after 1.5s if not started, skipped or in_progress
      if (prog.status === 'not_started' || prog.status === 'in_progress') {
        launchTimerRef.current = setTimeout(() => {
          if (!cancelled) setIsOpen(true);
        }, 1500);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (launchTimerRef.current) clearTimeout(launchTimerRef.current);
    };
  }, [tutorialKey]);

  // Navigate when step changes and has a route
  useEffect(() => {
    if (!isOpen || !step?.route || !onNavigate) return;
    onNavigate(step.route);
  }, [isOpen, step?.route, onNavigate]);

  const persistProgress = useCallback(
    async (updates: Partial<TutorialProgress>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const merged = { ...progress, ...updates, updated_at: now } as TutorialProgress;
      setProgress(merged);

      await supabase
        .from('user_tutorial_progress')
        .update({ ...updates, updated_at: now })
        .eq('user_id', user.id)
        .eq('tutorial_key', tutorialKey);
    },
    [progress, tutorialKey]
  );

  const advance = useCallback(async () => {
    const nextStep = currentStep + 1;
    const completedIds = [...(progress?.steps_completed ?? [])];
    if (step && !completedIds.includes(step.id)) completedIds.push(step.id);

    if (nextStep >= totalSteps) {
      setIsOpen(false);
      await persistProgress({
        status: 'completed',
        current_step: totalSteps - 1,
        steps_completed: completedIds as unknown as string[],
        completed_at: new Date().toISOString(),
      });
    } else {
      setCurrentStep(nextStep);
      await persistProgress({
        status: 'in_progress',
        current_step: nextStep,
        steps_completed: completedIds as unknown as string[],
        started_at: progress?.started_at ?? new Date().toISOString(),
      });
    }
  }, [currentStep, totalSteps, step, progress, persistProgress]);

  const back = useCallback(async () => {
    if (currentStep <= 0) return;
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    await persistProgress({ current_step: prevStep });
  }, [currentStep, persistProgress]);

  const skip = useCallback(async () => {
    setIsOpen(false);
    await persistProgress({
      status: 'skipped',
      current_step: currentStep,
      skipped_at: new Date().toISOString(),
    });
  }, [currentStep, persistProgress]);

  const restart = useCallback(async () => {
    setCurrentStep(0);
    setIsOpen(true);
    await persistProgress({
      status: 'in_progress',
      current_step: 0,
      steps_completed: [] as unknown as string[],
      started_at: new Date().toISOString(),
      completed_at: null as unknown as string,
      skipped_at: null as unknown as string,
    });
  }, [persistProgress]);

  const openHelp = useCallback(() => {
    setIsOpen(false);
    setIsHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        isOpen,
        currentStep,
        totalSteps,
        step,
        definition,
        progress,
        status,
        isHelpOpen,
        advance,
        back,
        skip,
        restart,
        openHelp,
        closeHelp,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used inside TutorialProvider');
  return ctx;
}
