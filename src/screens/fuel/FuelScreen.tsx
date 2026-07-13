// Fuel module screen. It shows the meal filters (eat in or out, budget, prep
// time, and distance), asks the recommendation engine for matches, then shows
// one result card at a time with Accept and a single Reroll. Accept saves the
// choice to history and goes back home. Fuel uses the amber module colour, taken
// from the active theme; all colours follow the dark/light Arcade toggle.

import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Card";
import { T } from "@/theme/tokens";
import { moduleAccent } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
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
};

// One filter group: a label, the value currently chosen shown in the module
// colour, and a row of options to pick from. The chosen option is outlined.
function FilterOptionGroup({ label, options, displayValues, selectedValue, onSelect, activeColor }: FilterGroupProps) {
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

export function FuelScreen() {
  const { colors } = useTheme();
  const accent = moduleAccent(colors, "fuel");
  const [mealType, setMealType] = useState<"in" | "out">("out");
  const [budget, setBudget] = useState<"$" | "$$" | "$$$">("$$");
  const [prepTime, setPrepTime] = useState<"short" | "medium" | "long">("medium");
  const [distance, setDistance] = useState<"near" | "mid" | "far">("mid");
  const [hasRerolled, setHasRerolled] = useState<boolean>(false);

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
    return (
      <SafeAreaView style={[styles.frame, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
                <View style={[styles.content, { justifyContent: "center" }]}>

          <View style={styles.headerContainer}>
            <Text style={[styles.contextSubtitle, { color: colors.ink2 }]}>Your Fuel recommendation</Text>
            <Text style={[styles.h1, { color: colors.ink }]}>{"Here's what to eat"}</Text>
          </View>

          <Card style={[styles.resultCardCustom, { backgroundColor: colors.card, borderColor: colors.cardLine }]}>
            <View style={[styles.avatarBadge, { backgroundColor: accent.tint }]}>
              <Icon name="coffee" size={36} color={primaryColor} />
            </View>

            <Text style={[styles.itemName, { color: colors.ink }]}>{recommendation.item_name}</Text>
            <Text style={[styles.cuisineType, { color: colors.ink2 }]}>
              {recommendation.type === "in" ? "Home-cooked Meal" : "Local Restaurant / Eatery"}
            </Text>

            <View style={[styles.metricsRow, { borderColor: colors.cardLine }]}>
              <View style={styles.metricColumn}>
                <Text style={[styles.metricValue, { color: primaryColor }]}>{recommendation.budget_level}</Text>
                <Text style={[styles.metricLabel, { color: colors.ink2 }]}>Budget</Text>
              </View>

              <View style={styles.metricColumn}>
                <Text style={[styles.metricValue, { color: colors.ink }]}>
                  {recommendation.distance_range === "near" ? "1.2 km" : recommendation.distance_range === "mid" ? "3.5 km" : "6.0 km"}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.ink2 }]}>Distance</Text>
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

                  //Clear the active choice view states
                  setRecommendation(null);

                  //Navigate the user back to the Home dashboard
                  navigation.goBack();
                }
              }}
            >
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
      </SafeAreaView>
    );
  }

  // === VIEW 2: SHOW FILTERS MENU IF NO OPTION HAS BEEN SELECTED YET ===
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.titleContainer}>
          <View style={[styles.iconPlaceholder, { backgroundColor: accent.tint }]}>
            <Icon name="coffee" size={24} color={primaryColor} />
          </View>
          <View>
            <Text style={[styles.h1, { color: colors.ink }]}>Fuel</Text>
            <Text style={[styles.subtitle, { color: colors.ink2 }]}>What should you eat?</Text>
          </View>
        </View>

        <Card style={[styles.toggleRowCard, { backgroundColor: colors.chip }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, mealType === "in" && { backgroundColor: colors.card }]}
            onPress={() => setMealType("in")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, { color: mealType === "in" ? primaryColor : colors.ink2 }, mealType === "in" && { fontFamily: T.font.bold }]}>
              Eat In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, mealType === "out" && { backgroundColor: colors.card }]}
            onPress={() => setMealType("out")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, { color: mealType === "out" ? primaryColor : colors.ink2 }, mealType === "out" && { fontFamily: T.font.bold }]}>
              Eat Out
            </Text>
          </TouchableOpacity>
        </Card>

        <FilterOptionGroup
          label="Budget"
          options={["$", "$$", "$$$"]}
          selectedValue={budget}
          onSelect={(val) => setBudget(val as "$" | "$$" | "$$$")}
          activeColor={primaryColor}
        />

        <FilterOptionGroup
          label="Prep Time"
          options={["short", "medium", "long"]}
          displayValues={["< 15 min", "15-30 min", "30+ min"]}
          selectedValue={prepTime}
          onSelect={(val) => setPrepTime(val as "short" | "medium" | "long")}
          activeColor={primaryColor}
        />

        <FilterOptionGroup
          label="Distance"
          options={["near", "mid", "far"]}
          displayValues={["< 1 km", "1-5 km", "5+ km"]}
          selectedValue={distance}
          onSelect={(val) => setDistance(val as "near" | "mid" | "far")}
          activeColor={primaryColor}
        />

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: primaryColor }]}
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
  titleContainer: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], marginTop: T.spacing[2] },
  iconPlaceholder: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  toggleRowCard: { flexDirection: "row", padding: 6, borderRadius: 16, borderWidth: 0 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  toggleBtnText: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  groupContainer: { gap: T.spacing[2] },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  groupSelectionDisplay: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  optionsRow: { flexDirection: "row", gap: T.spacing[3], width: "100%" },
  optionCard: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  optionText: { fontFamily: T.font.regular, fontSize: T.fontSize.body },
  actionButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center", marginTop: T.spacing[3], shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  actionButtonText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.body },

  headerContainer: { alignItems: "center", marginBottom: T.spacing[2] },
  contextSubtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginBottom: 4 },
  resultCardCustom: { width: "100%", borderRadius: 24, paddingVertical: T.spacing[5], paddingHorizontal: T.spacing[4], alignItems: "center", borderWidth: 1, marginBottom: T.spacing[3] },
  avatarBadge: { width: 80, height: 80, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: T.spacing[4] },
  itemName: { fontFamily: T.font.bold, fontSize: T.fontSize.display, marginBottom: 4, textAlign: "center" },
  cuisineType: { fontFamily: T.font.regular, fontSize: T.fontSize.body, marginBottom: T.spacing[5] },
  metricsRow: { flexDirection: "row", width: "100%", borderTopWidth: 1, paddingTop: T.spacing[4] },
  metricColumn: { flex: 1, alignItems: "center", gap: 2 },
  metricValue: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption },
  actionRow: { flexDirection: "row", gap: T.spacing[4], width: "100%" },
  acceptBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  acceptBtnText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  rerollBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  rerollBtnText: { fontFamily: T.font.bold, fontSize: T.fontSize.body },
  noResultContainer: { marginTop: T.spacing[2], padding: T.spacing[3], alignItems: "center" },
  noResultText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, textAlign: "center" },
});
