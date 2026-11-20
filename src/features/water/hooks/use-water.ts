import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { CreateWaterLogInput, DailyWaterSummary, LocalDate, WaterLog, WeeklyWaterSummary } from '../types/water';
import { waterRepository } from '../services/water.repository';

type SummaryState<T> = { summary: T | null; loading: boolean; error: boolean | null };
type ReloadableSummaryState<T> = SummaryState<T> & { reload: () => void };
type LoadedSummary<T> = { scope?: string; key: string; summary: T | null; error: boolean | null };

function useRepositoryRevision(): number {
  return useSyncExternalStore(waterRepository.subscribe, waterRepository.getRevision, waterRepository.getRevision);
}

export function useWaterDaily(date: LocalDate, enabled = true, scopeKey = ''): ReloadableSummaryState<DailyWaterSummary> {
  const revision = useRepositoryRevision();
  const [reloadVersion, setReloadVersion] = useState(0);
  const scope = JSON.stringify([scopeKey, date]);
  const key = JSON.stringify([scope, revision, reloadVersion]);
  const [state, setState] = useState<LoadedSummary<DailyWaterSummary> | null>(null);
  const reload = useCallback(() => setReloadVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void waterRepository.getDailySummary(date).then(
      (summary) => { if (active) setState({ scope, key, summary, error: null }); },
      () => { if (active) setState((previous) => ({ scope, key, summary: previous?.scope === scope ? previous.summary : null, error: true })); },
    );
    return () => { active = false; };
  }, [date, enabled, key, scope]);

  if (!enabled) return { summary: null, loading: false, error: null, reload };

  if (state?.key === key) return { summary: state.summary, loading: false, error: state.error, reload };
  if (state?.scope === scope && state.summary) return { summary: state.summary, loading: true, error: null, reload };
  return { summary: null, loading: true, error: null, reload };
}

export function useWaterWeekly(weekStart: LocalDate, enabled = true, scopeKey = ''): SummaryState<WeeklyWaterSummary> {
  const revision = useRepositoryRevision();
  const key = JSON.stringify([scopeKey, weekStart, revision]);
  const [state, setState] = useState<LoadedSummary<WeeklyWaterSummary> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void waterRepository.getWeeklySummary(weekStart).then(
      (summary) => { if (active) setState({ key, summary, error: null }); },
      () => { if (active) setState({ key, summary: null, error: true }); },
    );
    return () => { active = false; };
  }, [weekStart, key, enabled]);

  if (!enabled) return { summary: null, loading: false, error: null };

  return state?.key === key
    ? { ...state, loading: false }
    : { summary: null, loading: true, error: null };
}

let submitting = false;
const submissionListeners = new Set<() => void>();

function subscribeToSubmission(listener: () => void) {
  submissionListeners.add(listener);
  return () => { submissionListeners.delete(listener); };
}

function getSubmitting() {
  return submitting;
}

function setSubmitting(value: boolean) {
  submitting = value;
  submissionListeners.forEach((listener) => listener());
}

async function createLog(input: CreateWaterLogInput): Promise<WaterLog | null> {
  if (submitting) return null;
  setSubmitting(true);
  try {
    return await waterRepository.createLog(input);
  } finally {
    setSubmitting(false);
  }
}

export function useCreateWaterLog() {
  const pending = useSyncExternalStore(subscribeToSubmission, getSubmitting, getSubmitting);
  return { createLog, submitting: pending };
}
