import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, shadows, sizing, spacing } from '@/theme';
import type { StepsGoal } from '../api/steps-api';
import { stepsMessages } from '../messages';

function displayDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'medium' }).format(new Date(`${date}T12:00:00Z`));
}

export function StepsDailyGoal({ goal, totalSteps, progressPercent, date, today, busy, error, onSave, onRemove }: {
  goal: StepsGoal | null;
  totalSteps: number | null;
  progressPercent: number | null;
  date: string;
  today: string;
  busy: boolean;
  error: string | null;
  onSave: (targetSteps: number) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(stepsMessages);
  const editable = date === today;
  const [editing, setEditing] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState(false);
  const hasProgress = editable && goal !== null && totalSteps !== null && progressPercent !== null;
  const safeProgress = progressPercent ?? 0;
  const progressLabel = progressPercent === null ? '' : progressPercent.toLocaleString(locale, { maximumFractionDigits: 1 });

  const beginEdit = () => {
    setInput(goal ? String(goal.targetSteps) : '');
    setValidationError(false);
    setConfirmingRemoval(false);
    setEditing(true);
  };
  const save = async () => {
    const value = input.trim();
    if (!/^\d+$/.test(value)) { setValidationError(true); return; }
    const target = Number(value);
    if (!Number.isSafeInteger(target) || target <= 0) { setValidationError(true); return; }
    if (await onSave(target)) { setEditing(false); setInput(''); }
  };

  return <View style={{ padding: spacing.md, gap: spacing.sm, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
    <ThemedText variant="heading">{editable ? t('dailyGoalTitle') : t('goalForDate')}</ThemedText>
    {goal ? <>
      <ThemedText variant="metric">{t('goalTarget', { count: goal.targetSteps.toLocaleString(locale) })}</ThemedText>
      {!editable ? <ThemedText variant="caption" themeColor="textSecondary">{t('effectiveSince', { date: displayDate(goal.effectiveDate, locale) })}</ThemedText> : null}
    </> : <ThemedText variant="body" themeColor="textSecondary">{editable ? t('noGoalSet') : t('noGoalForDate')}</ThemedText>}
    {editable && goal && totalSteps === null ? <ThemedText variant="caption" themeColor="textSecondary">{t('noStepsToday')}</ThemedText> : null}
    {hasProgress ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View accessibilityElementsHidden style={{ flex: 1, height: 12, overflow: 'hidden', borderRadius: radius.full, backgroundColor: theme.accentSoft }}>
        <View style={{ width: `${Math.max(0, Math.min(100, safeProgress))}%`, height: '100%', borderRadius: radius.full, backgroundColor: theme.steps }} />
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={t('dailyGoalTitle')} accessibilityValue={{ min: 0, max: 100, now: Math.max(0, Math.min(100, safeProgress)), text: `${progressLabel}%` }}>
        <ThemedText variant="labelStrong" themeColor="steps">{t('goalProgress', { percent: progressLabel })}</ThemedText>
      </View>
    </View> : null}
    {!editable ? null : editing ? <View style={{ gap: spacing.xs }}>
      <ThemedText variant="labelStrong">{t('goalTargetLabel')}</ThemedText>
      <TextInput accessibilityLabel={t('goalTargetLabel')} value={input} onChangeText={(value) => { setInput(value); setValidationError(false); }} placeholder={t('goalTargetPlaceholder')} placeholderTextColor={theme.textSecondary} keyboardType="number-pad" maxLength={16} editable={!busy} style={{ minHeight: sizing.controlComfortable, borderWidth: 1, borderColor: validationError ? theme.danger : theme.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: theme.text, backgroundColor: theme.background }} />
      {validationError ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t('invalidGoal')}</ThemedText> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={{ minHeight: sizing.controlComfortable, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: theme.steps, opacity: busy ? 0.6 : 1 }}><ThemedText variant="labelStrong" themeColor="onSteps">{busy ? t('savingGoal') : t('saveGoal')}</ThemedText></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setEditing(false); setValidationError(false); }} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: theme.backgroundSelected }}><ThemedText variant="labelStrong">{t('cancel')}</ThemedText></Pressable>
      </View>
    </View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={beginEdit} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: theme.steps, opacity: busy ? 0.6 : 1 }}><ThemedText variant="labelStrong" themeColor="onSteps">{goal ? t('editGoal') : t('setGoal')}</ThemedText></Pressable>
      {goal ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmingRemoval(true)} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: theme.backgroundSelected }}><ThemedText variant="labelStrong" themeColor="danger">{t('removeGoal')}</ThemedText></Pressable> : null}
    </View>}
    {confirmingRemoval && editable && goal ? <View style={{ padding: spacing.sm, gap: spacing.xs, borderRadius: radius.md, backgroundColor: theme.backgroundSelected }}>
      <ThemedText variant="labelStrong">{t('confirmRemoveGoal')}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('confirmRemoveGoalMessage')}</ThemedText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={async () => { if (await onRemove()) setConfirmingRemoval(false); }} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: theme.danger, opacity: busy ? 0.6 : 1 }}><ThemedText variant="labelStrong" themeColor="textInverse">{busy ? t('savingGoal') : t('confirm')}</ThemedText></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmingRemoval(false)} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }}><ThemedText variant="labelStrong">{t('cancel')}</ThemedText></Pressable>
      </View>
    </View> : null}
    {error ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t(error as 'goalSaveFailed' | 'goalRemoveFailed')}</ThemedText> : null}
  </View>;
}
