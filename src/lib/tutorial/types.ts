export type TutorialStatus = 'not_started' | 'in_progress' | 'skipped' | 'completed';
export type TutorialPortal = 'client' | 'manager' | 'platform_admin';
export type StepPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  target: string;
  placement: StepPlacement;
  route: string | null;
}

export interface TutorialDefinition {
  id: string;
  key: string;
  portal: TutorialPortal;
  title: string;
  description: string;
  steps: TutorialStep[];
  version: number;
}

export interface TutorialProgress {
  id: string;
  user_id: string;
  tutorial_key: string;
  status: TutorialStatus;
  current_step: number;
  steps_completed: string[];
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
}

export interface TutorialContextValue {
  isActive: boolean;
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  step: TutorialStep | null;
  definition: TutorialDefinition | null;
  progress: TutorialProgress | null;
  status: TutorialStatus | null;
  isHelpOpen: boolean;
  advance: () => void;
  back: () => void;
  skip: () => void;
  restart: () => void;
  openHelp: () => void;
  closeHelp: () => void;
}
