import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { layout, radius, sizing, spacing } from '@/theme';
import { WaterDateTimeField } from '../components/water-date-time-field';
import { useCreateWaterLog } from '../hooks/use-water';
import { isFutureInstant } from '../utils/water-date';
import { validateWaterAmount } from '../utils/water-validation';

const PRESETS = [100, 200, 500, 750] as const;

export default function WaterDetailEntryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [initial] = useState(() => new Date());
  const [amountInput, setAmountInput] = useState('');
  const [loggedAt, setLoggedAt] = useState<Date | null>(initial);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const { createLog, submitting } = useCreateWaterLog();

  async function save() {
    if (pendingRef.current) return;
    const amountMl = Number(amountInput);
    const validAmount = amountInput.trim() !== '' && validateWaterAmount(amountMl) === null && /^\d+$/.test(amountInput.trim());
    if (!validAmount) {
      setAmountError(amountInput.trim() ? 'Amount must be a whole number from 1 to 2,000 ml.' : 'Please enter an amount.');
    } else {
      setAmountError(null);
    }
    if (!loggedAt || Number.isNaN(loggedAt.getTime())) {
      setTimeError('Choose a valid date and time.');
    } else if (isFutureInstant(loggedAt, new Date())) {
      setTimeError('Future times cannot be logged.');
    } else {
      setTimeError(null);
    }
    if (!validAmount || !loggedAt || Number.isNaN(loggedAt.getTime()) || isFutureInstant(loggedAt, new Date())) return;
    pendingRef.current = true;
    setSaveError(null);
    try {
      await createLog({ amountMl, loggedAt: loggedAt.toISOString(), source: 'custom' });
      router.back();
    } catch {
      setSaveError('Could not save this log. Please try again.');
    } finally {
      pendingRef.current = false;
    }
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Math.max(insets.top + spacing.sm, spacing.lg), paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.lg }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to water tracking" style={({ pressed }) => ({ minHeight: sizing.controlComfortable, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><ThemedText variant="bodyStrong" themeColor="accent">‹ Back</ThemedText></Pressable>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="largeTitle">Add water details</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">Record an amount and the time you drank it.</ThemedText>
        </View>
        <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, gap: spacing.md }}>
          <ThemedText variant="heading">Choose an amount</ThemedText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>{PRESETS.map((preset) => {
            const selected = amountInput === String(preset);
            return <Pressable key={preset} onPress={() => { setAmountInput(String(preset)); setAmountError(null); }} accessibilityRole="button" accessibilityLabel={`${preset} millilitres`} accessibilityState={{ selected }} style={({ pressed }) => ({ flex: 1, minHeight: 72, borderRadius: radius.lg, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accentSoft : theme.background, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><ThemedText variant="heading" themeColor={selected ? 'accent' : 'text'}>{preset}</ThemedText><ThemedText variant="caption" themeColor="textSecondary">ml</ThemedText></Pressable>;
          })}</View>
        </View>
        <View style={{ alignItems: 'center' }}><ThemedText variant="subhead" themeColor="textSecondary">Or enter manually</ThemedText></View>
        <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="labelStrong">Amount (ml)</ThemedText>
            <TextInput accessibilityLabel="Water amount in millilitres" keyboardType="number-pad" value={amountInput} onChangeText={(value) => { setAmountInput(value); setAmountError(null); }} placeholder="Enter 1–2,000 ml" placeholderTextColor={theme.textSecondary} style={{ minHeight: sizing.controlComfortable, borderWidth: 1, borderRadius: radius.md, borderColor: amountError ? theme.danger : theme.border, backgroundColor: theme.background, color: theme.text, paddingHorizontal: spacing.md, fontSize: 17 }} />
            {amountError ? <ThemedText variant="caption" themeColor="danger">{amountError}</ThemedText> : null}
          </View>
          <WaterDateTimeField initial={initial} onChange={(date) => { setLoggedAt(date); setTimeError(null); }} theme={theme} />
          {timeError ? <ThemedText variant="caption" themeColor="danger">{timeError}</ThemedText> : null}
        </View>
        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.surfaceTint }}><ThemedText variant="subhead" themeColor="textSecondary">This is sample data for this app session. It is not synced to a server.</ThemedText></View>
        {saveError ? <ThemedText variant="body" themeColor="danger">{saveError}</ThemedText> : null}
        <Pressable onPress={save} disabled={submitting} accessibilityRole="button" accessibilityLabel="Save water log" accessibilityState={{ disabled: submitting, busy: submitting }} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent, opacity: submitting ? 0.5 : pressed ? 0.8 : 1 })}><ThemedText variant="bodyStrong" themeColor="onAccent">{submitting ? 'Saving…' : 'Save water log'}</ThemedText></Pressable>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
