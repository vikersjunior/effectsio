/**
 * Canonical EffectsIO Icon Sizing System
 *
 * Rules:
 * 1. Icons performing the same semantic role at the same UI scale must use the same canonical size.
 * 2. Hit areas (button bounds) are decoupled from icon glyph sizes (e.g., 24px button houses a 16px icon).
 * 3. Figma specifications remain authoritative when an intentional design variant is designated.
 * 4. Reuse canonical sizes rather than introducing ad-hoc pixel values.
 */

export const ICON_SIZES = {
  /** Micro actions: inline clear buttons, badge actions, thumbnail badges (11px) */
  micro: 11,
  /** Compact accessory: inline input accessories, help indicators, tags (12px) */
  xs: 12,
  /** Compact accessory: search inputs, subtle icons (13px) */
  compact: 13,
  /** Inline controls: select carets, modal close buttons, input groups, small dropdown triggers (14px) */
  sm: 14,
  /** Standard shell & panel actions: section headers (+/-), floating panel actions (close, reset, reverse), row actions (eye, reorder, remove) (16px) */
  md: 16,
  /** Canvas viewport dock controls: hand, zoom, compare, undo, redo, magic wand (18px) */
  lg: 18,
  /** Feature empty states / prominent modal iconography (20-24px) */
  xl: 20,
  hero: 24,
} as const;

export type IconSizeName = keyof typeof ICON_SIZES;
