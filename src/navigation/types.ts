// These list the screens the app can move to, and what information each one
// expects (undefined means it needs nothing passed to it). Signed-out users get
// the auth screens, and signed-in users get the bottom tabs. The tab names here
// match the keys in the bottom nav, so the tab bar lines up with them.

export type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
};

export type AppTabsParamList = {
  home: undefined;
  history: undefined;
  settings: undefined;
};

// The signed-in area. It holds the tabs as a single entry, plus the module
export type AppStackParamList = {
  MainTabs: undefined;
  Fuel: undefined;
  Focus: undefined;
  Priority: undefined;
  BudgetSurvey: undefined;
};
