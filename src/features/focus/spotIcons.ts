// The icon a Focus spot shows on its result card. Stored on the spot rather
// than derived from its vibe, because two spots can share a vibe and still
// want different pictures.

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
// "a place" without claiming anything more, which is the right thing to say
// when we do not know.
export const DEFAULT_SPOT_ICON: SpotIcon = "map-pin";

// A Set rather than an array so the check below is a constant-time lookup
// instead of a scan on every card render.
const ALLOWED = new Set<string>(SPOT_ICONS);

// Every read goes through here rather than straight off the row, because an
// unknown Feather name renders nothing at all, silently. The IconName return
// type is what stops an unchecked string reaching the icon component.
export function spotIcon(stored: string | null | undefined): IconName {
  if (typeof stored === "string" && ALLOWED.has(stored)) {
    return stored as IconName;
  }

  return DEFAULT_SPOT_ICON;
}
