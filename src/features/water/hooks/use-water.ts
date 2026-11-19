import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { CreateWaterLogInput, DailyWaterSummary, LocalDate, WaterLog, WeeklyWaterSummary } from '../types/water';
import { waterRepository } from '../services/water.repository';

type SummaryState<T> = { summary: T | null; loading: boolean; error: boolean | null };
type ReloadableSummaryState<T> = SummaryState<T> & { reload: () => void };
type LoadedSummary<T> = { date?: LocalDate; key: string; summary: T | null; error: boolean | null };

function useRepositoryRevision(): number {
  return useSyncExternalStore(waterRepository.subscribe, waterRepository.getRevision, waterRepository.getRevision);
}

export function useWaterDaily(date: LocalDate, enabled = true, scopeKey = ''): ReloadableSummaryState<DailyWaterSummary> {
  const revision = useRepositoryRevision();
  const [reloadVersion, setReloadVersion] = useState(0);
  const key = `${date}:${revision}:${scopeKey}:${reloadVersion}`;
  const compatibleKeyPrefix = `${date}:${revision}:${scopeKey}:`;
  const [state, setState] = useState<LoadedSummary<DailyWaterSummary> | null>(null);
  const reload = useCallback(() => setReloadVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void waterRepository.getDailySummary(date).then(
      (summary) => { if (active) setState({ date, key, summary, error: null }); },
      () => { if (active) setState((previous) => ({ date, key, summary: previous?.key.startsWith(compatibleKeyPrefix) ? previous.summary : null, error: true })); },
    );
    return () => { active = false; };
  }, [date, enabled, key, compatibleKeyPrefix]);

  if (!enabled) return { summary: null, loading: false, error: null, reload };

  if (state?.key === key) return { summary: state.summary, loading: false, error: state.error, reload };
  if (state?.key.startsWith(compatibleKeyPrefix) && state.summary) return { summary: state.summary, loading: true, error: null, reload };
  return { summary: null, loading: true, error: null, reload };
}

export function useWaterWeekly(weekStart: LocalDate): SummaryState<WeeklyWaterSummary> {
  const revision = useRepositoryRevision();
  const key = `${weekStart}:${revision}`;
  const [state, setState] = useState<LoadedSummary<WeeklyWaterSummary> | null>(null);

  useEffect(() => {
    let active = true;
    void waterRepository.getWeeklySummary(weekStart).then(
      (summary) => { if (active) setState({ key, summary, error: null }); },
      () => { if (active) setState({ key, summary: null, error: true }); },
    );
    return () => { active = false; };
  }, [weekStart, key]);

  return state?.key === key
    ? { ...state, loading: false }
    : { summary: null, loading: true, error: null };
}

export function useCreateWaterLog(): { createLog(input: CreateWaterLogInput): Promise<WaterLog>; submitting: boolean } {
  const submitGuard = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const createLog = useCallback(async (input: CreateWaterLogInput): Promise<WaterLog> => {
    if (submitGuard.current) throw new Error('Đang ghi nhận lượng nước. Vui lòng đợi.');
    submitGuard.current = true;
    setSubmitting(true);
    try {
      return await waterRepository.createLog(input);
    } finally {
      submitGuard.current = false;
      setSubmitting(false);
    }
  }, []);

  return { createLog, submitting };
}
