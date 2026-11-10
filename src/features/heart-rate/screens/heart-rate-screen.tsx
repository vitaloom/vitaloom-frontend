import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { HeartRateFooter } from '@/components/ui/main-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';
import { heartRateApi, type HeartRateSummary } from '../api/heart-rate-api';
import { dateInHcm, isFutureHcmDate, weekDates, weekRangeLabel } from '../utils/heart-rate-date';

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'short', day: '2-digit' }).format(new Date(`${date}T12:00:00Z`));
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
    heartRateApi.summary(selectedDate, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setSummary(result); setCompletedRequest(requestKey); } })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setRequestError({ key: requestKey, message: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu nhịp tim.' });
      });
    return () => controller.abort();
  }, [selectedDate, retryKey, requestKey]);

  const dates = useMemo(() => weekDates(today, weekOffset), [today, weekOffset]);
  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  const statusCopy = summary?.dailyAverage.dataStatus === 'CURRENT_DAY_PARTIAL'
    ? { title: 'Hôm nay · Tạm tính', detail: 'Số liệu trong ngày có thể tiếp tục thay đổi.' }
    : summary?.dailyAverage.dataStatus === 'HISTORY_VERIFIED'
      ? { title: 'Dữ liệu đã xác minh', detail: 'Đã xác minh dữ liệu cho cả ngày này.' }
      : { title: 'Dữ liệu chưa xác minh đầy đủ', detail: 'Kết quả có thể chưa bao gồm toàn bộ dữ liệu trong ngày.' };

  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.md }}>
        <HealthMetricsSidebar brandedHeader />
        <View style={{ alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
          <ThemedText variant="largeTitle">Nhịp tim</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>Các chỉ số từ những lần ghi nhận đã đồng bộ.</ThemedText>
        </View>

        <View style={{ minHeight: 204, padding: spacing.lg, gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="heading" style={{ textAlign: 'center' }}>Nhịp tim ghi nhận gần nhất</ThemedText>
          {loading && !summary ? <View style={{ height: 48, width: 150, borderRadius: radius.md, backgroundColor: theme.accentSoft }} accessibilityLabel="Đang tải nhịp tim gần nhất" /> : !summary && error ? <ThemedText variant="body" themeColor="danger">Không tải được dữ liệu nhịp tim.</ThemedText> : summary?.latestRecorded ? <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="metricLarge">{summary.latestRecorded.heartRateBpm}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">bpm</ThemedText></View>
            <ThemedText variant="bodyStrong">Đo lúc {localTimestamp(summary.latestRecorded.occurredAt)}</ThemedText>
            <ThemedText variant="subhead" themeColor="textSecondary" style={{ textAlign: 'center' }}>Lần đo gần nhất đã được chấp nhận trong lịch sử của bạn.</ThemedText>
          </> : <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>Chưa có phép đo nhịp tim.</ThemedText>}
        </View>

        <View style={{ minHeight: 350, padding: spacing.md, gap: spacing.md, alignItems: 'center', borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
            <ThemedText variant="heading">▦</ThemedText><ThemedText variant="heading">Trung bình theo ngày</ThemedText>
          </View>
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tuần trước" onPress={() => setWeekOffset((value) => value - 1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 2 }} accessibilityLabel="Chọn ngày xem trung bình nhịp tim">
              {dates.map((date) => {
                const selected = selectedDate === date;
                const future = isFutureHcmDate(date, today);
                return <Pressable key={date} accessibilityRole="button" accessibilityLabel={dateLabel(date)} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setSelectedDate(date)} style={{ flex: 1, minWidth: 0, minHeight: sizing.controlComfortable, paddingHorizontal: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: selected ? theme.accent : future ? theme.backgroundSelected : theme.background, opacity: future ? 0.48 : 1 }}>
                  <ThemedText variant="caption" themeColor={selected ? 'onAccent' : 'textSecondary'}>{dateLabel(date)}</ThemedText>
                </Pressable>;
              })}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Tuần sau" accessibilityState={{ disabled: weekOffset >= 0 }} disabled={weekOffset >= 0} onPress={() => setWeekOffset((value) => Math.min(0, value + 1))} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', opacity: weekOffset >= 0 ? 0.35 : 1 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
          </View>
          <ThemedText variant="caption" themeColor="textSecondary">{weekRangeLabel(dates)}</ThemedText>
          {summary && !loading && !error ? <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: summary.dailyAverage.dataStatus === 'HISTORY_UNVERIFIED' ? theme.backgroundSelected : theme.accentSoft }}><ThemedText variant="caption" themeColor={summary.dailyAverage.dataStatus === 'HISTORY_UNVERIFIED' ? 'warning' : 'accent'}>{statusCopy.title}</ThemedText></View> : <View style={{ height: 30 }} />}
          <View style={{ minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
            {loading ? <View style={{ height: 48, width: 150, borderRadius: radius.md, backgroundColor: theme.accentSoft }} accessibilityLabel="Đang tải trung bình theo ngày" /> : error ? <ThemedText variant="body" themeColor="danger" style={{ textAlign: 'center' }}>Không tải được dữ liệu cho ngày đã chọn.</ThemedText> : summary?.dailyAverage.heartRateBpm == null ? <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>Chưa có dữ liệu cho ngày này.</ThemedText> : <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="metricLarge">{Number.isInteger(summary.dailyAverage.heartRateBpm) ? summary.dailyAverage.heartRateBpm : summary.dailyAverage.heartRateBpm.toFixed(1)}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">bpm</ThemedText></View>}
          </View>
          {summary && !loading && !error ? <ThemedText variant="subhead" themeColor="textSecondary" style={{ textAlign: 'center' }}>{statusCopy.detail}</ThemedText> : <View style={{ minHeight: 40 }} />}
        </View>
        {error ? <View style={{ alignItems: 'center', gap: spacing.xs }}><ThemedText variant="subhead" themeColor="danger" style={{ textAlign: 'center' }}>{error}</ThemedText><Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.sm }}><ThemedText variant="bodyStrong" themeColor="accent">Thử lại</ThemedText></Pressable></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm }}>
          <ThemedText variant="heading" themeColor="accent">✓</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary" style={{ flex: 1, textAlign: 'center' }}>Dữ liệu được ghi nhận tự động từ các phép đo hợp lệ đã đồng bộ.</ThemedText>
        </View>
        <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center', paddingHorizontal: spacing.sm }}>Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc khuyến nghị y khoa.</ThemedText>
      </View>
    </ScrollView>
    <HeartRateFooter />
  </View>;
}
