// Top-level navigator. Reads the auth session and shows either the auth
// stack (signed out) or the app tab navigator (signed in). The split means a
// signed-out user can never reach the app screens: they are not mounted.

import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/hooks/useAuth";
import { AppTabs } from "@/navigation/AppTabs";
import type { AuthStackParamList } from "@/navigation/types";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { T } from "@/theme/tokens";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.teal} />
      </View>
    );
  }

  if (user) {
    return <AppTabs />;
  }

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
