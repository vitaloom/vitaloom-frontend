import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';
import { dateInHcm, heartRateSummaryPath, isFutureHcmDate, shiftCalendarDate } from '../utils/heart-rate-date';

type HeartRateSummary = {
  date: string;
  timezone: 'Asia/Ho_Chi_Minh';
  asOf: string;
  latestRecorded: null | { heartRateBpm: number; occurredAt: string };
  dailyAverage: { heartRateBpm: number | null; dataStatus: 'CURRENT_DAY_PARTIAL' | 'HISTORY_UNVERIFIED' | 'HISTORY_VERIFIED' };
};

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}
function localTimestamp(instant: string) {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? 'Thời gian không hợp lệ' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function HeartRateScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => dateInHcm(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [summary, setSummary] = useState<HeartRateSummary | null>(null);
  const [completedRequest, setCompletedRequest] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestKey = `${selectedDate}:${retryKey}`;
  const loading = completedRequest !== requestKey && requestError?.key !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : null;

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<HeartRateSummary>(heartRateSummaryPath(selectedDate), { method: 'GET', signal: controller.signal }, true)
      .then((result) => { if (!controller.signal.aborted) { setSummary(result); setCompletedRequest(requestKey); } })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setRequestError({ key: requestKey, message: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu nhịp tim.' });
      });
    return () => controller.abort();
  }, [selectedDate, retryKey, requestKey]);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftCalendarDate(today, weekOffset * 7 + index - 6)), [today, weekOffset]);
  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  const statusCopy = summary?.dailyAverage.dataStatus === 'CURRENT_DAY_PARTIAL'
    ? { title: 'Hôm nay · Tạm tính', detail: 'Số liệu trong ngày có thể tiếp tục thay đổi.' }
    : summary?.dailyAverage.dataStatus === 'HISTORY_VERIFIED'
      ? { title: 'Dữ liệu đã xác minh', detail: 'Đã xác minh dữ liệu cho cả ngày này.' }
      : { title: 'Dữ liệu chưa xác minh đầy đủ', detail: 'Kết quả có thể chưa bao gồm toàn bộ dữ liệu trong ngày.' };

  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.md }}>
      <HealthMetricsSidebar />
      <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
        <ThemedText variant="largeTitle">Nhịp tim</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">Các chỉ số từ những lần ghi nhận đã đồng bộ.</ThemedText>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: theme.heartRateSoft, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="heartRate">♡</ThemedText></View>
          <ThemedText variant="heading" style={{ flex: 1 }}>Nhịp tim ghi nhận gần nhất</ThemedText>
        </View>
        {loading && !summary ? <View style={{ height: 48, width: 150, borderRadius: radius.md, backgroundColor: theme.accentSoft }} accessibilityLabel="Đang tải nhịp tim gần nhất" /> : !summary && error ? <ThemedText variant="body" themeColor="danger">Không tải được dữ liệu nhịp tim.</ThemedText> : summary?.latestRecorded ? <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}><ThemedText variant="metricLarge">{summary.latestRecorded.heartRateBpm}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">bpm</ThemedText></View>
          <ThemedText variant="bodyStrong">Ghi nhận {localTimestamp(summary.latestRecorded.occurredAt)}</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary">Lần đo gần nhất đã được chấp nhận trong lịch sử của bạn.</ThemedText>
        </> : <ThemedText variant="body" themeColor="textSecondary">Chưa có lần đo nhịp tim nào.</ThemedText>}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: theme.heartRateSoft, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="heartRate">♡</ThemedText></View>
          <ThemedText variant="heading" style={{ flex: 1 }}>Trung bình theo ngày</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tuần trước" onPress={() => setWeekOffset((value) => value - 1)} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', gap: spacing.xs }} accessibilityLabel="Chọn ngày xem trung bình nhịp tim">
          {dates.map((date) => {
            const selected = selectedDate === date;
            const future = isFutureHcmDate(date, today);
            return <Pressable key={date} accessibilityRole="button" accessibilityLabel={dateLabel(date)} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setSelectedDate(date)} style={{ minWidth: 70, minHeight: sizing.controlComfortable, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: selected ? theme.accent : theme.background }}>
              <ThemedText variant="caption" themeColor={selected ? 'onAccent' : 'textSecondary'}>{dateLabel(date)}</ThemedText>
            </Pressable>;
          })}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityLabel="Tuần sau" accessibilityState={{ disabled: weekOffset >= 0 }} disabled={weekOffset >= 0} onPress={() => setWeekOffset((value) => Math.min(0, value + 1))} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', opacity: weekOffset >= 0 ? 0.35 : 1 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
        </View>
        {loading ? <View style={{ height: 48, width: 150, borderRadius: radius.md, backgroundColor: theme.accentSoft }} accessibilityLabel="Đang tải trung bình theo ngày" /> : error ? <ThemedText variant="body" themeColor="danger">Không tải được dữ liệu cho ngày đã chọn.</ThemedText> : <>
          {summary?.dailyAverage.heartRateBpm == null ? <ThemedText variant="body" themeColor="textSecondary">Chưa có dữ liệu cho ngày {dateLabel(selectedDate)}.</ThemedText> : <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}><ThemedText variant="metricLarge">{Number.isInteger(summary.dailyAverage.heartRateBpm) ? summary.dailyAverage.heartRateBpm : summary.dailyAverage.heartRateBpm.toFixed(1)}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">bpm</ThemedText></View>}
          {summary ? <View style={{ gap: spacing.xs }}><ThemedText variant="bodyStrong" themeColor={summary.dailyAverage.dataStatus === 'HISTORY_UNVERIFIED' ? 'warning' : 'accent'}>{statusCopy.title}</ThemedText><ThemedText variant="subhead" themeColor="textSecondary">{statusCopy.detail}</ThemedText></View> : null}
        </>}
      </View>
      {error ? <View style={{ alignItems: 'flex-start', gap: spacing.xs }}><ThemedText variant="subhead" themeColor="danger">{error}</ThemedText><Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.sm }}><ThemedText variant="bodyStrong" themeColor="accent">Thử lại</ThemedText></Pressable></View> : null}
    </View>
  </ScrollView>;
}
