import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Card";
import { T } from "@/theme/tokens";
import { MODULES } from "@/theme/modules";
import { FoodOption, FilterCriteria } from "@/services/recommendation/recommendationEngine";

type FuelResultRouteParams = {
  recommendation: FoodOption;
  criteria: FilterCriteria;
  
};

export function FuelResultScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: FuelResultRouteParams }, 'params'>>();
  const recommendation = route.params?.recommendation;
  const criteria = route.params?.criteria;
  const primaryColor = MODULES.fuel.c700;

  if (!recommendation || !criteria) {
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: T.fg2, fontFamily: T.font.regular }}>Finding a sweet option...</Text>
      </View>
    );
  }

  const filterCaption = `Based on your filters: ${
    criteria.type === "in" ? "Eat In" : "Eat Out"
  }, ${criteria.budget}, ${
    criteria.distance === "near" ? "< 1 km" : criteria.distance === "mid" ? "1-5 km" : "5+ km"
  }`;

  return (
    <SafeAreaView style={styles.frame} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        
        {/* Header Navigation */}
        <TouchableOpacity 
          style={styles.backButton} 
          activeOpacity={0.6}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={16} color={T.fg2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Title Labels */}
        <View style={styles.headerContainer}>
          <Text style={styles.contextSubtitle}>Your Fuel recommendation</Text>
          <Text style={styles.h1}>Here's what to eat</Text>
        </View>

        {/* Main Soft-Minimal Recommendation Card */}
        <Card style={styles.resultCard}>
          {/* Main Visual Badge (Placeholder icon frame) */}
          <View style={[styles.avatarBadge, { backgroundColor: MODULES.fuel.tint }]}>
            <Icon name="coffee" size={36} color={primaryColor} />
          </View>

          {/* Core Content */}
          <Text style={styles.itemName}>{recommendation.item_name}</Text>
          <Text style={styles.cuisineType}>
            {recommendation.type === "in" ? "Home-cooked Meal" : "Local Restaurant / Eatery"}
          </Text>

          {/* 3-Column Metrics Grid */}
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

        {/* Side-by-Side Action Button Control Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.acceptBtn, { backgroundColor: primaryColor }]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Home" as never)}
          >
            <Text style={styles.acceptBtnText}>Accept ✓</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.rerollBtn} 
            activeOpacity={0.7}
            onPress={() => navigation.goBack()} // Triggers return to re-pick
          >
            <Text style={styles.rerollBtnText}>Reroll ↺</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Subtext Context */}
        <Text style={styles.footerCaption}>{filterCaption}</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: T.canvas },
  content: {
    flex: 1,
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[4],
    alignItems: "center",
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  backButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    alignSelf: "flex-start",
    marginBottom: T.spacing[5] 
  },
  backText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2 },
  headerContainer: { alignItems: "center", marginBottom: T.spacing[5] },
  contextSubtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2, marginBottom: 4 },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  
  resultCard: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: 24,
    paddingVertical: T.spacing[5],
    paddingHorizontal: T.spacing[4],
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: T.spacing[5],
  },
  avatarBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: T.spacing[4],
  },
  itemName: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1, marginBottom: 4, textAlign: "center" },
  cuisineType: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2, marginBottom: T.spacing[5] },
  
  metricsRow: { flexDirection: "row", width: "100%", borderTopWidth: 1, borderColor: T.border, paddingTop: T.spacing[4] },
  metricColumn: { flex: 1, alignItems: "center", gap: 2 },
  metricValue: { fontFamily: T.font.bold, fontSize: T.fontSize.body, color: T.fg1 },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption, color: T.fg2 },
  
  actionRow: { flexDirection: "row", gap: T.spacing[4], width: "100%", marginBottom: T.spacing[4] },
  acceptBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  acceptBtnText: { color: T.surface, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  
  rerollBtn: { 
    flex: 1, 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border 
  },
  rerollBtnText: { color: T.fg1, fontFamily: T.font.bold, fontSize: T.fontSize.body },
  footerCaption: { 
    fontFamily: T.font.regular, 
    fontSize: T.fontSize.caption, 
    color: T.fg2, 
    textAlign: "center", 
    marginTop: T.spacing[3],
    opacity: 0.7,
},
});