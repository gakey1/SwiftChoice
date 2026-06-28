// Navigation container ref. Lets code outside React components (or deep in the
// tree) trigger navigation. Passed to the NavigationContainer in App.tsx.

import { createNavigationContainerRef } from "@react-navigation/native";

import type { AppStackParamList } from "@/navigation/types";

export const globalNavigationRef = createNavigationContainerRef<AppStackParamList>();
