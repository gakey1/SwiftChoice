// The very top of the app's navigation. It looks at who is signed in and shows
// either the login screens (signed out) or the main app with its tabs (signed
// in). Because the two sides are kept separate, a signed-out person can never
// reach the app screens, since those screens are not even loaded.
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { XpHud } from "@/components/XpHud";
import { useAuth } from "@/hooks/useAuth";
import { AppTabs } from "@/navigation/AppTabs";
import type { AppStackParamList, AuthStackParamList } from "@/navigation/types";
import { consumePasswordResetInvalidation } from "@/features/auth/twoFactor";
import { isTotpEnrolled } from "@/services/localdb/totpStorage";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { TotpChallengeScreen } from "@/screens/auth/TotpChallengeScreen";
import { TwoFactorSetupScreen } from "@/screens/settings/TwoFactorSetupScreen";
import { DataAndPrivacyScreen } from "@/screens/settings/DataAndPrivacyScreen";
import { DeleteAccountScreen } from "@/screens/settings/DeleteAccountScreen";
import { ChangePasswordScreen } from "@/screens/settings/ChangePasswordScreen";
import { LegalScreen } from "@/screens/settings/LegalScreen";
import { VerifyEmailScreen } from "@/screens/auth/VerifyEmailScreen";
import { FuelScreen } from "@/screens/fuel/FuelScreen";
import { FocusScreen } from "@/screens/focus/FocusScreen";
import { PriorityScreen } from "@/screens/priority/PriorityScreen";
import { BudgetSurveyScreen } from "@/screens/auth/BudgetSurveyScreen";
import { getBudgetTier } from "@/services/firestore/users";
import { T } from "@/theme/tokens";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { user, initializing, emailVerified } = useAuth();

  // The second-factor gate. `required` is whether this phone is
  // enrolled, `wiped` records that a password change just removed an enrolment
  // so the setup screen can say why, and `passed` is held in memory only, never
  // saved, so reopening the app asks again. Saving it would turn a step-up
  // factor into a one-time formality.
  //
  // The uid it was computed for is stored alongside it rather than being reset
  // on sign-out. That is what makes signing out and back in as a different
  // person safe: the old gate simply stops matching, so it cannot be inherited.
  const [totpGate, setTotpGate] = useState<{
    uid: string | null;
    required: boolean;
    wiped: boolean;
    passed: boolean;
  }>({ uid: null, required: false, wiped: false, passed: false });

  const uid = user?.uid;
  const gateReady = totpGate.uid !== null && totpGate.uid === uid;

  useEffect(() => {
    if (!uid || !emailVerified) return undefined;

    let active = true;
    void (async () => {
      // Order matters. The password-change invalidation runs first, so a reset
      // that just removed the enrolment is not immediately challenged against
      // the secret it deleted.
      const wiped = await consumePasswordResetInvalidation();
      const required = await isTotpEnrolled();
      if (active) setTotpGate({ uid, required, wiped, passed: false });
    })();
    return () => {
      active = false;
    };
  }, [uid, emailVerified]);

  // While the app is still checking who is signed in, show a loading spinner.
  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.teal} />
      </View>
    );
  }

  // Signed in, but they have not confirmed their inbox yet, so keep them on the
  // verify screen. The app screens below are not loaded until the email is
  // verified, the same way signed-out users cannot reach them.
  if (user && !emailVerified) {
    return <VerifyEmailScreen />;
  }

  // Signed in and verified, but the keychain has not been read yet. Hold on the
  // spinner rather than rendering the app, so a phone with 2FA on never shows
  // its contents for a frame before asking for the code.
  if (user && !gateReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.teal} />
      </View>
    );
  }

  // Enrolled on this phone and no code entered yet this run. Same shape as the
  // verify-email gate above: the app screens are not loaded until it passes.
  if (user && totpGate.required && !totpGate.passed) {
    return (
      <TotpChallengeScreen
        onPassed={() => setTotpGate((current) => ({ ...current, passed: true }))}
      />
    );
  }

  // Signed in and verified: show the main app. That is the tabs, plus the Fuel
  // and Focus screens which slide up over the tab bar when opened.
  if (user) {
    // The XP HUD is an overlay sibling of the navigator, so it shows at the same
    // top-right spot on every signed-in screen (tabs plus the module screens).
    return (
      <View style={styles.appRoot}>
        <AppStack.Navigator
          // A password change that removed an enrolment lands the user on the
          // setup screen with the explanation, rather than silently dropping
          // the factor and leaving them to notice on their own.
          initialRouteName={totpGate.wiped ? "TwoFactorSetup" : "MainTabs"}
          screenOptions={{ headerShown: false }}
        >
          <AppStack.Screen name="MainTabs" component={AppTabs} />
          <AppStack.Screen
            name="Fuel"
            component={FuelScreen}
            options={{ animation: "slide_from_bottom" }}
            listeners={({ navigation }) => ({
              focus: async () => {
                try {
                  // The answer lives on the user's profile, so it is asked once
                  // per person rather than once per phone. Somebody who has
                  // never answered is swapped onto the survey before they see
                  // the Fuel filters, so the budget choice means something.
                  const tier = await getBudgetTier(user.uid);
                  if (tier === null) {
                    navigation.replace('BudgetSurvey');
                  }
                } catch (error) {
                  // If the profile cannot be read, with no connection for
                  // example, let them into Fuel anyway. Not being able to check
                  // is not a good enough reason to hold somebody on a screen
                  // they cannot get past.
                  console.warn("Could not check the budget survey status", error);
                }
              },
            })}
          />
          <AppStack.Screen
            name="Focus"
            component={FocusScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen
            name="Priority"
            component={PriorityScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen 
            name="BudgetSurvey"
            component={BudgetSurveyScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen
            name="TwoFactorSetup"
            component={TwoFactorSetupScreen}
            initialParams={totpGate.wiped ? { reason: "password-changed" } : undefined}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen
            name="DataAndPrivacy"
            component={DataAndPrivacyScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen
            name="DeleteAccount"
            component={DeleteAccountScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <AppStack.Screen
            name="Legal"
            component={LegalScreen}
            options={{ animation: "slide_from_bottom" }}
          />
        </AppStack.Navigator>
        <XpHud />
      </View>
    );
  }

  // Signed out: show the login and register screens.
  return (
    <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.canvas,
  },
});
