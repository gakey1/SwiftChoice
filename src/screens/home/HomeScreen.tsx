// Home dashboard (US02). Based on Tracy's work in PR #5, reconciled with the
// navigation and colour rules: lives under screens/home, named export, teal on
// this universal surface (green stays on Focus screens), typed module prop.
//
// The weekly snapshot shows an empty-state until there is decision history to
// summarise. The live figures land with the dashboard story (US27) in Sprint 4.

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { ModuleIcon } from "@/components/ModuleIcon";
import type { AppStackParamList } from "@/navigation/types";
import { MODULES, type Module } from "@/theme/modules";
import { T } from "@/theme/tokens";

type ModuleRowCardProps = {
  title: string;
  subtitle: string;
  module: Module;
  onPress: () => void;
};

function ModuleRowCard({ title, subtitle, module, onPress }: ModuleRowCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.cardClickable}>
      <Card style={styles.cardRow}>
        <View style={styles.leftContent}>
          <ModuleIcon module={module} />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Icon name="chevron-right" />
      </Card>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <Text style={styles.h1}>SwiftChoice</Text>
        </View>

        <Text style={styles.greetingText}>
          Good morning! What decision can I help with today?
        </Text>

        <View style={styles.modulesWrapper}>
          <ModuleRowCard
            title="Fuel"
            subtitle="Decide what to eat"
            module={MODULES.fuel}
            onPress={() => {
              navigation.navigate("Fuel");
            }}
          />
          <ModuleRowCard
            title="Focus"
            subtitle="Find your ideal workspace"
            module={MODULES.focus}
            onPress={() => {
              // TODO: navigate to the Focus input screen (Sprint 2).
            }}
          />
          <ModuleRowCard
            title="Priority"
            subtitle="Know what to tackle first"
            module={MODULES.priority}
            onPress={() => {
              // TODO: navigate to the Priority input screen (Sprint 2).
            }}
          />
        </View>

        <Card style={styles.analyticsCard}>
          <Text style={styles.analyticsHeader}>THIS WEEK</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No decisions yet this week</Text>
            <Text style={styles.emptyBody}>
              Your weekly snapshot appears here once you start making decisions.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: T.canvas, width: "100%" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[5],
    paddingBottom: T.spacing[7],
    gap: T.spacing[4],
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[3],
    marginTop: T.spacing[2],
  },
  avatarContainer: {
    width: 42,
    height: 42,
    backgroundColor: T.teal,
    borderRadius: T.radii.logo,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontFamily: T.font.bold, color: T.tealOn, fontSize: T.fontSize.title },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display, color: T.fg1 },
  greetingText: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
    color: T.fg2,
    lineHeight: 24,
  },
  modulesWrapper: { gap: T.spacing[3] },
  cardClickable: { width: "100%" },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: T.spacing[3],
  },
  leftContent: { flexDirection: "row", alignItems: "center", gap: T.spacing[3] },
  textContainer: { justifyContent: "center" },
  cardTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.title, color: T.fg1 },
  cardSubtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginTop: 2,
  },
  analyticsCard: { padding: T.spacing[4], marginTop: T.spacing[2] },
  analyticsHeader: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.caption,
    color: T.fg2,
    letterSpacing: 1,
    marginBottom: T.spacing[3],
  },
  emptyState: { paddingVertical: T.spacing[2] },
  emptyTitle: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    color: T.fg1,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    lineHeight: 20,
  },
});
