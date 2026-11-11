import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { CreateWaterLogInput, DailyWaterSummary, LocalDate, WaterLog, WeeklyWaterSummary } from '../types/water';
import { waterRepository } from '../services/water.repository';

type SummaryState<T> = { summary: T | null; loading: boolean; error: boolean | null };
type LoadedSummary<T> = { date?: LocalDate; key: string; summary: T | null; error: boolean | null };

function useRepositoryRevision(): number {
  return useSyncExternalStore(waterRepository.subscribe, waterRepository.getRevision, waterRepository.getRevision);
}

export function useWaterDaily(date: LocalDate): SummaryState<DailyWaterSummary> {
  const revision = useRepositoryRevision();
  const key = `${date}:${revision}`;
  const [state, setState] = useState<LoadedSummary<DailyWaterSummary> | null>(null);

  useEffect(() => {
    let active = true;
    void waterRepository.getDailySummary(date).then(
      (summary) => { if (active) setState({ date, key, summary, error: null }); },
      () => { if (active) setState((previous) => ({ date, key, summary: previous?.date === date ? previous.summary : null, error: true })); },
    );
    return () => { active = false; };
  }, [date, key]);

  if (state?.key === key) return { summary: state.summary, loading: false, error: state.error };
  if (state?.date === date && state.summary) return { summary: state.summary, loading: true, error: null };
  return { summary: null, loading: true, error: null };
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
