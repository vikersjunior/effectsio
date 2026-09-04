"use client";

export { GradientControl } from "./gradient-control";
export type { GradientControlProps, GradientControlMode } from "./gradient-control";
export {
  getGradientBackground,
  getGradientAngle,
  getGradientType,
  parseStopPosition,
  formatStopPosition,
  parseStopOpacity,
  normalizeStopOpacity,
  normalizeGradientAngle,
  sortStops,
} from "./gradient-control-utils";
