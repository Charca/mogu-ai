import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDiary } from '../../data/provider';
import { colors } from '../../ui/theme';

const icons = {
  index: 'home-outline',
  log: 'chatbubble-ellipses-outline',
  history: 'calendar-outline',
  progress: 'stats-chart-outline',
} as const;
export default function TabLayout() {
  const { user } = useDiary();
  if (!user.onboardedAt) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: '#B1B0BF',
        tabBarStyle: {
          backgroundColor: colors.dark,
          borderTopWidth: 0,
          borderRadius: 25,
          marginHorizontal: 16,
          marginBottom: 12,
          paddingTop: 10,
          height: 78,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, size }) => (
          <Ionicons
            name={icons[route.name as keyof typeof icons] ?? 'ellipse-outline'}
            color={focused ? colors.lime : '#B1B0BF'}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="log" options={{ title: 'Log meal' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
