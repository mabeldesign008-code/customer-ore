import { codEscalationLadder } from './env';

/**
 * The COD escalation ladder: warning → suspension → investigation → termination.
 *
 * `codEscalationStep` tests `> terminateH` before `>= investigateH`, so when both thresholds
 * read 72 the INVESTIGATION stage lasted an instant — at 72.0 h a rider was under investigation
 * and one tick later they were terminated. That was the code default. Production only escaped it
 * because `.env` happened to set 73, making the whole investigation window one hour for a
 * process the policy describes as offline and manual; any deployment that forgot the variable
 * terminated riders with no investigation at all.
 */
describe('codEscalationLadder', () => {
  it('leaves a real investigation window by default', () => {
    const ladder = codEscalationLadder({});
    expect(ladder.codEscalateInvestigateH).toBe(72);
    expect(ladder.codEscalateTerminateH).toBeGreaterThan(ladder.codEscalateInvestigateH);
    expect(ladder.codEscalateTerminateH - ladder.codEscalateInvestigateH).toBe(24);
  });

  it('derives the termination default from the investigation threshold, so the two cannot drift', () => {
    // Restating 72 in two places is how they came to disagree in the first place.
    const ladder = codEscalationLadder({ COD_ESCALATE_INVESTIGATE_H: '100' } as NodeJS.ProcessEnv);
    expect(ladder.codEscalateTerminateH).toBe(124);
  });

  it('honours explicit configuration', () => {
    const ladder = codEscalationLadder({
      COD_ESCALATE_WARNING_H: '12',
      COD_ESCALATE_SUSPEND_H: '24',
      COD_ESCALATE_INVESTIGATE_H: '36',
      COD_ESCALATE_TERMINATE_H: '48',
    } as NodeJS.ProcessEnv);

    expect(ladder).toEqual({
      codEscalateWarningH: 12,
      codEscalateSuspendH: 24,
      codEscalateInvestigateH: 36,
      codEscalateTerminateH: 48,
    });
  });

  describe('refuses a ladder that skips a stage', () => {
    it('rejects termination equal to investigation — the original bug', () => {
      expect(() =>
        codEscalationLadder({ COD_ESCALATE_INVESTIGATE_H: '72', COD_ESCALATE_TERMINATE_H: '72' } as NodeJS.ProcessEnv),
      ).toThrow(/must strictly increase/);
    });

    it('rejects termination before investigation', () => {
      expect(() =>
        codEscalationLadder({ COD_ESCALATE_INVESTIGATE_H: '72', COD_ESCALATE_TERMINATE_H: '48' } as NodeJS.ProcessEnv),
      ).toThrow(/COD_ESCALATE_TERMINATE_H=48 must be greater than COD_ESCALATE_INVESTIGATE_H=72/);
    });

    it('rejects a collapsed suspension stage', () => {
      expect(() =>
        codEscalationLadder({ COD_ESCALATE_WARNING_H: '48', COD_ESCALATE_SUSPEND_H: '48' } as NodeJS.ProcessEnv),
      ).toThrow(/must strictly increase/);
    });

    it('names the two variables in conflict', () => {
      // The error has to be actionable at 3am: which variable, what value, and why it matters.
      expect(() =>
        codEscalationLadder({ COD_ESCALATE_SUSPEND_H: '10' } as NodeJS.ProcessEnv),
      ).toThrow(/COD_ESCALATE_SUSPEND_H=10 must be greater than COD_ESCALATE_WARNING_H=24/);
    });

    it('explains the consequence, not just the rule', () => {
      expect(() =>
        codEscalationLadder({ COD_ESCALATE_INVESTIGATE_H: '72', COD_ESCALATE_TERMINATE_H: '72' } as NodeJS.ProcessEnv),
      ).toThrow(/terminated without ever being investigated/);
    });
  });
});
