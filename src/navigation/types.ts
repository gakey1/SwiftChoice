// These list the screens the app can move to, and what information each one
// expects (undefined means it needs nothing passed to it). Signed-out users get
// the auth screens, and signed-in users get the bottom tabs. The tab names here
// match the keys in the bottom nav, so the tab bar lines up with them.

export type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  ForgotPassword: undefined;
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
  // Reached from the Security row in Settings. The reason is set only when a
  // password change invalidated an existing enrolment (D-012), which makes the
  // screen explain itself rather than appearing for no visible cause.
  TwoFactorSetup: { reason?: "password-changed" } | undefined;
  // Reached from the Your data row in Settings. The full account of what leaves
  // the phone and what does not, which the short notices around the app point
  // back to (US34).
  DataAndPrivacy: undefined;
  // Reached from the Account section in Settings. Changing a password while
  // signed in, as opposed to the reset flow, which is for people locked out.
  ChangePassword: undefined;
  // Reached from the Danger zone row in Settings. Its own screen rather than a
  // confirmation box, because it needs a password field and the list of what is
  // about to be deleted is too long to read inside an alert (US33).
  DeleteAccount: undefined;
  // The privacy policy and the terms of use. One screen with two documents
  // rather than two screens, because they share their whole structure and the
  // only thing that differs is the text.
  Legal: { document: "privacy" | "terms" };
};
