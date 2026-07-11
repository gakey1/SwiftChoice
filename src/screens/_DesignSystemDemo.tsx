// Demo screen - used to confirm every ported primitive renders correctly on
// both platforms. Not part of any real navigation flow; wired temporarily into
// App.tsx and removed once the real screens land.

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import type { BottomNavKey } from "@/components/BottomNav";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { ModuleIcon } from "@/components/ModuleIcon";
import { OptionGroup } from "@/components/OptionGroup";
import { SectionLabel } from "@/components/SectionLabel";
import { MODULES } from "@/theme/modules";
import { T } from "@/theme/tokens";

type Budget = "$" | "$$" | "$$$";
const BUDGET_OPTIONS: readonly Budget[] = ["$", "$$", "$$$"] as const;

export function DesignSystemDemo() {
  const [nav, setNav] = useState<BottomNavKey>("home");
  const [budget, setBudget] = useState<Budget>("$$");

  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Design system</Text>
        <Text style={styles.h2}>Eight components, one demo.</Text>

        <SectionLabel style={styles.section}>Module icons</SectionLabel>
        <View style={styles.row}>
          <ModuleIcon module={MODULES.fuel} />
          <ModuleIcon module={MODULES.focus} />
          <ModuleIcon module={MODULES.priority} />
        </View>

        <SectionLabel style={styles.section}>Card with image</SectionLabel>
        <Card>
          <ImagePlaceholder tone="warm" height={140} />
          <Text style={styles.cardTitle}>Veggie stir-fry</Text>
          <Text style={styles.cardSub}>Based on: Eat In, $$, under 20 min</Text>
        </Card>

        <SectionLabel style={styles.section}>Button variants</SectionLabel>
        <View style={styles.col}>
          <Button variant="accept" onPress={() => undefined}>
            Accept
          </Button>
          <Button variant="reroll" onPress={() => undefined} sub="(1 remaining)">
            Reroll
          </Button>
          <Button
            variant="module"
            color={MODULES.fuel.color}
            c700={MODULES.fuel.c700}
            onPress={() => undefined}
          >
            Find my meal
          </Button>
          <Button variant="outline" color={MODULES.focus.color} onPress={() => undefined}>
            Add spot
          </Button>
        </View>

        <SectionLabel style={styles.section}>Option group (Fuel-scoped)</SectionLabel>
        <OptionGroup
          label="Budget"
          options={BUDGET_OPTIONS}
          value={budget}
          onChange={setBudget}
          module={MODULES.fuel}
        />

        <SectionLabel style={styles.section}>Icon sampler</SectionLabel>
        <View style={styles.row}>
          <Icon name="home" />
          <Icon name="clock" />
          <Icon name="settings" />
          <Icon name="image" />
          <Icon name="arrow-left" />
          <Icon name="chevron-right" />
          <Icon name="plus" />
          <Icon name="star" />
        </View>

        <View style={{ height: T.spacing[6] }} />
      </ScrollView>

      <BottomNav active={nav} onNavigate={setNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: T.spacing.pageX,
    paddingTop: T.spacing[6],
    paddingBottom: T.spacing[5],
    gap: T.spacing[2],
  },
  h1: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.display,
    color: T.fg1,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.subtitle,
    color: T.fg2,
    marginBottom: T.spacing[4],
  },
  section: {
    marginTop: T.spacing[5],
  },
  row: {
    flexDirection: "row",
    gap: T.spacing[3],
    alignItems: "center",
    flexWrap: "wrap",
  },
  col: {
    flexDirection: "column",
    gap: T.spacing[3],
  },
  cardTitle: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.title,
    color: T.fg1,
    marginTop: T.spacing[3],
  },
  cardSub: {
    fontFamily: T.font.regular,
    fontSize: T.fontSize.body,
    color: T.fg2,
    marginTop: T.spacing[1],
  },
});
