// Route param lists. The signed-out side is a stack (auth screens); the
// signed-in side is a bottom-tab navigator. Tab route names match the
// BottomNav keys so the shared tab bar maps straight onto them.

export type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
};

export type AppTabsParamList = {
  home: undefined;
  history: undefined;
  settings: undefined;
};

// Signed-in stack that wraps the tabs, so module screens (Fuel, later Focus
// and Priority) push over the tab bar. The tabs themselves are one route.
export type AppStackParamList = {
  MainTabs: undefined;
  Fuel: undefined;
};
