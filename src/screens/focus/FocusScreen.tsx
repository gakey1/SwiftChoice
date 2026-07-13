// Focus module screen. It shows the workspace filters (energy level and vibe),
// asks the recommendation engine for matching spots, then shows one result card
// at a time with Accept and a single Reroll. Accept saves the choice to history
// and goes back home. Focus uses the green module colour, taken from the active
// theme; all colours follow the dark/light Arcade toggle.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import type { AppStackParamList } from "@/navigation/types";
import {
  getFocusRecommendation,
  type FocusOption,
} from "@/services/recommendation/recommendationEngine";
import { logDecision } from "@/features/history/historyStorage";
import { moduleAccent } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { T } from "@/theme/tokens";

// Dark ink sits on top of the bright accent fills (buttons), for contrast.
const ON_ACCENT = "#141026";

type EnergyLevel = "low" | "medium" | "high";
type FocusVibe = "silent" | "background" | "collaborative";

type FilterGroupProps = {
  label: string;
  options: string[];
  displayValues?: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  activeColor: string;
};

// One filter group: a label, the value currently chosen shown in the module
// colour, and a row of options to pick from. The chosen option is outlined.
function FilterOptionGroup({
  label,
  options,
  displayValues,
  selectedValue,
  onSelect,
  activeColor,
}: FilterGroupProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.groupContainer}>
      <View style={styles.groupHeader}>
        <Text style={[styles.groupLabel, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.groupSelectionDisplay, { color: activeColor }]}>
          {displayValues ? displayValues[options.indexOf(selectedValue)] : selectedValue}
        </Text>
      </View>

      <View style={styles.optionsRow}>
        {options.map((option, index) => {
          const isActive = selectedValue === option;
          const displayLabel = displayValues ? displayValues[index] : option;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionCard,
                { backgroundColor: colors.chip, borderColor: colors.cardLine },
                isActive && { borderColor: activeColor, borderWidth: 1.5 },
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isActive ? activeColor : colors.ink2 },
                  isActive && { fontFamily: T.font.bold },
                ]}
              >
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function FocusScreen() {
  const { colors } = useTheme();
  const accent = moduleAccent(colors, "focus");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("medium");
  const [vibe, setVibe] = useState<FocusVibe>("background");
  const [hasRerolled, setHasRerolled] = useState(false);

  const [recommendation, setRecommendation] = useState<FocusOption | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchList, setMatchList] = useState<FocusOption[]>([]);

  const primaryColor = accent.color;
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Runs when "Find My Spot" is pressed. Asks the engine for matching spots,
  // keeps the whole list so a reroll can show the next one, and shows the first.
  function handleGetRecommendation() {
    const randomizedList = getFocusRecommendation({
      energyLevel,
      vibe,
    });

    if (randomizedList.length > 0) {
      const firstChoice = randomizedList[0];

      setMatchList(randomizedList);

      if (firstChoice) {
        setRecommendation(firstChoice);
      }
    } else {
      setMatchList([]);
      setRecommendation(null);
    }

    setHasRerolled(false);
    setHasSearched(true);
  }

  // Runs when Reroll is pressed. Shows the next spot from the list, but only
  // once per search.
  function handleReroll() {
    if (hasRerolled) {
      console.warn("Reroll limit reached. Only one reroll is allowed per search.");
      return;
    }

    if (matchList.length > 1) {
      const nextItem = matchList[1];

      if (nextItem) {
        setRecommendation(nextItem);
        setHasRerolled(true);
      }
    }
  }

  if (recommendation) {
    return (
      <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={22} color={primaryColor} />
            <Text style={[styles.backText, { color: primaryColor }]}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.content, { justifyContent: "center" }]}>
          <View style={styles.headerContainer}>
            <Text style={[styles.contextSubtitle, { color: colors.ink2 }]}>Your Focus recommendation</Text>
            <Text style={[styles.h1, { color: colors.ink }]}>{"Here's where to focus"}</Text>
          </View>

          <Card style={[styles.resultCardCustom, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
            <View style={[styles.avatarBadge, { backgroundColor: accent.tint }]}>
              <Icon name="book-open" size={36} color={primaryColor} />
            </View>

            <Text style={[styles.itemName, { color: colors.ink }]}>{recommendation.spot_name}</Text>
            <Text style={[styles.cuisineType, { color: colors.ink2 }]}>
              Based on {energyLabel(recommendation.energy_level)} energy and{" "}
              {vibeLabel(recommendation.vibe)} vibe
            </Text>

            <View style={[styles.metricsRow, { borderColor: colors.cardLine }]}>
              <View style={styles.metricColumn}>
                <Text style={[styles.metricValue, { color: primaryColor }]}>
                  {energyLabel(recommendation.energy_level)}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.ink2 }]}>Energy</Text>
              </View>

              <View style={styles.metricColumn}>
                <Text style={[styles.metricValue, { color: colors.ink }]}>{vibeLabel(recommendation.vibe)}</Text>
                <Text style={[styles.metricLabel, { color: colors.ink2 }]}>Vibe</Text>
              </View>

              <View style={styles.metricColumn}>
                <View style={styles.ratingContainer}>
                  <Text style={[styles.metricValue, { color: colors.ink }]}>{recommendation.rating}</Text>
                  <Icon name="star" size={14} color={primaryColor} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.ink2 }]}>Rating</Text>
              </View>
            </View>
          </Card>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.8}
              onPress={async () => {
                // Record the accepted decision via the shared history API.
                // Same shape as the Fuel Accept, with the focus fields.
                await logDecision({
                  moduleType: "focus",
                  focusId: recommendation.focus_id,
                  itemSnapshot: {
                    name: recommendation.spot_name,
                    details: {
                      energyLevel: recommendation.energy_level,
                      vibe: recommendation.vibe,
                      rating: recommendation.rating,
                    },
                  },
                  appliedFilters: { energyLevel, vibe },
                  rerolled: hasRerolled,
                });
                setRecommendation(null);
                navigation.goBack();
              }}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReroll}
              disabled={hasRerolled || matchList.length <= 1}
              style={[
                styles.rerollBtn,
                { backgroundColor: colors.chip, borderColor: colors.cardLine },
                { opacity: hasRerolled || matchList.length <= 1 ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.rerollBtnText, { color: colors.ink }]}>Reroll</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={22} color={primaryColor} />
          <Text style={[styles.backText, { color: primaryColor }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <View style={[styles.iconPlaceholder, { backgroundColor: accent.tint }]}>
            <Icon name="book-open" size={24} color={primaryColor} />
          </View>
          <View>
            <Text style={[styles.h1, { color: colors.ink }]}>Focus</Text>
            <Text style={[styles.subtitle, { color: colors.ink2 }]}>Where should you study or work?</Text>
          </View>
        </View>

        <FilterOptionGroup
          label="Energy"
          options={["low", "medium", "high"]}
          displayValues={["Low", "Medium", "High"]}
          selectedValue={energyLevel}
          onSelect={(val) => setEnergyLevel(val as EnergyLevel)}
          activeColor={primaryColor}
        />

        <FilterOptionGroup
          label="Vibe"
          options={["silent", "background", "collaborative"]}
          displayValues={["Silent", "Background", "Collaborative"]}
          selectedValue={vibe}
          onSelect={(val) => setVibe(val as FocusVibe)}
          activeColor={primaryColor}
        />

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: primaryColor }]}
          onPress={handleGetRecommendation}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Find My Spot</Text>
        </TouchableOpacity>

        {recommendation === null && hasSearched && (
          <View style={styles.noResultContainer}>
            <Text style={[styles.noResultText, { color: colors.ink2 }]}>
              No exact focus spot found. Try changing your energy or vibe.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Turns the stored energy value into a word to show on screen.
function energyLabel(value: EnergyLevel) {
  if (value === "low") return "Low";
  if (value === "high") return "High";

  return "Medium";
}

// Turns the stored vibe value into a word to show on screen.
function vibeLabel(value: FocusVibe) {
  if (value === "silent") return "Silent";
  if (value === "collaborative") return "Collaborative";

  return "Background";
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[4],
    paddingBottom: 40,
    gap: T.spacing[5],
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  backRow: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[3],
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[3],
    marginTop: T.spacing[2],
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  groupContainer: { gap: T.spacing[2] },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  groupSelectionDisplay: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  optionsRow: { flexDirection: "row", gap: T.spacing[3], width: "100%" },
  optionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: T.spacing[3],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  headerContainer: { alignItems: "center", marginBottom: T.spacing[2] },
  contextSubtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginBottom: 4,
  },
  resultCardCustom: {
    width: "100%",
    borderRadius: 24,
    paddingVertical: T.spacing[5],
    paddingHorizontal: T.spacing[4],
    alignItems: "center",
    borderWidth: 1,
    marginBottom: T.spacing[3],
  },
  avatarBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: T.spacing[4],
  },
  itemName: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    marginBottom: 4,
    textAlign: "center",
  },
  cuisineType: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginBottom: T.spacing[5],
    textAlign: "center",
  },
  metricsRow: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    paddingTop: T.spacing[4],
  },
  metricColumn: { flex: 1, alignItems: "center", gap: 2 },
  metricValue: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption },
  actionRow: { flexDirection: "row", gap: T.spacing[4], width: "100%" },
  acceptBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  rerollBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rerollBtnText: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  noResultContainer: { marginTop: T.spacing[2], padding: T.spacing[3], alignItems: "center" },
  noResultText: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    textAlign: "center",
  },
});
