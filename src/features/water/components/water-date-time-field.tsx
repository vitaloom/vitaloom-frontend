import { useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useI18n, useTranslations } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import type { Theme } from '../types/water';
import { localDateFromInstant } from '../utils/water-date';
import { waterMessages } from '../messages';

function isFutureSelected(date: Date): boolean { return date.getTime() > Date.now(); }

export function WaterDateTimeField({ initial, onChange, theme }: { initial: Date; onChange: (date: Date | null) => void; theme: Theme }) {
  const { locale } = useI18n();
  const t = useTranslations(waterMessages);
  const [chosenDay, setChosenDay] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()));
  const [hour, setHour] = useState(() => String(initial.getHours()).padStart(2, '0'));
  const [minute, setMinute] = useState(() => String(initial.getMinutes()).padStart(2, '0'));
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const today = localDateFromInstant(now);
  const calendarDays = useMemo(() => {
    const firstOffset = (month.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: firstOffset }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);

  function publish(day: Date, h: string, m: string) {
    const hValue = Number(h);
    const mValue = Number(m);
    if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m) || hValue > 23 || mValue > 59) {
      setFieldError(t('timeFormatError'));
      onChange(null);
      return;
    }
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hValue, mValue);
    if (isFutureSelected(date)) {
      setFieldError(t('futureSelection'));
      onChange(null);
      return;
    }
    setFieldError(null);
    onChange(date);
  }

  function chooseDay(dayNumber: number) {
    const day = new Date(month.getFullYear(), month.getMonth(), dayNumber);
    setChosenDay(day);
    setOpen(false);
    publish(day, hour, minute);
  }

  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const nextDisabled = nextMonth.getTime() > now.getTime();

  return <View style={{ gap: spacing.sm }}>
    <ThemedText variant="labelStrong">{t('recordedAt')}</ThemedText>
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
      <Pressable onPress={() => { setNow(new Date()); setOpen(true); }} accessibilityRole="button" accessibilityLabel={t('chooseDate')} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, minWidth: 150, paddingHorizontal: spacing.md, justifyContent: 'center', backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, opacity: pressed ? 0.7 : 1 })}><ThemedText variant="body">{chosenDay.toLocaleDateString(locale)} ▾</ThemedText></Pressable>
      <TextInput accessibilityLabel={t('recordedHour')} keyboardType="number-pad" maxLength={2} value={hour} onChangeText={(value) => { setHour(value); publish(chosenDay, value, minute); }} selectTextOnFocus style={{ minHeight: sizing.controlComfortable, width: 54, textAlign: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
      <ThemedText variant="heading" style={{ alignSelf: 'center' }}>:</ThemedText>
      <TextInput accessibilityLabel={t('recordedMinute')} keyboardType="number-pad" maxLength={2} value={minute} onChangeText={(value) => { setMinute(value); publish(chosenDay, hour, value); }} selectTextOnFocus style={{ minHeight: sizing.controlComfortable, width: 54, textAlign: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
    </View>
    <ThemedText variant="caption" themeColor={fieldError ? 'danger' : 'textSecondary'}>{fieldError ?? t('dateHint')}</ThemedText>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', padding: spacing.md }}>
        <View style={{ borderRadius: radius.xl, padding: spacing.md, backgroundColor: theme.backgroundElement, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityRole="button" accessibilityLabel={t('previousMonth')} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
            <ThemedText variant="bodyStrong">{month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</ThemedText>
            <Pressable onPress={() => setMonth(nextMonth)} disabled={nextDisabled} accessibilityRole="button" accessibilityLabel={t('nextMonth')} accessibilityState={{ disabled: nextDisabled }} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-end', justifyContent: 'center', opacity: nextDisabled ? 0.3 : 1 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>{t('dayNames').split(',').map((day) => <ThemedText key={day} variant="caption" themeColor="textSecondary" style={{ flex: 1, textAlign: 'center' }}>{day}</ThemedText>)}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={{ width: '14.285%', height: sizing.controlMin }} />;
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const disabled = localDateFromInstant(date) > today;
            const selected = localDateFromInstant(date) === localDateFromInstant(chosenDay);
            return <Pressable key={day} onPress={() => chooseDay(day)} disabled={disabled} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} accessibilityState={{ disabled, selected }} style={({ pressed }) => ({ width: '14.285%', minHeight: sizing.controlMin, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? theme.accent : 'transparent', opacity: disabled ? 0.25 : pressed ? 0.6 : 1 })}><ThemedText variant="labelStrong" themeColor={selected ? 'onAccent' : 'text'}>{new Intl.NumberFormat(locale).format(day)}</ThemedText></Pressable>;
          })}</View>
          <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={t('closeDatePicker')} style={{ minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="accent">{t('close')}</ThemedText></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
