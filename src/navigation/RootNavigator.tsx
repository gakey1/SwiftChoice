// The very top of the app's navigation. It looks at who is signed in and shows
// either the login screens (signed out) or the main app with its tabs (signed
// in). Because the two sides are kept separate, a signed-out person can never
// reach the app screens, since those screens are not even loaded.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { XpHud } from "@/components/XpHud";
import { useAuth } from "@/hooks/useAuth";
import { AppTabs } from "@/navigation/AppTabs";
import type { AppStackParamList, AuthStackParamList } from "@/navigation/types";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { VerifyEmailScreen } from "@/screens/auth/VerifyEmailScreen";
import { FuelScreen } from "@/screens/fuel/FuelScreen";
import { FocusScreen } from "@/screens/focus/FocusScreen";
import { PriorityScreen } from "@/screens/priority/PriorityScreen";
import { BudgetSurveyScreen } from '../screens/auth/BudgetSurveyScreen';
import { T } from "@/theme/tokens";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { user, initializing, emailVerified } = useAuth();

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

  // Signed in and verified: show the main app. That is the tabs, plus the Fuel
  // and Focus screens which slide up over the tab bar when opened.
  if (user) {
    // The XP HUD is an overlay sibling of the navigator, so it shows at the same
    // top-right spot on every signed-in screen (tabs plus the module screens).
    return (
      <View style={styles.appRoot}>
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="MainTabs" component={AppTabs} />
          <AppStack.Screen
            name="Fuel"
            component={FuelScreen}
            options={{ animation: "slide_from_bottom" }}
            listeners={({ navigation }) => ({
              focus: async () => {
                try {
                  const isCompleted = await AsyncStorage.getItem('budget_survey_completed');
                  if (isCompleted !== 'true') {
                    // Swap the current screen to the survey so they don't see Fuel first
                    navigation.replace('BudgetSurvey');
                  }
                } catch (error) {
                  console.error("Failed to check budget survey status", error);
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
