export type ControlOption = {
  label: string;
  value: string;
};

export type ControlChangeHistoryMode = "merge" | "record" | "skip";

export type ControlChangeMeta = {
  history?: ControlChangeHistoryMode;
  historyGroup?: string;
};

export type ControlValueChangeHandler<Value> = (
  value: Value,
  meta?: ControlChangeMeta,
) => void;

export type GradientType = "linear" | "radial" | "angular" | "diamond";

export type GradientStop = {
  color: string;
  opacity?: number;
  position: string;
};

let controlHistoryGroupIndex = 0;

export function createControlHistoryGroupId(scope: string): string {
  controlHistoryGroupIndex += 1;
  return `${scope}:${controlHistoryGroupIndex}`;
}
