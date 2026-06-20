import { Stack } from 'expo-router';
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="landing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="signup" options={{ gestureEnabled: true }} />
    </Stack>
  );
}
