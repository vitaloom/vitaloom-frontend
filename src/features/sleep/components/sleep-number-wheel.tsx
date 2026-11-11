import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 3;

type SleepNumberWheelProps = {
  label: string;
  accessibilityLabel?: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
};

export function SleepNumberWheel({ label, accessibilityLabel, value, values, onChange }: SleepNumberWheelProps) {
  const theme = useTheme();
  const scrollRef = useRef<{ scrollTo: (options: { y: number; animated?: boolean }) => void } | null>(null);
  const selectedIndex = Math.max(0, values.indexOf(value));
  const [initialOffset] = useState(() => ({ x: 0, y: selectedIndex * ROW_HEIGHT }));
  const currentIndex = useRef(selectedIndex);
  const lastEmittedIndex = useRef(-1);

  useEffect(() => {
    if (selectedIndex === lastEmittedIndex.current) return;
    currentIndex.current = selectedIndex;
    lastEmittedIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
  }, [selectedIndex, values]);

  const selectIndex = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(values.length - 1, index));
    if (nextIndex === currentIndex.current) return;
    currentIndex.current = nextIndex;
    lastEmittedIndex.current = nextIndex;
    onChange(values[nextIndex]);
    scrollRef.current?.scrollTo({ y: nextIndex * ROW_HEIGHT, animated: false });
  }, [onChange, values]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / ROW_HEIGHT)));
    if (nextIndex === currentIndex.current) return;
    currentIndex.current = nextIndex;
    lastEmittedIndex.current = nextIndex;
    onChange(values[nextIndex]);
  }

  return <View style={styles.column}>
    <ThemedText variant="labelStrong" style={styles.label}>{label}</ThemedText>
    <View style={[styles.frame, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.selectionBand, { backgroundColor: theme.accent }]}
      />
      <ScrollView
        ref={(instance) => {
          scrollRef.current = instance;
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel ?? label}
        focusable
        accessibilityValue={{ min: Number(values[0]), max: Number(values[values.length - 1]), now: Number(value), text: value }}
        aria-valuemin={Number(values[0])}
        aria-valuemax={Number(values[values.length - 1])}
        aria-valuenow={Number(value)}
        aria-valuetext={value}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'increment') selectIndex(currentIndex.current + 1);
          if (nativeEvent.actionName === 'decrement') selectIndex(currentIndex.current - 1);
        }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        contentOffset={initialOffset}
        nestedScrollEnabled
        bounces={false}
        scrollsToTop={false}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        style={[styles.scroller, Platform.OS === 'web' ? { scrollSnapType: 'y mandatory' } as ViewStyle : null]}
      >
        {values.map((option, index) => <View key={option} style={[styles.row, Platform.OS === 'web' ? { scrollSnapAlign: 'center' } as ViewStyle : null]}>
          <View style={styles.option}>
            <ThemedText variant={index === selectedIndex ? 'heading' : 'subhead'} themeColor={index === selectedIndex ? 'onAccent' : 'textSecondary'}>
              {option}
            </ThemedText>
          </View>
        </View>)}
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  column: { flex: 1, minWidth: 0, gap: spacing.xs },
  label: { textAlign: 'center' },
  frame: { height: ROW_HEIGHT * VISIBLE_ROWS + 2, borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  selectionBand: { position: 'absolute', zIndex: 0, top: '50%', left: spacing.xs, right: spacing.xs, height: ROW_HEIGHT - spacing.xs, marginTop: -(ROW_HEIGHT - spacing.xs) / 2, borderRadius: radius.md },
  scroller: { flex: 1 },
  content: { paddingVertical: ROW_HEIGHT },
  row: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: spacing.xs },
  option: { height: ROW_HEIGHT - spacing.xs, alignItems: 'center', justifyContent: 'center' },
});
