// The main app shell once someone is signed in: a bottom-tab navigator that uses
// our shared BottomNav component as the tab bar. It sits inside the signed-in
// part of RootNavigator, so the tabs only show up after login.

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { BottomNav } from "@/components/BottomNav";
import type { BottomNavKey } from "@/components/BottomNav";
import type { AppTabsParamList } from "@/navigation/types";
import { HistoryScreen } from "@/screens/history/HistoryScreen";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";

const Tab = createBottomTabNavigator<AppTabsParamList>();

// Draws our BottomNav as the tab bar. It works out which tab is active from the
// current route, and when a tab is tapped it tells the navigator to switch. The
// route names match the nav keys, so they line up.
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
