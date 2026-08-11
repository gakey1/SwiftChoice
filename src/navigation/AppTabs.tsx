// The main app shell once someone is signed in: a bottom-tab navigator that uses
// the shared BottomNav component as the tab bar. It sits inside the signed-in
// part of RootNavigator, so the tabs only show up after login.

// The navigator itself, and the props react-navigation hands a custom tab bar.
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// The shared bar, and its key type, which the route names below have to match.
import { BottomNav } from "@/components/BottomNav";
import type { BottomNavKey } from "@/components/BottomNav";
// The three tab names, typed.
import type { AppTabsParamList } from "@/navigation/types";
// The three screens behind the tabs.
import { HistoryScreen } from "@/screens/history/HistoryScreen";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";

// Typed with the param list, so a wrong screen name fails to compile.
const Tab = createBottomTabNavigator<AppTabsParamList>();

// Draws the shared BottomNav as the tab bar. It works out which tab is active from the
// current route, and when a tab is tapped it tells the navigator to switch. The
// route names match the nav keys, so they line up.
function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const current = state.routes[state.index];
  const active = (current?.name ?? "home") as BottomNavKey;
  return <BottomNav active={active} onNavigate={(key) => navigation.navigate(key)} />;
}

// Headers are off throughout: every screen draws its own, so the navigator's
// would be a second one stacked above it.
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
