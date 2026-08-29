import { describe, expect, it } from 'vitest';
import { canConfirmOutage, resolveMockTerminal, resolvePrimaryAction, visibleResult } from '../src/domain';

describe('formal exam primary action', () => {
  it('always resumes the single active attempt', () => {
    expect(resolvePrimaryAction({ hasActiveAttempt: true, attemptProcessing: false, canStartNewAttempt: true, hasSubmittedAttempt: false, hasRemainingAttempts: true, internallyPassed: false, resultAvailable: false, examPaused: false })).toBe('resume');
  });

  it('stops retry after an internal pass even when the pass label is hidden', () => {
    expect(resolvePrimaryAction({ hasActiveAttempt: false, attemptProcessing: false, canStartNewAttempt: true, hasSubmittedAttempt: true, hasRemainingAttempts: true, internallyPassed: true, resultAvailable: true, examPaused: false })).toBe('view-result');
  });
});

describe('result disclosure gate', () => {
  const payload = { score: 86, passed: true, officialAttempt: '第 2 次', questions: ['题干'], answers: ['A'], analysis: ['解析'] };

  it('returns no protected data while locked', () => {
    expect(visibleResult(payload, { summaryMomentReached: true, showScore: true, showPass: true, wholeExamFinished: true, hasRemainingLegalAttempt: false, showAnswer: true, showAnalysis: true, resultLocked: true })).toEqual({});
  });

  it('does not disclose question-level content before the whole exam finishes', () => {
    expect(visibleResult(payload, { summaryMomentReached: true, showScore: true, showPass: false, wholeExamFinished: false, hasRemainingLegalAttempt: false, showAnswer: true, showAnalysis: true, resultLocked: false })).toEqual({ score: 86, officialAttempt: '第 2 次' });
  });

  it('keeps review hidden while another legal attempt remains', () => {
    expect(visibleResult(payload, { summaryMomentReached: true, showScore: true, showPass: true, wholeExamFinished: true, hasRemainingLegalAttempt: true, showAnswer: true, showAnalysis: true, resultLocked: false })).toEqual({ score: 86, officialAttempt: '第 2 次', passed: true });
  });
});

describe('terminal races and protected authorization', () => {
  it('lets the first mock terminal state win', () => {
    expect(resolveMockTerminal('in-progress', 'abandon', false)).toBe('abandoned');
    expect(resolveMockTerminal('abandoned', 'submit', true)).toBe('abandoned');
    expect(resolveMockTerminal('in-progress', 'abandon', true)).toBe('completed');
  });

  it('only lets an authorized admin confirm and protects the last authorization', () => {
    expect(canConfirmOutage('admin', false, 'confirm')).toBe(false);
    expect(canConfirmOutage('authorized-admin', false, 'confirm')).toBe(true);
    expect(canConfirmOutage('authorized-admin', true, 'revoke')).toBe(false);
  });
});
