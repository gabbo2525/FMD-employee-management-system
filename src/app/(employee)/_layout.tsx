import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/constants/colors';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[s.tabIconWrap, focused && s.tabIconActive]}>
      <Text style={{ fontSize: 19 }}>{emoji}</Text>
    </View>
  );
}

export default function EmployeeLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: s.tabBar,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textSoft,
        tabBarLabelStyle: s.tabLabel,
        headerStyle: s.header,
        headerTitleStyle: s.headerTitle,
        headerTintColor: C.text,
      }}
    >
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', headerTitle: 'Attendance', tabBarIcon: ({ focused }) => <TabIcon emoji="⏰" focused={focused} /> }} />
      <Tabs.Screen name="leave"      options={{ title: 'Leave',      headerTitle: 'Leave Request', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile',    headerTitle: 'My Profile',    tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: C.card,
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
    shadowColor: C.textSoft,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  tabLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tabIconWrap: { width: 38, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: C.primaryFaint },
  header: { backgroundColor: C.card, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.text, fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
});
