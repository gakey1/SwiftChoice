import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Card";
import { T } from "@/theme/tokens";
import { MODULES } from "@/theme/modules";
import { getRecommendation, FoodOption } from "@/services/recommendation/recommendationEngine";
import { useNavigation } from "@react-navigation/native";

type FilterGroupProps = {
  label: string;
  options: string[];
  displayValues?: string[]; 
  selectedValue: string;
  onSelect: (value: string) => void;
  activeColor: string;
};

function FilterOptionGroup({ label, options, displayValues, selectedValue, onSelect, activeColor }: FilterGroupProps) {
  return (
    <View style={styles.groupContainer}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupLabel}>{label}</Text>
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
              style={[styles.optionCard, isActive && { borderColor: activeColor, borderWidth: 1.5 }]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, isActive && { color: activeColor, fontFamily: T.font.bold }]}>
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
  const [mealType, setMealType] = useState<"in" | "out">("out");
  const [budget, setBudget] = useState<"$" | "$$" | "$$$">("$$");
  const [prepTime, setPrepTime] = useState<"short" | "medium" | "long">("medium");
  const [distance, setDistance] = useState<"near" | "mid" | "far">("mid");
  const [hasRerolled, setHasRerolled] = useState<boolean>(false);

  const [recommendation, setRecommendation] = useState<FoodOption | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchList, setMatchList] = useState<FoodOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const primaryColor = MODULES.fuel.c700;
  const navigation = useNavigation<any>();

//Mock history function
  const logDecisionToHistory = async (item: FoodOption) => {
    console.log("Logging decision via history layer:", item);
    return new Promise((resolve) => setTimeout(resolve, 500));
  };

  const handleGetRecommendation = () => {
    const randomizedList = getRecommendation({
      type: mealType,
      budget: budget,
      prepTime: prepTime,
      distance: distance,
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

  const handleReroll = () => {
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
    } 
  };

  // === VIEW 1: SHOW THE RESULT CARD MANUALLY IF MATCH IS FOUND ===
  if (recommendation) {
    return (
      <SafeAreaView style={styles.frame} edges={["top", "left", "right"]}>
        <View style={[styles.content, { justifyContent: "center" }]}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.contextSubtitle}>Your Fuel recommendation</Text>
            <Text style={styles.h1}>Here's what to eat</Text>
          </View>

          <Card style={styles.resultCardCustom}>
            <View style={[styles.avatarBadge, { backgroundColor: MODULES.fuel.tint }]}>
              <Icon name="coffee" size={36} color={primaryColor} />
            </View>

            <Text style={styles.itemName}>{recommendation.item_name}</Text>
            <Text style={styles.cuisineType}>
              {recommendation.type === "in" ? "Home-cooked Meal" : "Local Restaurant / Eatery"}
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricColumn}>
                <Text style={[styles.metricValue, { color: primaryColor }]}>{recommendation.budget_level}</Text>
                <Text style={styles.metricLabel}>Budget</Text>
              </View>
              
              <View style={styles.metricColumn}>
                <Text style={styles.metricValue}>
                  {recommendation.distance_range === "near" ? "1.2 km" : recommendation.distance_range === "mid" ? "3.5 km" : "6.0 km"}
                </Text>
                <Text style={styles.metricLabel}>Distance</Text>
              </View>

              <View style={styles.metricColumn}>
                <View style={styles.ratingContainer}>
                  <Text style={styles.metricValue}>{recommendation.rating}</Text>
                  <Icon name="star" size={14} color={primaryColor} />
                </View>
                <Text style={styles.metricLabel}>Rating</Text>
              </View>
            </View>
          </Card>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.acceptBtn, { backgroundColor: primaryColor }]} 
              activeOpacity={0.8}
              onPress={async () => {
                if (recommendation) {
                  //Log the choice via our mock history layer pipeline
                  await logDecisionToHistory(recommendation);
                  
                  //Clear the active choice view states
                  setRecommendation(null);
                  
                  //Navigate the user back to the Home dashboard
                  navigation.navigate("MainTabs", { screen: "home" }); 
                }
              }}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleReroll}
              disabled={hasRerolled}
              style={[styles.rerollBtn, { opacity: hasRerolled ? 0.5 : 1 }]}
            >
              <Text style={styles.rerollBtnText}>Reroll </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // === VIEW 2: SHOW FILTERS MENU IF NO OPTION HAS BEEN SELECTED YET ===
  return (
    <SafeAreaView style={styles.frame} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.titleContainer}>
          <View style={[styles.iconPlaceholder, { backgroundColor: MODULES.fuel.tint }]}>
            <Icon name="coffee" size={24} color={primaryColor} />
          </View>
          <View>
            <Text style={styles.h1}>Fuel</Text>
            <Text style={styles.subtitle}>What should you eat?</Text>
          </View>
        </View>

        <Card style={styles.toggleRowCard}>
          <TouchableOpacity 
            style={[styles.toggleBtn, mealType === "in" && styles.toggleBtnActive]} 
            onPress={() => setMealType("in")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, mealType === "in" && { color: primaryColor, fontFamily: T.font.bold }]}>
              Eat In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.toggleBtn, mealType === "out" && styles.toggleBtnActive]} 
            onPress={() => setMealType("out")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, mealType === "out" && { color: primaryColor, fontFamily: T.font.bold }]}>
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
            <Text style={styles.noResultText}>
              No exact match found in the pool. Try changing your filters!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: T.canvas },
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
  titleContainer: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], marginTop: T.spacing[2] },
  iconPlaceholder: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  toggleRowCard: { flexDirection: "row", padding: 6, backgroundColor: T.neutral, borderRadius: 16, borderWidth: 0 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  toggleBtnActive: { backgroundColor: T.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  toggleBtnText: { fontFamily: T.font.medium, fontSize: T.fontSize.body, color: T.fg2 },
  groupContainer: { gap: T.spacing[2] },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.body, color: T.fg1 },
  groupSelectionDisplay: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  optionsRow: { flexDirection: "row", gap: T.spacing[3], width: "100%" },
  optionCard: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  optionText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  actionButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center", marginTop: T.spacing[3], shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  actionButtonText: { color: T.surface, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  
  headerContainer: { alignItems: "center", marginBottom: T.spacing[2] },
  contextSubtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2, marginBottom: 4 },
  resultCardCustom: { width: "100%", backgroundColor: T.surface, borderRadius: 24, paddingVertical: T.spacing[5], paddingHorizontal: T.spacing[4], alignItems: "center", borderWidth: 1, borderColor: T.border, marginBottom: T.spacing[3] },
  avatarBadge: { width: 80, height: 80, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: T.spacing[4] },
  itemName: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1, marginBottom: 4, textAlign: "center" },
  cuisineType: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2, marginBottom: T.spacing[5] },
  metricsRow: { flexDirection: "row", width: "100%", borderTopWidth: 1, borderColor: T.border, paddingTop: T.spacing[4] },
  metricColumn: { flex: 1, alignItems: "center", gap: 2 },
  metricValue: { fontFamily: T.font.bold, fontSize: T.fontSize.body, color: T.fg1 },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption, color: T.fg2 },
  actionRow: { flexDirection: "row", gap: T.spacing[4], width: "100%" },
  acceptBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  acceptBtnText: { color: T.surface, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  rerollBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  rerollBtnText: { color: T.fg1, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  noResultContainer: { marginTop: T.spacing[2], padding: T.spacing[3], alignItems: "center" },
  noResultText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2, textAlign: "center" },
});