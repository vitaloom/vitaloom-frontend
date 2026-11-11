import { useEffect, useRef, useState } from 'react';

import type { ProfileLoadResult, ProfileOperationResult, ProfileRepository } from '../api/profile-repository';
import { basicFields, type ProfileField, type ProfileFieldErrors, type ProfileSnapshot } from '../types/profile';
import { buildPatch, createFields, draftFromSnapshot, validateCreateFields } from '../utils/profile-form';

type EditorOptions = {
  repository: ProfileRepository;
  onSaved: (snapshot: ProfileSnapshot) => void;
  onClose: () => void;
} & (
  | { mode: 'setup'; onSkip: () => void; onAlreadyCreated: () => void }
  | { mode: 'edit'; initial: ProfileSnapshot }
);

type Recovery =
  | { kind: 'conflict'; latest: ProfileLoadResult }
  | { kind: 'unconfirmed'; attemptId: string; visible: boolean; check?: 'unresolved' | 'network-error' | 'unauthorized' };

type Notice =
  | { kind: 'no-changes' | 'network-error' | 'unauthorized' | 'validation-error' }
  | { kind: 'partial-success'; applied: ProfileField[] };

function nextAttemptId() {
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useProfileEditor(options: EditorOptions) {
  const { repository } = options;
  const [base, setBase] = useState(options.mode === 'edit' ? options.initial : undefined);
  const [draft, setDraft] = useState(() => draftFromSnapshot(base));
  const [touched, setTouched] = useState<ReadonlySet<ProfileField>>(() => new Set());
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [notice, setNotice] = useState<Notice>();
  const [recovery, setRecovery] = useState<Recovery>();
  const [busy, setBusy] = useState(false);
  const [setupValidation, setSetupValidation] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function change(field: ProfileField, value: string) {
    if (inFlight.current || recovery || notice?.kind === 'unauthorized') return;
    setDraft((current) => ({ ...current, [field]: value }));
    setTouched((current) => new Set(current).add(field));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (notice?.kind !== 'partial-success') setNotice(undefined);
  }

  function showValidation(fieldErrors: ProfileFieldErrors) {
    setErrors(fieldErrors);
    setNotice({ kind: 'validation-error' });
    if (options.mode === 'setup') {
      setSetupValidation(true);
      setStep(basicFields.some((field) => fieldErrors[field]) ? 1 : 2);
    }
  }

  async function read(attemptId?: string): Promise<ProfileLoadResult> {
    return repository.getMyProfile(attemptId).catch(() => ({ kind: 'network-error' }));
  }

  async function showConflict(latest?: ProfileLoadResult) {
    if (options.mode === 'setup') {
      options.onAlreadyCreated();
      return;
    }
    const current = latest ?? await read();
    if (mounted.current) setRecovery({ kind: 'conflict', latest: current });
  }

  async function receive(result: ProfileOperationResult) {
    switch (result.kind) {
      case 'success':
        options.onSaved(result.snapshot);
        break;
      case 'partial-success': {
        const savedDraft = draftFromSnapshot(result.snapshot);
        setBase(result.snapshot);
        setDraft((current) => ({
          ...savedDraft,
          ...Object.fromEntries(Object.keys(result.errors).map((field) => [field, current[field as ProfileField]])),
        }));
        setTouched(new Set(Object.keys(result.errors) as ProfileField[]));
        setErrors(result.errors);
        setNotice({ kind: 'partial-success', applied: result.applied });
        break;
      }
      case 'validation-error':
        showValidation(result.errors);
        break;
      case 'conflict':
        await showConflict();
        break;
      case 'unconfirmed':
        setRecovery({ kind: 'unconfirmed', attemptId: result.attemptId, visible: true });
        break;
      case 'skipped':
        if (options.mode === 'setup') options.onSkip();
        break;
      case 'not-applied':
        setNotice({ kind: 'network-error' });
        break;
      case 'network-error':
      case 'unauthorized':
      case 'no-changes':
        setNotice({ kind: result.kind });
        break;
    }
  }

  async function run(operation: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await operation();
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function save() {
    if (inFlight.current || recovery || notice?.kind === 'unauthorized') return;
    if (options.mode === 'setup') {
      const fields = createFields(draft);
      if (!Object.keys(fields).length) { options.onSkip(); return; }
      const validation = validateCreateFields(fields);
      if (Object.keys(validation).length) { showValidation(validation); return; }
      const attemptId = nextAttemptId();
      void run(async () => {
        const result = await repository.createMyProfile({ fields, attemptId })
          .catch(() => ({ kind: 'unconfirmed', attemptId }) as const);
        if (mounted.current) await receive(result);
      });
    } else if (base) {
      const patch = buildPatch(draft, base, touched);
      if (!Object.keys(patch).length) { setNotice({ kind: 'no-changes' }); return; }
      const attemptId = nextAttemptId();
      void run(async () => {
        const result = await repository.updateMyProfile({ patch, expectedRevision: base.revision, attemptId })
          .catch(() => ({ kind: 'unconfirmed', attemptId }) as const);
        if (mounted.current) await receive(result);
      });
    }
  }

  function verify() {
    if (!recovery) return;
    void run(async () => {
      if (recovery.kind === 'conflict') {
        await showConflict();
        return;
      }
      const latest = await read(recovery.attemptId);
      if (!mounted.current) return;
      if (latest.kind !== 'verified') {
        setRecovery({ ...recovery, visible: true, check: latest.kind });
        return;
      }
      const { attempt, snapshot } = latest;
      if (!attempt) {
        setRecovery({ ...recovery, visible: true, check: 'unresolved' });
        return;
      }
      if (attempt.kind === 'conflict') {
        await showConflict(latest);
        return;
      }
      if (attempt.kind === 'success' || attempt.kind === 'partial-success') {
        if (attempt.snapshot.revision !== snapshot.revision) {
          await showConflict(latest);
          return;
        }
      } else if (options.mode === 'edit' && base?.revision !== snapshot.revision) {
        await showConflict(latest);
        return;
      } else if (options.mode === 'setup' && snapshot.profile) {
        options.onAlreadyCreated();
        return;
      }
      setRecovery(undefined);
      if (attempt.kind === 'not-applied') {
        setNotice({ kind: 'network-error' });
      } else {
        await receive(attempt);
      }
    });
  }

  function retryAccess() {
    if (notice?.kind !== 'unauthorized') return;
    void run(async () => {
      const latest = await read();
      if (!mounted.current) return;
      if (latest.kind !== 'verified') return;
      if (options.mode === 'edit' && latest.snapshot.revision !== base?.revision) {
        await showConflict(latest);
      } else {
        setNotice(undefined);
      }
    });
  }

  function continueFromLatest() {
    if (inFlight.current || recovery?.kind !== 'conflict' || recovery.latest.kind !== 'verified') return;
    const latest = recovery.latest.snapshot;
    setBase(latest);
    setDraft(draftFromSnapshot(latest));
    setErrors({});
    setTouched(new Set());
    setNotice(undefined);
    setRecovery(undefined);
  }

  function back() {
    if (inFlight.current) return;
    if (options.mode === 'setup' && step === 2 && !recovery) setStep(1);
    else options.onClose();
  }

  return {
    draft, errors, step, notice, recovery, busy, setupValidation, change, save, verify, back, continueFromLatest, retryAccess,
    advance: () => { if (!inFlight.current && !recovery) setStep(2); },
    keepDraft: () => {
      if (!inFlight.current && recovery?.kind === 'unconfirmed') setRecovery({ ...recovery, visible: false });
    },
    showVerification: () => {
      if (recovery?.kind === 'unconfirmed') setRecovery({ ...recovery, visible: true });
    },
  };
}

export type ProfileEditor = ReturnType<typeof useProfileEditor>;
