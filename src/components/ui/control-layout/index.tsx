import * as React from "react";
import { CaretDownIcon, CaretUpIcon, QuestionIcon } from "@phosphor-icons/react";
import { Button } from "../primitives/button";
import { FieldLabel } from "../primitives/field";
import { ScrollFade } from "../primitives/scroll-fade";
import { Tooltip, TooltipContent, TooltipTrigger } from "../primitives/tooltip";
import { cn } from "../lib/utils";

type ControlFieldLabelActionContextValue = {
  action: React.ReactNode;
  label: string;
};

type ControlFieldLabelHelpContextValue = {
  help: string;
  label: string;
};

const ControlFieldLabelActionContext =
  React.createContext<ControlFieldLabelActionContextValue | null>(null);
const ControlFieldLabelHelpContext =
  React.createContext<ControlFieldLabelHelpContextValue | null>(null);

export const panelSectionSurfaceClassName = [
  "flex flex-col pt-2 pb-6 first:border-t-0 data-[section-actions]:first:border-t",
  "border-t border-[color:color-mix(in_oklab,var(--border)_8%,transparent)]",
  "transition-colors duration-150 ease-out hover:bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)]",
].join(" ");

export function ControlSection({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  return (
    <section
      {...props}
      className={cn(
        panelSectionSurfaceClassName,
        "group/control-section gap-[14px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ControlList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-[14px]", className)}
      data-control-list=""
    >
      {children}
    </div>
  );
}

export function ControlInlineGroup({
  children,
  className,
  columns = 2,
  kind = "default",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  columns?: number;
  kind?: "default" | "slider" | "toggleParameter";
}): React.JSX.Element {
  const gridTemplateColumns = `repeat(${Math.max(
    1,
    Math.floor(columns),
  )}, minmax(0, 1fr))`;

  return (
    <div
      {...props}
      className={cn(
        "grid min-w-0",
        kind === "slider" ? "gap-4" : "gap-x-2.5 gap-y-2",
        kind === "toggleParameter" && "items-end",
        className,
      )}
      data-control-layout="inline"
      data-control-layout-columns={columns}
      data-control-layout-group=""
      data-control-layout-kind={kind}
      style={{
        ...style,
        gridTemplateColumns,
      }}
    >
      {children}
    </div>
  );
}

export function ControlSectionHeader({
  action,
  collapsed = false,
  collapsible = false,
  children,
  onCollapsedChange,
}: {
  action?: React.ReactNode;
  collapsed?: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
}): React.JSX.Element {
  const titleText = typeof children === "string" ? children : "section";
  const collapseLabel = collapsed
    ? `Expand ${titleText} section`
    : `Collapse ${titleText} section`;

  const toggleCollapsed = React.useCallback(() => {
    if (!collapsible) return;
    onCollapsedChange?.(!collapsed);
  }, [collapsed, collapsible, onCollapsedChange]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!collapsible || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    toggleCollapsed();
  }

  function stopHeaderToggle(event: React.SyntheticEvent): void {
    event.stopPropagation();
  }

  return (
    <div
      aria-expanded={collapsible ? !collapsed : undefined}
      aria-label={collapsible ? collapseLabel : undefined}
      className={cn(
        "flex h-9 min-w-0 items-center justify-between gap-2 px-3",
        collapsible && "cursor-pointer select-none",
      )}
      data-collapsed={collapsible ? String(collapsed) : undefined}
      data-collapsible={collapsible ? "" : undefined}
      data-slot="control-section-header"
      onClick={collapsible ? toggleCollapsed : undefined}
      onKeyDown={handleKeyDown}
      role={collapsible ? "button" : undefined}
      tabIndex={collapsible ? 0 : undefined}
    >
      <div className="flex min-w-0 items-center gap-1 has-data-[icon-active=true]:[&_[data-slot=panel-title]]:text-[color:var(--link)]">
        {children}
      </div>
      {action || collapsible ? (
        <div
          className="inline-flex shrink-0 items-center gap-1"
          onClick={stopHeaderToggle}
          onKeyDown={stopHeaderToggle}
          onPointerDown={stopHeaderToggle}
        >
          {action}
          {collapsible ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-expanded={!collapsed}
                    aria-label={collapseLabel}
                    data-control-section-collapse-button=""
                    onClick={toggleCollapsed}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    {collapsed ? <CaretDownIcon size={14} /> : <CaretUpIcon size={14} />}
                  </Button>
                }
              />
              <TooltipContent side="top">{collapseLabel}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ControlItem({
  allowCompoundDividers = false,
  children,
  compoundDividerPlacement = "both",
  flush = false,
}: {
  allowCompoundDividers?: boolean;
  children: React.ReactNode;
  compoundDividerPlacement?: "both" | "bottom" | "top";
  flush?: boolean;
}): React.JSX.Element {
  const showCompoundTopDivider =
    compoundDividerPlacement === "both" || compoundDividerPlacement === "top";
  const showCompoundBottomDivider =
    compoundDividerPlacement === "both" || compoundDividerPlacement === "bottom";

  return (
    <div
      className={cn(
        "min-w-0",
        !flush && "px-3",
        allowCompoundDividers &&
          showCompoundBottomDivider &&
          "has-data-[control-section-divider=compound]:relative has-data-[control-section-divider=compound]:pb-[18px] has-data-[control-section-divider=compound]:after:absolute has-data-[control-section-divider=compound]:after:bottom-0 has-data-[control-section-divider=compound]:after:h-px has-data-[control-section-divider=compound]:after:bg-[color:color-mix(in_oklab,var(--border)_8%,transparent)]",
        allowCompoundDividers &&
          showCompoundTopDivider &&
          "has-data-[control-section-divider=compound]:pt-[18px] has-data-[control-section-divider=compound]:before:absolute has-data-[control-section-divider=compound]:before:top-0 has-data-[control-section-divider=compound]:before:h-px has-data-[control-section-divider=compound]:before:bg-[color:color-mix(in_oklab,var(--border)_8%,transparent)]",
        allowCompoundDividers &&
          showCompoundBottomDivider &&
          (flush
            ? "has-data-[control-section-divider=compound]:after:inset-x-0"
            : "has-data-[control-section-divider=compound]:after:inset-x-3"),
        allowCompoundDividers &&
          showCompoundTopDivider &&
          (flush
            ? "has-data-[control-section-divider=compound]:before:inset-x-0"
            : "has-data-[control-section-divider=compound]:before:inset-x-3"),
      )}
      data-control-item-compound-divider-placement={
        allowCompoundDividers ? compoundDividerPlacement : undefined
      }
      data-control-item-compound-context={allowCompoundDividers ? "" : undefined}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p
      className="m-0 text-2xs leading-none font-semibold text-[color:color-mix(in_oklab,var(--foreground)_75%,transparent)] uppercase"
      data-slot="panel-title"
    >
      {children}
    </p>
  );
}

export type ControlFieldLabelProps = React.ComponentProps<typeof FieldLabel> & {
  textClassName?: string;
};

export function ControlFieldLabelActionProvider({
  action,
  children,
  label,
}: ControlFieldLabelActionContextValue & {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ControlFieldLabelActionContext.Provider value={{ action, label }}>
      {children}
    </ControlFieldLabelActionContext.Provider>
  );
}

export function ControlFieldLabelHelpProvider({
  children,
  help,
  label,
}: ControlFieldLabelHelpContextValue & {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ControlFieldLabelHelpContext.Provider value={{ help, label }}>
      {children}
    </ControlFieldLabelHelpContext.Provider>
  );
}

export function useControlFieldLabelAction(label: string | undefined): React.ReactNode {
  const context = React.useContext(ControlFieldLabelActionContext);
  return context && context.label === label ? context.action : null;
}

export function useControlFieldLabelHelp(label: string | undefined): string | null {
  const context = React.useContext(ControlFieldLabelHelpContext);
  return context && context.label === label ? context.help : null;
}

export function ControlFieldLabel({
  children,
  className,
  textClassName,
  title: titleProp,
  ...props
}: ControlFieldLabelProps): React.JSX.Element {
  const title = typeof children === "string" ? children : undefined;
  const labelAction = useControlFieldLabelAction(title);
  const labelHelp = useControlFieldLabelHelp(title);

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5",
        className,
      )}
      data-control-field-label=""
      data-slot="field-label"
    >
      <FieldLabel
        className="min-w-0 max-w-full gap-0"
        title={titleProp ?? title}
        {...props}
      >
        <span
          className={cn(
            "block whitespace-nowrap opacity-60 text-xs",
            textClassName,
          )}
          data-slot="template-field-label-text"
        >
          {children}
        </span>
      </FieldLabel>
      {labelHelp && (
        <Tooltip>
          <TooltipTrigger
            className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-[color:color-mix(in_oklab,var(--foreground)_40%,transparent)] hover:text-[color:color-mix(in_oklab,var(--foreground)_60%,transparent)]"
            type="button"
          >
            <QuestionIcon size={12} weight="fill" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] whitespace-normal text-left" side="top">
            {labelHelp}
          </TooltipContent>
        </Tooltip>
      )}
      {labelAction}
    </span>
  );
}
