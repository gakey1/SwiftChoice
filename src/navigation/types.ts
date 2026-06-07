// Route param lists for the two top-level stacks.
// The "Home" route name is fixed: US02 (Tracy) replaces the placeholder
// Home screen but keeps this name, so auth routing does not change.

export type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Settings: undefined;
};
