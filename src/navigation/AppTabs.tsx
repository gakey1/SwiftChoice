// Signed-in app shell: a bottom-tab navigator that renders the shared
// design-system BottomNav as its tab bar. Nested inside the signed-in branch
// of RootNavigator, so the tabs only appear once a user is logged in.

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { BottomNav } from "@/components/BottomNav";
import type { BottomNavKey } from "@/components/BottomNav";
import type { AppTabsParamList } from "@/navigation/types";
import { HistoryScreen } from "@/screens/history/HistoryScreen";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";

const Tab = createBottomTabNavigator<AppTabsParamList>();

// Render the design-system BottomNav as the tab bar: map the active route to
// its key, and a tab press back to navigation. Route names are the nav keys.
function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const current = state.routes[state.index];
  const active = (current?.name ?? "home") as BottomNavKey;
  return <BottomNav active={active} onNavigate={(key) => navigation.navigate(key)} />;
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tab.Screen name="home" component={HomeScreen} />
      <Tab.Screen name="history" component={HistoryScreen} />
      <Tab.Screen name="settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
