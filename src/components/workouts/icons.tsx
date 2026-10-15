import type { ComponentType, ReactNode } from "react";
import {
  Anvil, Apple, Activity, Bike, Bird, BicepsFlexed, Bone, Brain, Compass, Crown, Droplets, Dumbbell as LDumbbell,
  Flag, Flame, Footprints, Gauge, Goal, Hand, Heart, HeartPulse, Leaf, Medal, Moon, Mountain, Music, PersonStanding,
  Rabbit, Rocket, Sailboat, Shield, Skull, Snowflake, Star, Sun, Swords, Target, Tent, Timer, TrendingUp, Trophy,
  Turtle, Volleyball, Waves, Weight, Wind, Zap,
} from "lucide-react";
import type { GlyphKey, Shade } from "../../lib/workout-glyphs";

export type IconComp = ComponentType<{ size?: number }>;
export type Category = "exercise" | "martial_arts" | "cardio" | "mobility";

/* ---------- the four built-in icons (hand-drawn, same look as before) ---------- */

function Svg({ size = 22, children }: { size?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CheckIcon: IconComp = ({ size }) => (
  <Svg size={size}>
    <path d="M5 12.5l4.5 4.5L19 7" strokeWidth="3" />
  </Svg>
);
const ExerciseIcon: IconComp = ({ size }) => (
  <Svg size={size}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Svg>
);
const MartialArtsIcon: IconComp = ({ size }) => (
  <Svg size={size}>
    <path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V7a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V11M7 11h9v4a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4z" />
  </Svg>
);
const CardioIcon: IconComp = ({ size }) => (
  <Svg size={size}>
    <path d="M2.5 12H7l2-5 4 10 2-5h6.5" />
  </Svg>
);
const MobilityIcon: IconComp = ({ size }) => (
  <Svg size={size}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v6M12 9l-5 3M12 9l5-3M12 13l-3 6M12 13l4 5" />
  </Svg>
);

/* ---------- symbol library for custom icons ---------- */

// Record<GlyphKey, …> makes TypeScript fail if a key in workout-glyphs.ts has no icon here.
export const GLYPHS: Record<GlyphKey, IconComp> = {
  dumbbell: LDumbbell, weight: Weight, "biceps-flexed": BicepsFlexed, bike: Bike, footprints: Footprints,
  "person-standing": PersonStanding, waves: Waves, sailboat: Sailboat, mountain: Mountain, tent: Tent,
  compass: Compass, wind: Wind, flame: Flame, zap: Zap, heart: Heart, "heart-pulse": HeartPulse,
  activity: Activity, gauge: Gauge, timer: Timer, target: Target, goal: Goal, flag: Flag, trophy: Trophy,
  medal: Medal, crown: Crown, star: Star, rocket: Rocket, swords: Swords, shield: Shield, hand: Hand,
  brain: Brain, bone: Bone, skull: Skull, anvil: Anvil, volleyball: Volleyball, "trending-up": TrendingUp,
  sun: Sun, moon: Moon, snowflake: Snowflake, droplets: Droplets, leaf: Leaf, apple: Apple, music: Music,
  rabbit: Rabbit, turtle: Turtle, bird: Bird,
};

/* ---------- unified "type" = what a placed workout looks like ---------- */

export type CustomType = { id: number; name: string; glyph: GlyphKey; shade: Shade };

export type TypeDef = {
  ref: string; // "c:exercise" (built-in) or "t:12" (custom) — what drag & drop carries
  name: string;
  Icon: IconComp;
  shade: Shade;
  builtin: boolean;
  id: number | null; // custom type id
};

export const BUILTIN: TypeDef[] = [
  { ref: "c:exercise", name: "Exercise", Icon: ExerciseIcon, shade: "ember", builtin: true, id: null },
  { ref: "c:martial_arts", name: "Martial arts", Icon: MartialArtsIcon, shade: "crimson", builtin: true, id: null },
  { ref: "c:cardio", name: "Cardio", Icon: CardioIcon, shade: "blush", builtin: true, id: null },
  { ref: "c:mobility", name: "Mobility", Icon: MobilityIcon, shade: "wine", builtin: true, id: null },
];

export const typeFromCustom = (t: CustomType): TypeDef => ({
  ref: `t:${t.id}`,
  name: t.name,
  Icon: GLYPHS[t.glyph] ?? ExerciseIcon,
  shade: t.shade,
  builtin: false,
  id: t.id,
});

// shown if an entry points at an icon we couldn't load
export const FALLBACK_TYPE: TypeDef = { ref: "?", name: "Workout", Icon: ExerciseIcon, shade: "wine", builtin: false, id: null };
