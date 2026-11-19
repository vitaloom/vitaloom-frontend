import { Image, StyleSheet, View } from 'react-native';

const avatarAssets = {
  idle: require('../../../assets/assistant/vita-ai-launcher-idle.png'),
  activated: require('../../../assets/assistant/vita-ai-mascot-activated.png'),
  recording: require('../../../assets/assistant/vita-ai-recording-microphone.png'),
} as const;

export function VitaAiAvatar({ size = 52, variant = 'idle' }: {
  size?: number;
  variant?: keyof typeof avatarAssets;
}) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.container, { width: size, height: size }]}>
    <Image source={avatarAssets[variant]} resizeMode="contain" style={styles.image} />
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
