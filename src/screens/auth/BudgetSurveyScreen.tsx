import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AmbientBackground } from "@/components/AmbientBackground";
import { useAuth } from "@/hooks/useAuth";
import type { AppStackParamList } from "@/navigation/types";
import { saveBudgetTier } from "@/services/firestore/users";
import type { BudgetTier } from "@/services/firestore/users";
import { loadPreferences, savePreferences } from "@/services/localdb/preferencesStorage";
import { useTheme } from "@/theme/ThemeProvider";
import { moduleDeep } from "@/theme/themes";
import { T } from "@/theme/tokens";


export function BudgetSurveyScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [selectedTier, setSelectedTier] = useState<BudgetTier>('moderate');

  // The profile is what decides whether this user has answered, so it is saved
  // there first. The same answer is then mirrored into the on-device settings,
  // which is where the Fuel and Settings screens already read the budget from.
  // Each save is handled on its own so that one failing does not skip the other,
  // and either way the user is let through rather than held on this screen.
  const handleSave = async () => {
    if (user) {
      try {
        await saveBudgetTier(user.uid, selectedTier);
      } catch (error) {
        console.warn('Could not save the budget level to the profile', error);
      }
    }

    try {
      const currentPrefs = await loadPreferences();
      await savePreferences({
        ...currentPrefs,
        defaultBudget: selectedTier,
      });
    } catch (error) {
      console.warn('Could not save the budget level on the device', error);
    }

    navigation.replace('Fuel');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AmbientBackground />
      <Text style={[styles.title, { color: colors.ink }]}>Personalize Your Budget</Text>
      <Text style={[styles.subtitle, { color: colors.ink2 }]}>
        What is your typical meal budget?
      </Text>

      <View style={styles.optionContainer}>
        {(['budget', 'moderate', 'premium'] as const).map((tier) => {
          const isSelected = selectedTier === tier;
          const labelText = 
            tier === 'budget' ? '$10' :
            tier === 'moderate' ? '$25' : '$45';

          return (
            <TouchableOpacity
              key={tier}
              style={[
                styles.optionButton,
                { backgroundColor: colors.card, borderColor: colors.cardLine },
                isSelected && { borderColor: moduleDeep('fuel'), borderWidth: 2 }
              ]}
              onPress={() => setSelectedTier(tier)}
            >
              <Text style={[styles.optionText, { color: colors.ink }]}>{labelText}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Continue button */}
      <TouchableOpacity 
        style={[styles.continueButton, { backgroundColor: moduleDeep('fuel') }]}
        onPress={handleSave}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Skip button */}
      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.skipButtonText, { color: colors.ink2 }]}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  optionContainer: { gap: 12, marginBottom: 32 },
  optionButton: { padding: 18, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '600' },
  continueButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  skipButton: {
    marginTop: T.spacing[4],
    alignItems: "center",
    padding: T.spacing[2],
  },
  skipButtonText: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
  },
});