// Shared by the server (to validate custom icons) and the client (to render them).
// Keep this file free of React/DOM imports.

export const GLYPH_KEYS = [
  "dumbbell", "weight", "biceps-flexed", "bike", "footprints", "person-standing",
  "waves", "sailboat", "mountain", "tent", "compass", "wind",
  "flame", "zap", "heart", "heart-pulse", "activity", "gauge",
  "timer", "target", "goal", "flag", "trophy", "medal",
  "crown", "star", "rocket", "swords", "shield", "hand",
  "brain", "bone", "skull", "anvil", "volleyball", "trending-up",
  "sun", "moon", "snowflake", "droplets", "leaf", "apple",
  "music", "rabbit", "turtle", "bird",
] as const;
export type GlyphKey = (typeof GLYPH_KEYS)[number];

// A small palette of reds that all sit well on the dark theme.
export const SHADE_KEYS = ["ember", "crimson", "blush", "wine", "scarlet", "rose"] as const;
export type Shade = (typeof SHADE_KEYS)[number];

export const MAX_CUSTOM_TYPES = 40;
export const MAX_TYPE_NAME = 24;
