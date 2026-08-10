// Whether the sign-in challenge prints the current six-digit code on screen. A
// demo affordance for running on a simulator, kept out of release builds: a code
// printed on the gate it guards leaves the factor stopping nobody.
// A function rather than a constant so both branches can be tested. __DEV__ is
// a React Native global: true under Metro and Jest, false in a release bundle.
export function showsDemoCodeOnChallenge(): boolean {
  return __DEV__;
}
