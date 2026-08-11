import type { RoleProfile } from './types';

export type PrimaryAction = 'start' | 'resume' | 'processing' | 'retry' | 'view-result' | 'none';

export interface EligibilityFacts {
  hasActiveAttempt: boolean;
  attemptProcessing: boolean;
  canStartNewAttempt: boolean;
  hasSubmittedAttempt: boolean;
  hasRemainingAttempts: boolean;
  internallyPassed: boolean;
  resultAvailable: boolean;
  examPaused: boolean;
}

export function resolvePrimaryAction(facts: EligibilityFacts): PrimaryAction {
  if (facts.hasActiveAttempt) return facts.examPaused ? 'resume' : 'resume';
  if (facts.attemptProcessing) return 'processing';
  if (facts.resultAvailable && (facts.internallyPassed || !facts.hasRemainingAttempts)) return 'view-result';
  if (facts.canStartNewAttempt && !facts.internallyPassed) return facts.hasSubmittedAttempt ? 'retry' : 'start';
  if (facts.resultAvailable) return 'view-result';
  return 'none';
}

export interface ResultVisibility {
  summaryMomentReached: boolean;
  showScore: boolean;
  showPass: boolean;
  wholeExamFinished: boolean;
  hasRemainingLegalAttempt: boolean;
  showAnswer: boolean;
  showAnalysis: boolean;
  resultLocked: boolean;
}

export interface ResultPayload {
  score?: number;
  passed?: boolean;
  officialAttempt?: string;
  questions?: string[];
  answers?: string[];
  analysis?: string[];
}

export function visibleResult(payload: ResultPayload, gate: ResultVisibility): ResultPayload {
  if (gate.resultLocked || !gate.summaryMomentReached) return {};
  const visible: ResultPayload = {};
  if (gate.showScore) {
    visible.score = payload.score;
    visible.officialAttempt = payload.officialAttempt;
  }
  if (gate.showPass) visible.passed = payload.passed;
  const reviewAllowed = gate.wholeExamFinished && !gate.hasRemainingLegalAttempt;
  if (reviewAllowed && (gate.showAnswer || gate.showAnalysis)) visible.questions = payload.questions;
  if (reviewAllowed && gate.showAnswer) visible.answers = payload.answers;
  if (reviewAllowed && gate.showAnalysis) visible.analysis = payload.analysis;
  return visible;
}

export type MockTerminal = 'in-progress' | 'completed' | 'abandoned';

export function resolveMockTerminal(current: MockTerminal, request: 'submit' | 'abandon', expired: boolean): MockTerminal {
  if (current !== 'in-progress') return current;
  if (request === 'abandon' && !expired) return 'abandoned';
  return 'completed';
}

export function canConfirmOutage(role: RoleProfile, isLastAuthorizedAdmin: boolean, action: 'confirm' | 'revoke'): boolean {
  if (action === 'revoke' && isLastAuthorizedAdmin) return false;
  return role === 'authorized-admin';
}
