import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTranslations } from '@/i18n';
import { spacing } from '@/theme';
import type { StatisticsVisuals } from '../constants/statistics-visuals';
import { statisticsMessages } from '../messages';

const artwork = {
  light: { wave: require('../assets/green_smooth.png'), bars: require('../assets/green_graph.png') },
  dark: { wave: require('../assets/pink_smooth.png'), bars: require('../assets/pink_graph.png') },
};

export function StatisticsBanner({ visuals, dark }: { visuals: StatisticsVisuals; dark: boolean }) {
  const t = useTranslations(statisticsMessages);
  const art = artwork[dark ? 'dark' : 'light'];
  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <ThemedText accessibilityRole="header" variant="largeTitle" style={{ color: visuals.text }}>{t('title')}</ThemedText>
        <ThemedText variant="subhead" style={{ color: visuals.secondary }}>{t('description')}</ThemedText>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.art}>
        <Image source={art.wave} resizeMode="contain" style={styles.wave} />
        <Image
          source={art.bars}
          resizeMode="contain"
          style={styles.image}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  copy: { flex: 1, gap: spacing.xs, paddingVertical: spacing.sm, zIndex: 1 },
  art: { width: '34%', maxWidth: 156, height: 116, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', width: 190, height: 190, right: -spacing.sm, top: -spacing.lg, opacity: 0.72 },
  image: { width: '126%', height: 136 },
});
