import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from "@/theme/ThemeProvider";
import { moduleDeep } from '../../theme/themes';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function BudgetSurveyScreen({ navigation, route }: { navigation: any; route: any }) {
  const { colors } = useTheme();
  const [selectedTier, setSelectedTier] = useState<'budget' | 'moderate' | 'premium'>('moderate');

  const handleSave = async () => {
    try {
        await AsyncStorage.setItem('user_budget_tier', selectedTier);
        await AsyncStorage.setItem('budget_survey_completed', 'true');
        
        navigation.replace('Fuel'); 
    } catch (error) {
        console.error('Failed to save budget preference', error);
    }
};

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.ink }]}>Personalize Your Budget</Text>
      <Text style={[styles.subtitle, { color: colors.ink2 }]}>
        What feels like a reasonable amount to spend on a normal meal?
      </Text>

      <View style={styles.optionContainer}>
        {(['budget', 'moderate', 'premium'] as const).map((tier) => {
          const isSelected = selectedTier === tier;
          const labelText = 
            tier === 'budget' ? 'Under $15 (Budget-friendly)' :
            tier === 'moderate' ? '$15 to $35 (Moderate)' : 'Over $35 (Premium)';

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

      <TouchableOpacity 
        style={[styles.continueButton, { backgroundColor: moduleDeep('fuel') }]}
        onPress={handleSave}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
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
});