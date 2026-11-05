import { SymbolView } from 'expo-symbols';
import { useMemo, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { layout, radius, shadows, sizing, spacing } from '@/theme';

type Intake = { id: number; amount: number; time: string };
type AmountChoice = 100 | 250 | 500 | 'custom';
type Theme = ReturnType<typeof useTheme>;

const dailyGoal = 2000;
const initialIntake: Intake[] = [
  { id: 1, amount: 250, time: '09:15 AM' },
  { id: 2, amount: 300, time: '11:30 AM' },
  { id: 3, amount: 450, time: '01:20 PM' },
  { id: 4, amount: 500, time: '04:10 PM' },
];

const icons = {
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  waterOutline: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} as const satisfies Record<string, ComponentProps<typeof SymbolView>['name']>;

function Icon({ name, color, size = sizing.iconMd }: { name: keyof typeof icons; color: string; size?: number }) {
  return <SymbolView name={icons[name]} tintColor={color} size={size} />;
}

// Decorative illustration geometry is local to this artwork, separate from layout tokens.
function Bottle({ theme }: { theme: Theme }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: spacing.md, top: spacing.md, width: 74, height: 116, transform: [{ rotate: '19deg' }], opacity: 0.8 }}>
      <View style={{ width: 34, height: 14, alignSelf: 'center', backgroundColor: theme.accent, borderRadius: radius.sm }} />
      <View style={{ width: 52, height: 12, alignSelf: 'center', backgroundColor: theme.water, borderRadius: radius.sm }} />
      <View style={{ width: 64, height: 88, alignSelf: 'center', overflow: 'hidden', borderWidth: 2, borderColor: theme.water, backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
        <View style={{ position: 'absolute', bottom: 0, width: '100%', height: '42%', backgroundColor: theme.waterTrack }} />
        <View style={{ position: 'absolute', left: spacing.sm, top: spacing.md, width: 7, height: 7, borderRadius: radius.full, backgroundColor: theme.water }} />
        <View style={{ position: 'absolute', right: spacing.md, top: spacing.xl, width: 5, height: 5, borderRadius: radius.full, backgroundColor: theme.water }} />
      </View>
    </View>
  );
}

function ProgressCard({ total, theme }: { total: number; theme: Theme }) {
  const percent = Math.min(Math.round((total / dailyGoal) * 100), 100);
  return (
    <View style={{ borderRadius: radius.xl, backgroundColor: theme.waterPanel, boxShadow: shadows.card }}>
      <View style={{ height: layout.waterHero, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, borderWidth: 1, borderColor: theme.waterPanelEdge, experimental_backgroundImage: `linear-gradient(145deg, ${theme.backgroundElement}, ${theme.waterPanel})` }}>
        <View accessibilityElementsHidden style={{ position: 'absolute', bottom: -64, left: -38, width: 440, height: 118, borderRadius: radius.full, backgroundColor: theme.water, opacity: 0.18, transform: [{ rotate: '-6deg' }] }} />
        <View accessibilityElementsHidden style={{ position: 'absolute', bottom: -67, left: -44, width: 440, height: 100, borderRadius: radius.full, backgroundColor: theme.accentSoft, opacity: 0.8, transform: [{ rotate: '7deg' }] }} />
        <Bottle theme={theme} />
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Water intake today" accessibilityValue={{ min: 0, max: dailyGoal, now: Math.min(total, dailyGoal), text: `${total} millilitres of ${dailyGoal} millilitres, ${percent} percent` }} style={{ width: layout.progressRing, height: layout.progressRing, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 72 }, (_, index) => {
            const angle = (index / 72) * Math.PI * 2;
            const distance = (layout.progressRing - layout.progressStroke) / 2;
            return <View key={index} pointerEvents="none" style={{ position: 'absolute', left: layout.progressRing / 2 + distance * Math.sin(angle) - 5, top: layout.progressRing / 2 - distance * Math.cos(angle) - layout.progressStroke / 2, width: 10, height: layout.progressStroke, borderRadius: radius.full, backgroundColor: index < Math.round((percent / 100) * 72) ? theme.accent : theme.waterTrack, transform: [{ rotate: `${(index / 72) * 360}deg` }] }} />;
          })}
          <Icon name="water" color={theme.water} size={sizing.iconLg} />
          <ThemedText variant="metricLarge" style={{ marginTop: spacing.sm }}>{(total / 1000).toFixed(1)} L</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary">/ {(dailyGoal / 1000).toFixed(1)} L</ThemedText>
          <View style={{ width: 88, height: 1, backgroundColor: theme.border, marginVertical: spacing.sm }} />
          <ThemedText variant="heading" themeColor="accent">{percent}%</ThemedText>
        </View>
        <View accessibilityElementsHidden style={{ position: 'absolute', left: spacing.xl, top: 120, width: 7, height: 7, borderRadius: radius.full, borderWidth: 1, borderColor: theme.water }} />
        <View accessibilityElementsHidden style={{ position: 'absolute', right: spacing.xl, bottom: 62, width: 11, height: 11, borderRadius: radius.full, borderWidth: 1, borderColor: theme.water }} />
      </View>
    </View>
  );
}

function AmountTile({ value, selected, onPress, theme }: { value: AmountChoice; selected: boolean; onPress: () => void; theme: Theme }) {
  const custom = value === 'custom';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={custom ? 'Custom amount' : `${value} millilitres`} accessibilityState={{ selected }} style={({ pressed }) => ({ flex: 1, minHeight: layout.quickTileMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.backgroundElement, opacity: pressed ? 0.78 : 1, boxShadow: shadows.card })}>
      {custom ? <Icon name="edit" color={selected ? theme.onAccent : theme.accent} /> : null}
      <ThemedText variant={custom ? 'labelStrong' : 'heading'} themeColor={selected ? 'onAccent' : 'text'}>{custom ? 'Custom' : value}</ThemedText>
      {!custom ? <ThemedText variant="label" themeColor={selected ? 'onAccent' : 'textSecondary'}>ml</ThemedText> : null}
      {selected ? <View style={{ position: 'absolute', top: -8, right: -5, width: 22, height: 22, borderRadius: radius.full, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" color={theme.accent} size={sizing.iconSm} /></View> : null}
    </Pressable>
  );
}

function QuickAddCard({ onAdd, theme }: { onAdd: (amount: number) => void; theme: Theme }) {
  const [choice, setChoice] = useState<AmountChoice>(250);
  const [customAmount, setCustomAmount] = useState('');
  const amount = choice === 'custom' ? Number(customAmount) : choice;
  const valid = Number.isInteger(amount) && amount > 0 && amount <= dailyGoal;
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="heading">Quick Add</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">Choose amount</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {([100, 250, 500, 'custom'] as const).map((value) => <AmountTile key={value} value={value} selected={choice === value} onPress={() => setChoice(value)} theme={theme} />)}
      </View>
      {choice === 'custom' ? <TextInput accessibilityLabel="Custom water amount in millilitres" placeholder="Enter 1–2000 ml" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" value={customAmount} onChangeText={setCustomAmount} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, color: theme.text, backgroundColor: theme.background }} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={valid ? `Add ${amount} millilitres to today's intake` : 'Enter a valid amount between 1 and 2000 millilitres'} accessibilityState={{ disabled: !valid }} disabled={!valid} onPress={() => onAdd(amount)} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, borderRadius: radius.lg, backgroundColor: theme.accent, opacity: !valid ? 0.45 : pressed ? 0.8 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, boxShadow: shadows.card })}>
        <Icon name="check" color={theme.onAccent} />
        <ThemedText variant="bodyStrong" themeColor="onAccent">Add +{valid ? amount : '—'} ml · Log Now</ThemedText>
      </Pressable>
    </View>
  );
}

function IntakeCard({ entries, theme }: { entries: Intake[]; theme: Theme }) {
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.sm }}>
      <ThemedText variant="heading">Today’s Intake</ThemedText>
      {entries.slice(0, 4).map((entry, index) => <View key={entry.id} style={{ minHeight: sizing.controlMin, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: index === Math.min(entries.length, 4) - 1 ? 0 : 1, borderBottomColor: theme.border }}>
        <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: theme.backgroundSelected }}><Icon name="waterOutline" color={theme.accent} /></View>
        <ThemedText variant="bodyStrong" style={{ flex: 1 }}>{entry.amount} ml</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{entry.time}</ThemedText>
      </View>)}
    </View>
  );
}

export default function WaterLandingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState(initialIntake);
  const total = useMemo(() => entries.reduce((sum, entry) => sum + entry.amount, 0), [entries]);

  function addIntake(amount: number) {
    const now = new Date();
    setEntries((current) => [{ id: now.getTime(), amount, time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }, ...current]);
  }

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: Math.max(insets.top + spacing.xs, spacing.lg), paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
      <View style={{ minHeight: layout.waterHeaderMin, justifyContent: 'center', gap: spacing.sm }}>
        <View accessibilityElementsHidden style={{ position: 'absolute', right: spacing.sm, top: spacing.sm }}><Icon name="calendar" color={theme.accent} /></View>
        <ThemedText variant="labelStrong" themeColor="accent" style={{ letterSpacing: 3 }}>WATER TRACKING</ThemedText>
        <ThemedText variant="largeTitle">Stay Hydrated</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary" style={{ maxWidth: 280 }}>Good hydration keeps your body and mind in balance.</ThemedText>
      </View>
      <ProgressCard total={total} theme={theme} />
      <QuickAddCard onAdd={addIntake} theme={theme} />
      <IntakeCard entries={entries} theme={theme} />
    </View>
  </ScrollView>;
}
