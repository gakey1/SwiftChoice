// The home dashboard. It is the first screen after login and lists the three
// modules (Fuel, Focus, Priority) as cards to tap into, with a weekly snapshot
// underneath. It uses teal, the colour allowed on every shared screen.
//
// The snapshot shows an empty state until there is some decision history to
// summarise. The real weekly figures come later with the dashboard work.

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { ModuleIcon } from "@/components/ModuleIcon";
import type { AppStackParamList } from "@/navigation/types";
import { MODULES, type Module } from "@/theme/modules";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type ModuleRowCardProps = {
  title: string;
  subtitle: string;
  module: Module;
  onPress: () => void;
};

// One tappable module card: the module icon, its title and subtitle, and a
// chevron on the right. Tapping it opens that module's screen.
function ModuleRowCard({ title, subtitle, module, onPress }: ModuleRowCardProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.cardClickable}>
      <Card style={styles.cardRow}>
        <View style={styles.leftContent}>
          <ModuleIcon module={module} />
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.ink2 }]}>{subtitle}</Text>
          </View>
        </View>
        <Icon name="chevron-right" color={colors.ink3} />
      </Card>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { colors } = useTheme();
  return (
    <View style={[styles.frame, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.teal }]}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <Text style={[styles.h1, { color: colors.ink }]}>SwiftChoice</Text>
        </View>

        <Text style={[styles.greetingText, { color: colors.ink2 }]}>
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
              navigation.navigate("Focus");
            }}
          />
          <ModuleRowCard
            title="Priority"
            subtitle="Know what to tackle first"
            module={MODULES.priority}
            onPress={() => {
              // TODO: navigate to the Priority input screen.
            }}
          />
        </View>

        <Card style={styles.analyticsCard}>
          <Text style={[styles.analyticsHeader, { color: colors.ink3 }]}>THIS WEEK</Text>
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>No decisions yet this week</Text>
            <Text style={[styles.emptyBody, { color: colors.ink2 }]}>
              Your weekly snapshot appears here once you start making decisions.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: "100%" },
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
    borderRadius: T.radii.logo,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontFamily: T.font.bold, color: T.tealOn, fontSize: T.fontSize.title },
  h1: { fontFamily: T.font.bold, fontSize: T.fontSize.display },
  greetingText: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
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
  cardTitle: { fontFamily: T.font.bold, fontSize: T.fontSize.title },
  cardSubtitle: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    marginTop: 2,
  },
  analyticsCard: { padding: T.spacing[4], marginTop: T.spacing[2] },
  analyticsHeader: {
    fontFamily: T.font.mono,
    fontSize: T.fontSize.caption,
    letterSpacing: 1,
    marginBottom: T.spacing[3],
  },
  emptyState: { paddingVertical: T.spacing[2] },
  emptyTitle: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    lineHeight: 20,
  },
});
