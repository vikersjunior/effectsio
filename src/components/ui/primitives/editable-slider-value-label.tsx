import * as React from "react";

const editableValueTextBaseClassName =
  "block h-full min-w-0 overflow-hidden whitespace-nowrap font-sans text-xs leading-5 tabular-nums";
const valueLabelContainerClassName = "inline-grid h-5 shrink-0";

export type EditableSliderValueLabelLayout = "content" | "reference";
export type EditableSliderValueLabelTextAlign = "left" | "right";

export type EditableSliderValueLabelProps = {
  ariaLabel: string;
  disabled?: boolean;
  layout?: EditableSliderValueLabelLayout;
  maxValueLabel?: string;
  onCommit?: (nextValue: string) => void;
  onStep?: (direction: -1 | 1, currentDraft: string) => string | undefined;
  textAlign?: EditableSliderValueLabelTextAlign;
  valueLabel: string;
};

function hasEditableNumericValueLabel(valueLabel: string): boolean {
  return /-?\d+(?:\.\d+)?/.test(valueLabel);
}

function getWidestValueLabel(valueLabel: string, maxValueLabel?: string): string {
  if (!maxValueLabel || valueLabel.length > maxValueLabel.length) {
    return valueLabel;
  }
  return maxValueLabel;
}

function getValueLabelContainerClassName(
  layout: EditableSliderValueLabelLayout,
  className = "",
): string {
  return [
    valueLabelContainerClassName,
    layout === "content" ? "w-fit justify-items-start" : "place-items-center",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function getEditableValueTextClassName({
  layout,
  textAlign,
}: {
  layout: EditableSliderValueLabelLayout;
  textAlign: EditableSliderValueLabelTextAlign;
}): string {
  return [
    editableValueTextBaseClassName,
    layout === "content" ? "w-auto" : "w-full",
    textAlign === "left" ? "text-left" : "text-right",
  ].join(" ");
}

function selectEditableText(node: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function EditableSliderValueLabel({
  ariaLabel,
  disabled = false,
  layout = "reference",
  maxValueLabel,
  onCommit,
  onStep,
  textAlign = "right",
  valueLabel,
}: EditableSliderValueLabelProps): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const editorRef = React.useRef<HTMLSpanElement>(null);
  const valueLabelRef = React.useRef(valueLabel);
  const isEditableValueLabel = hasEditableNumericValueLabel(valueLabel);
  const valueTextClassName = getEditableValueTextClassName({ layout, textAlign });
  const widestValueLabel = getWidestValueLabel(valueLabel, maxValueLabel);

  React.useEffect(() => {
    valueLabelRef.current = valueLabel;
  }, [valueLabel]);

  React.useEffect(() => {
    if (editing) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.textContent = valueLabelRef.current;
      editor.focus();
      selectEditableText(editor);
    }
  }, [editing]);

  if (disabled || !onCommit || !isEditableValueLabel) {
    const valueTextToneClassName = disabled
      ? "text-[color:color-mix(in_oklab,var(--foreground)_60%,transparent)] opacity-60"
      : "text-[color:var(--muted-foreground)]";

    return (
      <span className={getValueLabelContainerClassName(layout, "cursor-default")}>
        {layout === "reference" ? (
          <span
            aria-hidden="true"
            className={`invisible col-start-1 row-start-1 min-w-[4ch] pointer-events-none text-[color:var(--muted-foreground)] ${getEditableValueTextClassName(
              { layout: "reference", textAlign: "right" },
            )}`}
          >
            {widestValueLabel}
          </span>
        ) : null}
        <span
          className={`col-start-1 row-start-1 cursor-default ${valueTextToneClassName} ${valueTextClassName}`}
        >
          {valueLabel}
        </span>
      </span>
    );
  }

  function commitDraft(): void {
    onCommit?.(editorRef.current?.textContent ?? valueLabelRef.current);
    setEditing(false);
  }

  return (
    <span className={getValueLabelContainerClassName(layout)}>
      {layout === "reference" ? (
        <span
          aria-hidden="true"
          className={`invisible col-start-1 row-start-1 min-w-[4ch] pointer-events-none text-[color:var(--muted-foreground)] ${getEditableValueTextClassName(
            { layout: "reference", textAlign: "right" },
          )}`}
        >
          {widestValueLabel}
        </span>
      ) : null}
      {editing ? (
        <span
          aria-label={ariaLabel}
          className={`col-start-1 row-start-1 cursor-text p-0 text-[color:var(--foreground)] outline-none ${layout === "content" ? "justify-self-start" : ""} ${valueTextClassName}`}
          contentEditable
          onBlur={commitDraft}
          onFocus={(event) => selectEditableText(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              const nextValueLabel = onStep?.(
                event.key === "ArrowUp" ? 1 : -1,
                event.currentTarget.textContent ?? "",
              );
              if (typeof nextValueLabel === "string") {
                event.preventDefault();
                event.currentTarget.textContent = nextValueLabel;
                selectEditableText(event.currentTarget);
              }
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
          tabIndex={0}
        />
      ) : (
        <button
          aria-label={`Edit ${ariaLabel}`}
          className={`col-start-1 row-start-1 h-full min-w-0 appearance-none cursor-text border-0 bg-transparent p-0 transition-colors ${layout === "content" ? "w-auto justify-self-start" : "w-full"}`}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              setEditing(true);
            }
          }}
          type="button"
        >
          <span
            className={`cursor-text text-[color:var(--muted-foreground)] transition-colors duration-200 ease-out hover:text-[color:var(--foreground)] ${valueTextClassName}`}
          >
            {valueLabel}
          </span>
        </button>
      )}
    </span>
  );
}
