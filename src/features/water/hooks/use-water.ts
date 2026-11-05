import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { CreateWaterLogInput, DailyWaterSummary, LocalDate, WaterLog, WeeklyWaterSummary } from '../types/water';
import { waterRepository } from '../services/water.repository';

type SummaryState<T> = { summary: T | null; loading: boolean; error: string | null };
type LoadedSummary<T> = { key: string; summary: T | null; error: string | null };

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
      (summary) => { if (active) setState({ key, summary, error: null }); },
      (error: unknown) => { if (active) setState({ key, summary: null, error: error instanceof Error ? error.message : 'Không thể tải dữ liệu nước.' }); },
    );
    return () => { active = false; };
  }, [date, key]);

  return state?.key === key
    ? { ...state, loading: false }
    : { summary: null, loading: true, error: null };
}

export function useWaterWeekly(weekStart: LocalDate): SummaryState<WeeklyWaterSummary> {
  const revision = useRepositoryRevision();
  const key = `${weekStart}:${revision}`;
  const [state, setState] = useState<LoadedSummary<WeeklyWaterSummary> | null>(null);

  useEffect(() => {
    let active = true;
    void waterRepository.getWeeklySummary(weekStart).then(
      (summary) => { if (active) setState({ key, summary, error: null }); },
      (error: unknown) => { if (active) setState({ key, summary: null, error: error instanceof Error ? error.message : 'Không thể tải tiến độ tuần.' }); },
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
