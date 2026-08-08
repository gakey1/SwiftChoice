// The icon a Focus spot shows on its result card.
//
// The design gives every spot its own picture rather than one icon for the
// module, so a library and a park bench do not arrive looking identical even
// though both are silent. The design uses emoji for this; the brand rules keep
// emoji to the three module glyphs, so the same idea is done with the Feather
// set already used everywhere else in the app.
//
// The icon is stored on the spot rather than worked out from its vibe, because
// the two silent spots in the design have different pictures. Vibe cannot
// produce that, and guessing from the name would break the moment somebody
// names a spot something we did not anticipate.
//
// Everything goes through spotIcon() rather than being read straight off the
// row. A Feather name that does not exist renders nothing at all, silently, and
// that has already reached a merged screen once in this project.

import type { IconName } from "@/components/Icon";

// The names a spot may use. Deliberately short: a handful that cover the kinds
// of place people actually study, rather than the whole Feather set.
export const SPOT_ICONS = [
  "book-open",
  "book",
  "coffee",
  "home",
  "users",
  "briefcase",
  "monitor",
  "sun",
  "wind",
  "volume-x",
  "map-pin",
] as const;

export type SpotIcon = (typeof SPOT_ICONS)[number];

// Used when a spot has no icon, or one this build does not know. A pin says
// "a place" without claiming anything about it, which is the right thing to say
// when we do not know.
export const DEFAULT_SPOT_ICON: SpotIcon = "map-pin";

const ALLOWED = new Set<string>(SPOT_ICONS);

// Narrows whatever was stored to something that will actually draw.
export function spotIcon(stored: string | null | undefined): IconName {
  if (typeof stored === "string" && ALLOWED.has(stored)) {
    return stored as IconName;
  }

  return DEFAULT_SPOT_ICON;
}
