import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Card";
import { T } from "@/theme/tokens";
import { MODULES } from "@/theme/modules";

type FilterGroupProps = {
  label: string;
  options: string[];
  displayValues?: string[]; 
  selectedValue: string;
  onSelect: (value: string) => void;
  activeColor: string;
};

function FilterOptionGroup({
  label,
  options,
  displayValues,
  selectedValue,
  onSelect,
  activeColor,
}: FilterGroupProps) {
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
              style={[
                styles.optionCard,
                isActive && { borderColor: activeColor, borderWidth: 1.5 },
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  isActive && { color: activeColor, fontFamily: T.font.bold },
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

export default function FuelScreen() {
  //State for the primary toggle selection
  const [mealType, setMealType] = useState<"in" | "out">("out");

  const [budget, setBudget] = useState<"$" | "$$" | "$$$">("$$");
  const [prepTime, setPrepTime] = useState<"short" | "medium" | "long">("medium");
  const [distance, setDistance] = useState<"near" | "mid" | "far">("mid");

  const primaryColor = MODULES.fuel?.c700 || "#D98A43";

  return (
    <SafeAreaView style={styles.frame} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity style={styles.backButton} activeOpacity={0.6}>
          <Icon name="chevron-left" size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <View style={[styles.iconPlaceholder, { backgroundColor: "#FDF3E7" }]}>
            <Icon name={"utensils" as any} size={24} color={primaryColor} />
          </View>
          <View>
            <Text style={styles.h1}>Fuel</Text>
            <Text style={styles.subtitle}>What should you eat?</Text>
          </View>
        </View>

        {/* Primary Toggle Row: Eat In vs Eat Out */}
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

        {/* Secondary Filter Groups: Budget, Prep Time, Distance */} 
        <FilterOptionGroup
          label="Budget"
          options={["$", "$$", "$$$"]}
          selectedValue={budget}
          onSelect={(val) => setBudget(val as any)}
          activeColor={primaryColor}
        />
        <FilterOptionGroup
          label="Prep Time"
          options={["short", "medium", "long"]}
          displayValues={["< 15 min", "15-30 min", "30+ min"]}
          selectedValue={prepTime}
          onSelect={(val) => setPrepTime(val as any)}
          activeColor={primaryColor}
        />
        <FilterOptionGroup
          label="Distance"
          options={["near", "mid", "far"]}
          displayValues={["< 1 km", "1-5 km", "5+ km"]}
          selectedValue={distance}
          onSelect={(val) => setDistance(val as any)}
          activeColor={primaryColor}
        />
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
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  backText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  titleContainer: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], marginTop: T.spacing[2] },
  iconPlaceholder: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  subtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  toggleRowCard: { 
    flexDirection: "row", 
    padding: 6, 
    backgroundColor: "#F4F3F0", 
    borderRadius: 16,
    borderWidth: 0
  },
  toggleBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: "center", 
    borderRadius: 12, 
},
  toggleBtnActive: { 
    backgroundColor: "#FFFFFF", 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2 
  },
  toggleBtnText: { fontFamily: T.font.medium, fontSize: T.fontSize.body, color: T.fg2 },
  groupContainer: { gap: T.spacing[2] },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupLabel: { fontFamily: T.font.bold, fontSize: T.fontSize.body, color: T.fg1 },
  groupSelectionDisplay: { fontFamily: T.font.medium, fontSize: T.fontSize.body },
  optionsRow: { flexDirection: "row", gap: T.spacing[3], width: "100%" },
  optionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE9E5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
});