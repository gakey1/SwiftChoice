// The very top of the app's navigation. It looks at who is signed in and shows
// either the login screens (signed out) or the main app with its tabs (signed
// in). Because the two sides are kept separate, a signed-out person can never
// reach the app screens, since those screens are not even loaded.

import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/hooks/useAuth";
import { AppTabs } from "@/navigation/AppTabs";
import type { AppStackParamList, AuthStackParamList } from "@/navigation/types";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { VerifyEmailScreen } from "@/screens/auth/VerifyEmailScreen";
import { FuelScreen } from "@/screens/fuel/FuelScreen";
import { FocusScreen } from "@/screens/focus/FocusScreen";
import { T } from "@/theme/tokens";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { user, initializing, emailVerified } = useAuth();

  // While we are still checking who is signed in, show a loading spinner.
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

  // Signed in and verified: show the main app. That is the tabs, plus the Fuel
  // and Focus screens which slide up over the tab bar when opened.
  if (user) {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="MainTabs" component={AppTabs} />
        <AppStack.Screen 
          name="Fuel" 
          component={FuelScreen} 
          options={{ 
            animation: "slide_from_bottom" 
          }} 
        />
        <AppStack.Screen 
          name="Focus" 
          component={FocusScreen} 
          options={{ 
            animation: "slide_from_bottom" 
          }} 
        />
      </AppStack.Navigator>
    );
  }

  // Signed out: show the login and register screens.
  return (
    <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.canvas,
  },
});
