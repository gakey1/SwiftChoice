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

import React, { useCallback, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { DataNotice } from "@/components/DataNotice";
import { AmbientBackground } from "@/components/AmbientBackground";
import { GlassCard } from "@/components/GlassCard";
import { ModuleGlyph } from "@/components/ModuleGlyph";
import { HUD_CLEARANCE } from "@/components/XpHud";
import { T } from "@/theme/tokens";
import { moduleAccent, moduleDeep } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { useProgress } from "@/features/progress/ProgressProvider";
import { XP_PER_DECISION } from "@/features/progress/progress";
import {
  getRecommendation,
  LOCATION_REQUIRED,
  PLACES_KEY_MISSING,
} from "@/services/recommendation/recommendationEngine";
import {
  fetchAreaCoordinates,
  fetchAreaSuggestions,
  type AreaSuggestion,
} from "@/services/recommendation/googlePlaces";
import { GOOGLE_ATTRIBUTION } from "@/services/recommendation/googlePlaces";
import type { FoodOption } from "@/services/recommendation/recommendationEngine";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { AppStackParamList } from "@/navigation/types";
import { logDecision } from "@/features/history/historyStorage";
import { useDecisionStart } from "@/features/history/useDecisionStart";
import { loadPreferences } from "@/services/localdb/preferencesStorage";

// Dark ink sits on top of the bright accent fills (buttons), for contrast.
const ON_ACCENT = "#141026";

// A one-off identifier tying the keystrokes of a single area search to the
// choice that ends it. Google treats that group as one billable session, and
// bills only the final lookup, so reusing a token across searches or dropping
// it entirely turns free keystrokes into charged ones.
//
// It only has to be unique, not unguessable, but expo-crypto is already a
// dependency and costs nothing here. Math.random would do and would be the
// weaker habit to leave in the codebase.
function newSessionToken(): string {
  return Crypto.randomUUID();
}

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

// Turns a result into what the Distance chip shows. Metres under a kilometre,
// otherwise kilometres to one decimal. With no measurement it names the band
// instead of inventing a figure.
export function formatDistance(option: Pick<FoodOption, "distance_meters" | "distance_range">): string {
  const metres = option.distance_meters;

  if (metres !== undefined) {
    return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
  }

  return option.distance_range === "near" ? "Near" : option.distance_range === "mid" ? "Mid" : "Far";
}

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
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Start of this decision, for the Avg. saved figure on Home. Captured at
  // first render and deliberately not reset by a reroll.
  const decisionStartedAt = useDecisionStart();
  const { colors } = useTheme();
  const { progress, awardXp } = useProgress();
  const accent = moduleAccent(colors, "fuel");
  const [userTier, setUserTier] = useState<string | null>(null);

  const [mealType, setMealType] = useState<"in" | "out">("out");
  const [budget, setBudget] = useState<"$" | "$$" | "$$$">("$$");
  const [prepTime, setPrepTime] = useState<"short" | "medium" | "long">("medium");
  const [distance, setDistance] = useState<"near" | "mid" | "far">("mid");
  const [hasRerolled, setHasRerolled] = useState<boolean>(false);
  // Only used when the phone will not give a position. The user types where they
  // are rather than the app assuming a city they may be nowhere near.
  const [manualArea, setManualArea] = useState<string>("");
  const [needsArea, setNeedsArea] = useState<boolean>(false);
  const [isCheckingBudget, setIsCheckingBudget] = useState(true);

  // Re-loads the saved budget level every time the screen comes into focus, so
  // changing it in Settings shows here without restarting the app.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadBudgetPreference() {
        try {
          const savedTier = await loadPreferences();
          if (!active) return;

          // Check if the budget is missing, empty, or unconfigured ("None set")
          if (!savedTier.defaultBudget || savedTier.defaultBudget === "None set") {
            navigation.replace("BudgetSurvey");
            return;
          }

          setUserTier(savedTier.defaultBudget);
          if (savedTier.defaultBudget === 'budget') {
              setBudget('$');
          } else if (savedTier.defaultBudget === 'moderate') {
              setBudget('$$');
          } else if (savedTier.defaultBudget === 'premium') {
              setBudget('$$$');
          }

          // Only show the Fuel screen UI once we know a budget exists
          setIsCheckingBudget(false);
        } catch (error) {
          console.error("Failed to load user budget tier", error);
          setIsCheckingBudget(false);
        }
      }

      void loadBudgetPreference();

      return () => {
        active = false;
      };
    }, [navigation])
  );
  // Get the dynamic labels based on the tier
  const budgetRanges = getBudgetRanges(userTier);

  const [recommendation, setRecommendation] = useState<FoodOption | null>(null);
  // True when the app has no Places key at all. Kept apart from the ordinary
  // no-match state so the screen can name the real cause instead of pointing at
  // the filters, which is what somebody running a fresh copy would otherwise be
  // sent to check.
  const [keyMissing, setKeyMissing] = useState(false);
  // Areas offered while typing, and the coordinates of the one chosen.
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [areaPosition, setAreaPosition] = useState<
    { latitude: number; longitude: number } | null
  >(null);

  // Groups every keystroke and the final choice into one billable session.
  // Held in a ref rather than state because changing it must not re-render, and
  // it has to survive between the typing and the choice. Cleared after a choice
  // so the next search starts a fresh session.
  const areaSessionToken = useRef<string | null>(null);
  // Cancels an in-flight suggestion lookup when another keystroke lands, so a
  // slow earlier response cannot overwrite a newer list.
  const suggestionSeq = useRef(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchList, setMatchList] = useState<FoodOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const primaryColor = accent.color;

  // Runs on every keystroke in the area box. Asks Google for matching areas and
  // shows them, so the user picks a real place instead of typing a name we then
  // have to interpret.
  //
  // Typing again after choosing clears the chosen coordinates, otherwise the
  // search would run against a place the box no longer shows.
  const handleAreaTyped = (text: string) => {
    setManualArea(text);
    setAreaPosition(null);

    const trimmed = text.trim();
    // Two characters is enough to be worth asking about and short enough not to
    // fire on a single stray keypress.
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    if (!areaSessionToken.current) {
      areaSessionToken.current = newSessionToken();
    }

    const seq = suggestionSeq.current + 1;
    suggestionSeq.current = seq;

    void (async () => {
      try {
        const results = await fetchAreaSuggestions(trimmed, areaSessionToken.current as string);
        // A slower earlier request must not replace a newer list.
        if (suggestionSeq.current === seq) {
          setSuggestions(results);
        }
      } catch {
        // Suggestions are a convenience. If they fail, the typed area still
        // works through the text search, so this stays quiet rather than
        // putting an error in front of somebody who can still get a result.
        if (suggestionSeq.current === seq) {
          setSuggestions([]);
        }
      }
    })();
  };

  // Runs when an area is chosen from the list. Resolves it to coordinates and
  // searches immediately, since choosing is the whole answer to the question
  // the screen asked.
  //
  // This call is also what closes the billing session: the typing requests are
  // only free because one of these follows them.
  const handleAreaChosen = async (suggestion: AreaSuggestion) => {
    setManualArea(suggestion.label);
    setSuggestions([]);
    suggestionSeq.current += 1;

    try {
      const position = await fetchAreaCoordinates(
        suggestion.placeId,
        areaSessionToken.current ?? newSessionToken()
      );
      setAreaPosition(position);
      await runSearch(position);
    } catch {
      // Could not resolve it. The label is still in the box, so the text search
      // remains available rather than the choice being a dead end.
      setAreaPosition(null);
    } finally {
      // One session ends here whether or not it worked, so the next search is
      // billed as its own.
      areaSessionToken.current = null;
    }
  };

  // Runs when "Decide for Me" is pressed.
  const handleGetRecommendation = async () => {
    await runSearch(areaPosition);
  };

  // Asks the engine for matches, keeps the whole list so a reroll can show the
  // next one, and shows the first result.
  //
  // Takes the area position as an argument rather than reading state, because
  // choosing from the list searches straight away and a state update is not
  // visible to the same tick.
  const runSearch = async (chosenArea: { latitude: number; longitude: number } | null) => {
    setHasSearched(false);

    const result = await getRecommendation({
      type: mealType,
      budget: budget,
      prepTime: prepTime,
      distance: mealType === "in" ? undefined : distance,
      manualArea: manualArea.trim() === "" ? undefined : manualArea.trim(),
      areaLatitude: chosenArea?.latitude,
      areaLongitude: chosenArea?.longitude,
    });

    // No key configured, so no search was ever made. Say that, rather than
    // reporting an empty result the filters cannot fix.
    if (result === PLACES_KEY_MISSING) {
      setKeyMissing(true);
      setNeedsArea(false);
      setMatchList([]);
      setRecommendation(null);
      setHasSearched(true);
      return;
    }

    setKeyMissing(false);

    // The phone gave no position and nothing was typed. Ask where they are
    // instead of guessing, then stop here until they answer.
    if (result === LOCATION_REQUIRED) {
      setNeedsArea(true);
      setMatchList([]);
      setRecommendation(null);
      setHasSearched(false);
      return;
    }

    setNeedsArea(false);
    const randomizedList = result;

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

  if (isCheckingBudget) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AmbientBackground />
      </View>
    );
  }

  // === VIEW 1: SHOW THE RESULT CARD MANUALLY IF MATCH IS FOUND ===
  if (recommendation) {
    // The measured distance from where the search ran, when we have it. Live
    // Eat Out results carry a real figure. Anything else falls back to the band
    // the user picked, as a word rather than an invented number, because a
    // precise-looking distance we never measured is a made-up fact.
    const distanceText = formatDistance(recommendation);
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
                {recommendation.type === "in" ? (
                  <>
                  <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                      <Text style={[styles.statValue, { color: primaryColor }]}>{recommendation.budget_level}</Text>
                      <Text style={[styles.statLabel, { color: colors.ink2 }]}>Budget</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                      <Text style={[styles.statValue, { color: colors.ink }]}>15 min</Text>
                      <Text style={[styles.statLabel, { color: colors.ink2 }]}>Prep</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                      <Text style={[styles.statValue, { color: colors.ink }]}>Easy</Text>
                      <Text style={[styles.statLabel, { color: colors.ink2 }]}>Effort</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                      <Text style={[styles.statValue, { color: primaryColor }]}>{recommendation.budget_level}</Text>
                      <Text style={[styles.statLabel, { color: colors.ink2 }]}>Budget</Text>
                    </View>

                  <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                    <Text style={[styles.statValue, { color: colors.ink }]}>{distanceText}</Text>
                    <Text style={[styles.statLabel, { color: colors.ink2 }]}>Distance</Text>
                  </View>

                  {/* Google holds no rating for some real places. Show nothing
                    rather than a zero or an invented score. */}
                  {recommendation.rating !== "" && (
                    <View style={[styles.statChip, { backgroundColor: colors.chip }]}>
                      <View style={styles.ratingContainer}>
                        <Text style={[styles.statValue, { color: colors.ink }]}>{recommendation.rating}</Text>
                        <Icon name="star" size={13} color={primaryColor} />
                      </View>
                      <Text style={[styles.statLabel, { color: colors.ink2 }]}>Rating</Text>
                    </View>
                  )}
                  </>
                )}
              </View>

              {/* The street address, live Eat Out results only. A distance says
                  how far but not which way, so this is what makes the result
                  something you can act on. Straight from Google rather than
                  assembled here, and absent for the places Google holds no
                  address for, since a partial address is worse than none. */}
              {recommendation.address !== undefined && (
                <View style={styles.addressRow}>
                  <Icon name="map-pin" size={13} color={colors.ink2} />
                  <Text style={[styles.addressText, { color: colors.ink2 }]}>
                    {recommendation.address}
                  </Text>
                </View>
              )}

              {/* Google requires visible credit wherever their place data is
                  shown outside a map. Eat Out results come from them; Eat In
                  comes from our own pool, so it does not apply there. */}
              {/* Location was unavailable, so this searched a default city
                  centre rather than where the user actually is. Say so plainly:
                  a distance shown next to places in another state would be a
                  wrong answer presented confidently. */}
              {recommendation.searched_area !== undefined && (
                <Text style={[styles.locationNotice, { color: colors.ink2 }]}>
                  Places in {recommendation.searched_area}, not based on your location.
                </Text>
              )}

              {recommendation.type === "out" && (
                <Text style={[styles.attribution, { color: colors.ink2 }]}>{GOOGLE_ATTRIBUTION}</Text>
              )}
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
                      startedAt: decisionStartedAt,
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

            {/* US34. Sits under Accept rather than after it, so it is read
                before the copy is made and not as an announcement afterwards. */}
            <DataNotice>
              Accepting saves this to your history and copies it to your account, so it is there
              when you sign in again.
            </DataNotice>
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

        {/* US34. Only on Eat Out, because Eat In never leaves the phone, and a
            notice shown where nothing is collected teaches people the notices
            mean nothing. */}
        {mealType === "out" && (
          <DataNotice>
            Eat Out sends your location, or the area you type, to Google to find places near you.
            Nothing identifying you goes with it.
          </DataNotice>
        )}

        {/* The phone would not give a position, so ask where they are rather
            than assuming a city. Only appears when location actually fails, so
            seeing it often means the location permission needs looking at. */}
        {needsArea && (
          <View style={styles.noResultContainer}>
            <Text style={[styles.noResultText, { color: colors.ink }]}>
              We could not get your location. Type where you are and we will look there.
            </Text>
            <TextInput
              value={manualArea}
              onChangeText={handleAreaTyped}
              placeholder="Start typing a suburb, for example Belgrave"
              placeholderTextColor={colors.ink2}
              style={[
                styles.areaInput,
                { color: colors.ink, borderColor: colors.cardLine, backgroundColor: colors.chip },
              ]}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleGetRecommendation}
              testID="fuel-area-input"
            />

            {/* Choosing from the list is what makes this exact. It settles which
                Belgrave was meant, and hands back coordinates so the search runs
                on a real centre and radius instead of a loose text match. */}
            {suggestions.length > 0 && (
              <View
                style={[styles.suggestionList, { borderColor: colors.cardLine }]}
                testID="fuel-area-suggestions"
              >
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.placeId}
                    style={[styles.suggestionRow, { borderBottomColor: colors.cardLine }]}
                    onPress={() => void handleAreaChosen(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestionText, { color: colors.ink }]}>
                      {suggestion.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.areaButton, { backgroundColor: primaryColor }]}
              onPress={handleGetRecommendation}
              activeOpacity={0.8}
              disabled={manualArea.trim() === ""}
            >
              <Text style={[styles.areaButtonText, { color: ON_ACCENT }]}>Search this area</Text>
            </TouchableOpacity>
          </View>
        )}

        {keyMissing && (
          <View style={styles.noResultContainer} testID="fuel-key-missing">
            <Text style={[styles.noResultText, { color: colors.ink }]}>
              Live search is not set up on this device.
            </Text>
            <Text style={[styles.noResultText, { color: colors.ink2 }]}>
              Eat Out needs a Google Places key to find real places nearby. Copy
              .env.example to .env, add EXPO_PUBLIC_GOOGLE_PLACES_KEY, then
              restart the dev server. The README has the steps.
            </Text>
          </View>
        )}

        {recommendation === null && hasSearched && !needsArea && !keyMissing && (
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
  attribution: { fontSize: 11, marginTop: 10, textAlign: "center" },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: T.spacing[3],
  },
  addressText: {
    flex: 1,
    fontFamily: T.font.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  locationNotice: { fontSize: 12, marginTop: 12, textAlign: "center", lineHeight: 17 },
  areaInput: { width: "100%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, fontSize: 15 },
  suggestionList: { width: "100%", borderWidth: 1, borderRadius: 12, marginTop: 8, overflow: "hidden" },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionText: { fontFamily: T.font.regular, fontSize: 15 },
  areaButton: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12, alignSelf: "stretch", alignItems: "center" },
  areaButtonText: { fontSize: 15, fontWeight: "700" },
  statLabel: { fontFamily: T.font.regular, fontSize: T.fontSize.caption },
  actionRow: { flexDirection: "row", gap: T.spacing[4], width: "100%" },
  acceptBtn: { flex: 1, flexDirection: "row", gap: 8, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 4 },
  acceptBtnText: { color: ON_ACCENT, fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  rerollBtn: { flex: 1, flexDirection: "row", gap: 8, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  rerollBtnText: { fontFamily: T.font.bold, fontSize: T.fontSize.subtitle },
  noResultContainer: { marginTop: T.spacing[2], padding: T.spacing[3], alignItems: "center" },
  noResultText: { fontFamily: T.font.regular, fontSize: T.fontSize.body, textAlign: "center" },
});
