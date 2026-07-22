// Fuel module screen. It shows the meal filters (eat in or out, budget, prep
// time, and distance), asks the recommendation engine for matches, then shows
// one result card at a time with Accept and a single Reroll. Accept saves the
// choice to history and goes back home. Fuel uses the amber module colour, taken
// from the active theme; the whole screen wears the Arcade glass look (ambient
// background, glass result card, mono on the coded bits) and follows the
// dark/light toggle.
//
// Styling only: the filter state, the recommendation call, the one-reroll cap,
// and the accept-to-history wiring are exactly as written; only the look changed.

import React, { useEffect, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { AmbientBackground } from "@/components/AmbientBackground";
import { GlassCard } from "@/components/GlassCard";
import { ModuleGlyph } from "@/components/ModuleGlyph";
import { HUD_CLEARANCE } from "@/components/XpHud";
import { T } from "@/theme/tokens";
import { moduleAccent, moduleDeep } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { useProgress } from "@/features/progress/ProgressProvider";
import { XP_PER_DECISION } from "@/features/progress/progress";
import { getRecommendation } from "@/services/recommendation/recommendationEngine";
import type { FoodOption } from "@/services/recommendation/recommendationEngine";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { AppStackParamList } from "@/navigation/types";
import { logDecision } from "@/features/history/historyStorage";

// Dark ink sits on top of the bright accent fills (buttons), for contrast.
const ON_ACCENT = "#141026";

type FilterGroupProps = {
  label: string;
  options: string[];
  displayValues?: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  activeColor: string;
  activeTint: string;
};

// One filter group: a label, the value currently chosen shown in the module
// colour, and a row of options to pick from. The chosen option is filled with
// the module's soft tint, outlined in its colour, and shown in its colour;
// unchosen options keep primary-ink text so every label stays clearly legible.
function FilterOptionGroup({ label, options, displayValues, selectedValue, onSelect, activeColor, activeTint }: FilterGroupProps) {
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
                isActive && { backgroundColor: activeTint, borderColor: activeColor },
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isActive ? activeColor : colors.ink, fontFamily: T.font.bold },
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

type BudgetRangeItem = { label: string; min: number; max: number };
type TierRanges = { low: BudgetRangeItem; medium: BudgetRangeItem; high: BudgetRangeItem };

export function getBudgetRanges(tier: string | null): TierRanges {
  switch (tier) {
    case 'budget': 
      return { 
        low: { label: 'Under $10', min: 0, max: 10 },
        medium: { label: '$10 - $12', min: 10, max: 12 },
        high: { label: '$12 - $15', min: 12, max: 15 },
      };
    case 'moderate': 
      return { 
        low: { label: '$15 - $22', min: 15, max: 22 },
        medium: { label: '$22 - $28', min: 22, max: 28 },
        high: { label: '$28 - $35', min: 28, max: 35 },
      };
    case 'premium': 
      return { 
        low: { label: '$35 - $55', min: 35, max: 55 },
        medium: { label: '$55 - $75', min: 55, max: 75 },
        high: { label: 'Over $75', min: 75, max: Infinity },
      };
    default: 
      return { 
        low: { label: 'Under $25', min: 0, max: 25 },
        medium: { label: '$25 - $50', min: 25, max: 50 },
        high: { label: 'Over $50', min: 50, max: Infinity }
      }; 
  }
}

export function FuelScreen() {
  const { colors } = useTheme();
  const { progress, awardXp } = useProgress();
  const accent = moduleAccent(colors, "fuel");
  const [userTier, setUserTier] = useState<string | null>(null);

  const [mealType, setMealType] = useState<"in" | "out">("out");
  const [budget, setBudget] = useState<"$" | "$$" | "$$$">("$$");
  const [prepTime, setPrepTime] = useState<"short" | "medium" | "long">("medium");
  const [distance, setDistance] = useState<"near" | "mid" | "far">("mid");
  const [hasRerolled, setHasRerolled] = useState<boolean>(false);

  // Fetch the saved tier when the screen mounts
  /*
  useEffect(() => {
    async function loadBudgetPreference() {
      try {
        const savedTier = await AsyncStorage.getItem('user_budget_tier');
        if (savedTier) {
          setUserTier(savedTier);
        }
      } catch (error) {
        console.error("Failed to load user budget tier", error);
      }
    }
    loadBudgetPreference();
  }, []);
*/
// Re-loads the saved tier every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadBudgetPreference() {
        try {
          const savedTier = await AsyncStorage.getItem('user_budget_tier');
          if (active && savedTier) {
            setUserTier(savedTier);
          }
        } catch (error) {
          console.error("Failed to load user budget tier", error);
        }
      }

      loadBudgetPreference();

      return () => {
        active = false;
      };
    }, [])
  );
  // Get the dynamic labels based on the tier
  const budgetRanges = getBudgetRanges(userTier);

  const [recommendation, setRecommendation] = useState<FoodOption | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchList, setMatchList] = useState<FoodOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const primaryColor = accent.color;
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Runs when "Decide for Me" is pressed. Asks the engine for matches, keeps the
  // whole list so a reroll can show the next one, and shows the first result.
  const handleGetRecommendation = async () => {
    setHasSearched(false);

    const budgetKey = budget === "$" ? "low" : budget === "$$" ? "medium" : "high";
    const selectedRange = budgetRanges[budgetKey];

    const randomizedList = await getRecommendation({
      type: mealType,
      budget: budget,
      prepTime: prepTime,
      distance: mealType === "in" ? undefined : distance,
    }) as unknown as FoodOption[];

    if (randomizedList && randomizedList.length > 0) {
      setMatchList(randomizedList);
      setCurrentIndex(0);

      const firstChoice = randomizedList[0];
      if (firstChoice) {
        setRecommendation(firstChoice);
      }
    } else {
      setMatchList([]);
      setRecommendation(null);
    }
    setHasRerolled(false); //limit rerolling to only once per search
    setHasSearched(true);
  };

  // Runs when Reroll is pressed. Shows the next match from the list, but only
  // once per search. If there is nothing else, asks the user to change filters.
  const handleReroll = async () => {
    if (hasRerolled) {
      console.log("Reroll limit reached! Only 1 reroll allowed per search.");
      return;
    }

    if (matchList && matchList.length > 1) {
      const nextItem = matchList[1];

      if (nextItem) {
        setCurrentIndex(1);
        setRecommendation(nextItem);
        setHasRerolled(true);
      }
    } else {
      //If there are no other options, let the user look for something else
      Alert.alert("No other matching options found in the pool. Try adjusting your filters!");
    }
  };

  // === VIEW 1: SHOW THE RESULT CARD MANUALLY IF MATCH IS FOUND ===
  if (recommendation) {
    const distanceText =
      recommendation.distance_range === "near"
        ? "1.2 km"
        : recommendation.distance_range === "mid"
          ? "3.5 km"
          : "6.0 km";
    return (
      <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <AmbientBackground />
        <View style={styles.resultBody}>
          <View style={styles.backRowResult}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Icon name="arrow-left" size={20} color={colors.ink2} />
              <Text style={[styles.backText, { color: colors.ink2 }]}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.resultCenter}>
            <View style={styles.headerContainer}>
              <Text style={[styles.contextSubtitle, { color: colors.ink2 }]}>Your Fuel recommendation</Text>
              <Text style={[styles.h1, { color: colors.ink }]}>{"Here's what to eat"}</Text>
            </View>

            <GlassCard style={styles.resultCardCustom}>
              <View style={[styles.avatarBadge, { backgroundColor: accent.tint }]}>
                <ModuleGlyph moduleKey="fuel" size={36} color={primaryColor} />
              </View>

              <Text style={[styles.itemName, { color: colors.ink }]}>{recommendation.item_name}</Text>
              <Text style={[styles.cuisineType, { color: colors.ink2 }]}>
                {recommendation.type === "in" ? "Home-cooked Meal" : "Local Restaurant / Eatery"}
              </Text>

              <View style={styles.statsRow}>
                <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                  <Text style={[styles.statValue, { color: primaryColor }]}>{recommendation.budget_level}</Text>
                  <Text style={[styles.statLabel, { color: colors.ink2 }]}>Budget</Text>
                </View>

                <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                  <Text style={[styles.statValue, { color: colors.ink }]}>{distanceText}</Text>
                  <Text style={[styles.statLabel, { color: colors.ink2 }]}>Distance</Text>
                </View>

                <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                  <View style={styles.ratingContainer}>
                    <Text style={[styles.statValue, { color: colors.ink }]}>{recommendation.rating}</Text>
                    <Icon name="star" size={13} color={primaryColor} />
                  </View>
                  <Text style={[styles.statLabel, { color: colors.ink2 }]}>Rating</Text>
                </View>
              </View>
            </GlassCard>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
                activeOpacity={0.8}
                onPress={async () => {
                  if (recommendation) {
                    //Log the choice using production history API
                    await logDecision({
                      moduleType: "fuel",
                      fuelId: recommendation.fuel_id,
                      itemSnapshot: {
                        name: recommendation.item_name,
                        details: {
                          type: recommendation.type,
                          budget: recommendation.budget_level,
                          rating: recommendation.rating,
                        },
                      },
                      appliedFilters: {
                        mode: recommendation.type,
                        budget: recommendation.budget_level,
                        prepTime: recommendation.prep_time,
                        distance: recommendation.distance_range,
                      },
                      rerolled: hasRerolled,
                    });

                    // Award the XP the History row and the Home quest pill both
                    // advertise, so the label and the running total agree.
                    awardXp(XP_PER_DECISION);

                    //Clear the active choice view states
                    setRecommendation(null);

                    //Navigate the user back to the Home dashboard
                    navigation.goBack();
                  }
                }}
              >
                <Icon name="check" size={18} color={ON_ACCENT} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReroll}
                disabled={hasRerolled}
                style={[
                  styles.rerollBtn,
                  { backgroundColor: colors.chip, borderColor: colors.cardLine, opacity: hasRerolled ? 0.5 : 1 },
                  //If no alternatives are found
                  matchList.length <= 1 && !hasRerolled && {
                    borderWidth: 0,
                    backgroundColor: "transparent",
                    elevation: 0,
                    shadowOpacity: 0
                  }
                ]}
              >
                <Icon name="refresh-cw" size={16} color={matchList.length <= 1 && !hasRerolled ? colors.ink2 : colors.ink} />
                <Text style={[
                  styles.rerollBtnText,
                  { color: colors.ink },
                  // If there are no alternatives, slightly fade the text color
                    matchList.length <= 1 && !hasRerolled && { color: colors.ink2 }
                ]}
                  >
                    {matchList.length <= 1 && !hasRerolled ? "No Alternative" : "Reroll"}
                 </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // === VIEW 2: SHOW FILTERS MENU IF NO OPTION HAS BEEN SELECTED YET ===
  return (
    <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <AmbientBackground />
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color={colors.ink2} />
          <Text style={[styles.backText, { color: colors.ink2 }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.titleContainer}>
          <View style={[styles.iconPlaceholder, { backgroundColor: accent.tint }]}>
            <ModuleGlyph moduleKey="fuel" size={26} color={primaryColor} />
          </View>
          <View style={styles.titleText}>
            <Text style={[styles.h1, { color: colors.ink }]}>Fuel</Text>
            <Text style={[styles.subtitle, { color: colors.ink2 }]}>What should you eat?</Text>
          </View>
          <View style={[styles.levelPill, { backgroundColor: moduleDeep("fuel") }]}>
            <Text style={styles.levelPillText}>Lv {progress.level}</Text>
          </View>
        </View>

        <View style={[styles.toggleRowCard, { backgroundColor: colors.track }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, mealType === "in" && { backgroundColor: colors.cardSolid }]}
            onPress={() => setMealType("in")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, { color: mealType === "in" ? primaryColor : colors.ink }]}>
              Eat In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, mealType === "out" && { backgroundColor: colors.cardSolid }]}
            onPress={() => setMealType("out")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, { color: mealType === "out" ? primaryColor : colors.ink }]}>
              Eat Out
            </Text>
          </TouchableOpacity>
        </View>

        <FilterOptionGroup
          label="Budget"
          options={["$", "$$", "$$$"]}
          displayValues={[
            budgetRanges.low.label, 
            budgetRanges.medium.label, 
            budgetRanges.high.label
          ]}
          selectedValue={budget}
          onSelect={(val) => setBudget(val as "$" | "$$" | "$$$")}
          activeColor={primaryColor}
          activeTint={accent.tint}
        />

        <FilterOptionGroup
          label="Prep Time"
          options={["short", "medium", "long"]}
          displayValues={["< 15 min", "15-30 min", "30+ min"]}
          selectedValue={prepTime}
          onSelect={(val) => setPrepTime(val as "short" | "medium" | "long")}
          activeColor={primaryColor}
          activeTint={accent.tint}
        />

        {mealType === "out" && (
          <FilterOptionGroup
            label="Distance"
            options={["near", "mid", "far"]}
            displayValues={["< 1 km", "1-5 km", "5+ km"]}
            selectedValue={distance}
            onSelect={(val) => setDistance(val as "near" | "mid" | "far")}
            activeColor={primaryColor}
            activeTint={accent.tint}
          />
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
          onPress={handleGetRecommendation}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Decide for Me</Text>
        </TouchableOpacity>

        {recommendation === null && hasSearched && (
          <View style={styles.noResultContainer}>
            <Text style={[styles.noResultText, { color: colors.ink2 }]}>
              No exact match found in the pool. Try changing your filters!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingTop: HUD_CLEARANCE,
  },
  backRowResult: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: HUD_CLEARANCE,
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
  titleContainer: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], marginTop: T.spacing[2] },
  iconPlaceholder: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  titleText: { flex: 1 },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  levelPill: { borderRadius: T.radii.pill, paddingHorizontal: 11, paddingVertical: 5 },
  levelPillText: {
    // DM Mono has no bold weight loaded, so the pill uses the bold DM Sans face
    // for a genuinely bold label. White on the bright module fill is thin on its
    // own, so a soft dark shadow lifts it off the amber/green.
    fontFamily: T.font.bold,
    fontSize: T.fontSize.body,
    letterSpacing: 0.4,
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  toggleRowCard: { flexDirection: "row", padding: 6, borderRadius: 16, gap: 6 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  toggleBtnText: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  groupContainer: { gap: T.spacing[2] },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  groupSelectionDisplay: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  optionsRow: { flexDirection: "row", gap: T.spacing[3], width: "100%" },
  optionCard: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  optionText: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  actionButton: { borderRadius: 16, paddingVertical: 17, alignItems: "center", justifyContent: "center", marginTop: T.spacing[3], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 4 },
  actionButtonText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },

  // Result view
  resultBody: { flex: 1 },
  resultCenter: { flex: 1, justifyContent: "center", paddingHorizontal: T.spacing.pageX, paddingBottom: T.spacing[6] },
  headerContainer: { alignItems: "center", marginBottom: T.spacing[4] },
  contextSubtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginBottom: 6 },
  resultCardCustom: { width: "100%", padding: T.spacing[5], alignItems: "center", marginBottom: T.spacing[4] },
  avatarBadge: { width: 80, height: 80, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: T.spacing[4] },
  itemName: { fontFamily: T.font.bold, fontSize: T.fontSize.title, marginBottom: 4, textAlign: "center" },
  cuisineType: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginBottom: T.spacing[5] },
  statsRow: { flexDirection: "row", width: "100%", gap: T.spacing[3] },
  statChip: { flex: 1, alignItems: "center", gap: 3, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6 },
  statValue: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.subtitle },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption },
  actionRow: { flexDirection: "row", gap: T.spacing[4], width: "100%" },
  acceptBtn: { flex: 1, flexDirection: "row", gap: 8, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 4 },
  acceptBtnText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  rerollBtn: { flex: 1, flexDirection: "row", gap: 8, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  rerollBtnText: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  noResultContainer: { marginTop: T.spacing[2], padding: T.spacing[3], alignItems: "center" },
  noResultText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, textAlign: "center" },
});
