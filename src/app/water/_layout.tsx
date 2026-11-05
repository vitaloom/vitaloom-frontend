import { Stack } from 'expo-router';

export default function WaterLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Water Tracking' }} />
      <Stack.Screen name="history" options={{ title: 'Water history' }} />
    </Stack>
  );
}
