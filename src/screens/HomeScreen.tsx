import React from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";

import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { ModuleIcon } from "@/components/ModuleIcon";
import { MODULES } from "@/theme/modules";
import { T } from "@/theme/tokens";

interface ModuleRowCardProps {
  title: string;
  subtitle: string;
  moduleData: any;
  onPress: () => void;
}

const ModuleRowCard: React.FC<ModuleRowCardProps> = ({ title, subtitle, moduleData, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.cardClickable}>
    <Card style={styles.cardRow}>
      <View style={styles.leftContent}>
        <ModuleIcon module={moduleData} />
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Icon name="chevron-right" />
    </Card>
  </TouchableOpacity>
);

export default function HomeScreen() {
  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Header Area */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <Text style={styles.h1}>SwiftChoice</Text>
        </View>

        <Text style={styles.greetingText}>
          Good morning! What decision can I help with today?
        </Text>

        {/* Feature Interactive Module Options */}
        <View style={styles.modulesWrapper}>
          <ModuleRowCard
            title="Fuel"
            subtitle="Decide what to eat"
            moduleData={MODULES.fuel}
            onPress={() => console.log("Fuel pressed")}
          />

          <ModuleRowCard
            title="Focus"
            subtitle="Find your ideal workspace"
            moduleData={MODULES.focus}
            onPress={() => console.log("Focus pressed")}
          />

          <ModuleRowCard
            title="Priority"
            subtitle="Know what to tackle first"
            moduleData={MODULES.priority}
            onPress={() => console.log("Priority pressed")}
          />
        </View>

        {/* Weekly Insights Dashboard Section */}
        <Card style={styles.analyticsCard}>
          <Text style={styles.analyticsHeader}>THIS WEEK</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: MODULES.focus?.c700 || "#3A8E7D" }]}>12</Text>
              <Text style={styles.statLabel}>Decisions</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: MODULES.focus?.c700 || "#3A8E7D" }]}>3min</Text>
              <Text style={styles.statLabel}>Avg. saved</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: MODULES.focus?.c700 || "#3A8E7D" }]}>18%</Text>
              <Text style={styles.statLabel}>Reroll rate</Text>
            </View>
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { 
    flex: 1, 
    backgroundColor: T.canvas,
    width: "100%",
  },
  scroll: { 
    flex: 1,
  },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[5],
    paddingBottom: 130, 
    gap: T.spacing[4],
    width: "100%",
    maxWidth: 600, 
    alignSelf: "center",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: T.spacing[3], marginTop: T.spacing[2] },
  avatarContainer: {
    width: 42,
    height: 42,
    backgroundColor: MODULES.focus?.c700 || "#529786",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontFamily: T.font.bold, color: "#FFF", fontSize: T.fontSize.title },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1, letterSpacing: -0.6 },
  greetingText: { fontFamily: T.font.regular, fontSize: T.fontSize.subtitle, color: T.fg2, lineHeight: 24 },
  modulesWrapper: { gap: T.spacing[3] },
  cardClickable: { width: "100%" },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: T.spacing[3] },
  leftContent: { flexDirection: "row", alignItems: "center", gap: T.spacing[3] },
  textContainer: { justifyContent: "center" },
  cardTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.title, color: T.fg1 },
  cardSubtitle: { fontFamily: T.font.regular, fontSize: T.fontSize.body, color: T.fg2, marginTop: 2 },
  analyticsCard: { padding: T.spacing[4], marginTop: T.spacing[2] },
  analyticsHeader: { fontFamily: T.font.bold, fontSize: T.fontSize.body - 2, color: T.fg2, letterSpacing: 1, marginBottom: T.spacing[3] },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statCol: { alignItems: "center", flex: 1 },
  statValue: { fontFamily: T.font.bold, fontSize: T.fontSize.display, marginBottom: 4 },
  statLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.body - 1, color: T.fg2 },
});