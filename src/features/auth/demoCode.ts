// Whether to print the current six-digit code on screen.
//
// Showing it is a deliberate demo affordance, decided when TOTP was chosen: the
// project is handed over as a zip and run on a simulator, where there is no
// second device to read a code from. Without it the factor cannot be shown at
// all in the setting it is marked in.
//
// The two screens want different answers, which is why this is a function and
// not a constant.
//
//  - Setup shows it always. The person is already signed in and is holding the
//    secret they just created, so seeing a code derived from it gives them
//    nothing they did not already have, and the countdown next to it is the
//    clearest way to show that codes rotate.
//
//  - The sign-in challenge shows it only in development. There it is the answer
//    printed on the gate: anybody reaching that screen could read the code
//    instead of producing it, which leaves the factor stopping nobody. Keeping
//    it out of release builds means the demo still works on a simulator while a
//    build a real person installs asks a real question.
//
// Wrapped in a function rather than read inline so the behaviour can be tested
// both ways. `__DEV__` is a React Native global, true under Metro in
// development and under Jest, false in a production bundle.
export function showsDemoCodeOnChallenge(): boolean {
  return __DEV__;
}
