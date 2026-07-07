// A reference to the app's navigation. Most screen changes happen from inside a
// screen, but this ref lets other places change screens too, like helper
// functions that are not React components. It gets handed to the navigation
// container in App.tsx.

import { createNavigationContainerRef } from "@react-navigation/native";

import type { AppStackParamList } from "@/navigation/types";

export const globalNavigationRef = createNavigationContainerRef<AppStackParamList>();
