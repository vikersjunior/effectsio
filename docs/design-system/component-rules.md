# EffectsIO Component Rules & Design System Specification

## 1. Architectural Principles & Ownership

1. **Native EffectsIO Ownership**: EffectsIO owns 100% of its UI primitives in `src/components/ui/`. All components are native to EffectsIO and consume design tokens declared in `src/styles.css`.
2. **Permanent Component Decision Rule — Canonical First**:
   Before creating or styling a new UI component in EffectsIO, inspect `src/components/ui/` for an existing canonical primitive. If an equivalent exists, EffectsIO must use or extend the canonical component rather than creating a parallel custom implementation. New custom primitives require explicit justification and must not duplicate an existing canonical capability.
   
   **Hierarchical Component Flow**:
   ```
   EffectsIO Design System & Tokens (`src/styles.css`)
                ↓
   Canonical Shared Primitives (`src/components/ui/`)
                ↓
   Page-Level / Panel Usage (`src/components/layout/`, `src/components/looks/`, etc.)
   ```
   *Anti-pattern strictly prohibited*:
   `Canonical Component → Custom One-Off Implementation → Another Custom Variation → Visual Drift`

3. **Zero Custom Duplication Rule**: Never hand-craft custom ad-hoc buttons, badges, panels, toggles, textareas, search inputs, or dropzones with inline styles or custom Tailwind utility classes when an existing primitive in `src/components/ui/` exists.
4. **Design System Token Discipline**: All styling must consume variables declared in `src/styles.css` (`var(--background)`, `var(--foreground)`, `var(--card)`, `var(--border)`, `var(--primary)`, `var(--secondary)`, `var(--muted)`, `var(--link)`, `var(--radius)`, `var(--radius-lg)`). Never use arbitrary hardcoded hex codes or arbitrary pixel margins.

---

## 2. Canonical Component Mapping Table

| UI Need | Approved EffectsIO Component | Implementation Path | Semantic Description & Pattern |
| :--- | :--- | :--- | :--- |
| **Panel Surface** | `PanelSurface` | `src/components/ui/panel/panel-surface.tsx` | Outer boundary for left (`AssetPanel`), right (`InspectorPanel`), and modal surfaces. |
| **Panel Header** | `PanelHeader` | `src/components/ui/panel/panel-header.tsx` | Houses panel icon, title, count, and action buttons. Consistent 36px (`h-9`) with hairline bottom border. |
| **Panel Content** | `PanelSection` | `src/components/ui/panel/panel-section.tsx` | Collapsible or grouped parameter sections inside panels. |
| **Button** | `Button` | `src/components/ui/primitives/button.tsx` | Standard discrete actions (`primary`, `secondary`, `outline`, `ghost`, `destructive`) across `xs`, `sm`, `icon-xs`, `icon-sm`. |
| **Toggle** | `Toggle` | `src/components/ui/primitives/toggle.tsx` | Binary state push-button. |
| **Multi-Option Selection** | `ToggleGroup` | `src/components/ui/primitives/toggle-group.tsx` | Mutually exclusive choice filters or layout mode switchers (`TopNav`, categories). |
| **Content Tabs** | `Tabs` | `src/components/ui/composites/tabs.tsx` | Accessible content / panel switcher (`Effects`, `Looks`, `Backdrop`, `Details`). Never substitute with ToggleGroup. |
| **Select** | `SelectControl` | `src/components/ui/controls/select/select-control.tsx` | Accessible popover select with search, groupings, and clear trigger readout. |
| **Slider** | `SliderControl` | `src/components/ui/controls/slider/slider-control.tsx` | Continuous numeric range input with editable value readout label and unit suffix. |
| **Boolean Control** | `BooleanControl` | `src/components/ui/controls/boolean/boolean-control.tsx` | Grouped on/off flag pairing label with shared `Switch` primitive. |
| **Segmented Control** | `SegmentedControl` | `src/components/ui/controls/segmented/segmented-control.tsx` | Compact mode / option pill group with animated active pill indicator. |
| **Color (Free Hex Entry)** | `ColorControl` | `src/components/ui/controls/color/color-control.tsx` | Color swatch trigger + hex input in `ButtonGroup`, opening native SV popover. |
| **Preset Palette** | `PaletteControl` | `src/components/ui/controls/color/palette-control.tsx` | 5×5 circular swatch grid (`size-[24px]`) + 11-step vertical shade rail (`50`–`950`). |
| **Gradient Transitions** | `GradientControl` | `src/components/ui/controls/gradient/gradient-control.tsx` | Type selector, angle input, draggable stops track with pin indicators, and stop list. |
| **Selection State** | `selection-state.ts` | `src/components/ui/primitives/selection-state.ts` | Canonical `selectedAssetRingClassName`, `activeSelectedItemClassName`, `toggleSelectedItemClassName`. |
| **Metadata / Badges** | `Badge` | `src/components/ui/primitives/badge.tsx` | Compact status tags (`h-[18px]`, `text-[0.6875rem]`, `secondary` / `outline`). |
| **Tooltips** | `Tooltip`, `TooltipTrigger`, `TooltipContent` | `src/components/ui/primitives/tooltip.tsx` | Standard hover tooltips with delay and accessible portal content. |
| **Multi-Line Text** | `Textarea` | `src/components/ui/primitives/textarea.tsx` | Auto-sizing multi-line input consuming shared input control tokens. |
| **Dividers / Seams** | `Separator` | `src/components/ui/primitives/separator.tsx` | Accessible hairline horizontal and vertical dividers (`orientation="horizontal" \| "vertical"`). |
| **Icons** | `@phosphor-icons/react` | N/A (Direct package imports) | Canonical icon set for all primitives, toolbars, buttons, and panels (regular weight by default). |
| **Upload Dropzone** | Utility Dropzone | `src/components/layout/asset-panel.tsx` | Compact utility container with `CloudArrowUpIcon`, instructional text, and `Import media` Button. |

---

## 3. Layout & Structural Dividers

### Page Hierarchy
```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP NAVIGATION (h-12, hairline border-b)                               │
├───────────────────┬────────────────────────────────┬───────────────────┤
│ ASSETS PANEL      │ MAIN CANVAS VIEWPORT           │ INSPECTOR PANEL   │
│ (ResizablePanel)  │ (ResizablePanel)               │ (ResizablePanel)  │
│ (hairline         │                                │ (hairline         │
│  border-r)        │                                │  border-l)        │
└───────────────────┴────────────────────────────────┴───────────────────┘
```

- **Default Proportions**:
  - Left Panel (`#asset-library-panel`): `defaultSize="16%"`, `minSize="180px"`, `maxSize="320px"`
  - Center Viewport (`#canvas-viewport-panel`): `defaultSize="68%"`, `minSize="320px"`
  - Right Panel (`#inspector-panel`): `defaultSize="16%"`, `minSize="200px"`, `maxSize="360px"`
- **Hairline Dividers**: All panel borders and resize seams use a single crisp hairline `w-px` or `h-px` with `var(--border)` (`oklch(0.311 0.013 279.19)`).
- **Zero Double Borders**: When using `ResizableHandle`, panels must not have redundant outer `border-r` or `border-l` on the same seam.
- **Top Navigation Chrome**: Uses `bg-[color:color-mix(in_oklab,var(--card)_80%,transparent)] backdrop-blur-2xl` with a crisp hairline bottom border (`border-b border-[color:var(--border)]`) and zero box-shadow.

---

## 4. Asset Panel Specification

### State A — Empty State (`assets.length === 0`)
1. **Header**: Title reads `Assets` with count `(0)` -> `Assets (0)`.
2. **Heading Rule**: ZERO `"Source Image"` or `"Image Library"` headings.
3. **No AI Generation**: AI generation controls are explicitly out of scope.
4. **Dropzone**:
   - Clean, compact file-drop utility container (`border border-dashed border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] rounded-lg p-5 text-center flex flex-col items-center justify-center gap-2`).
   - Contains `CloudArrowUpIcon` (`size-6 text-[color:var(--muted-foreground)]`), title `"Add media"`, description `"Drag here, import from your computer"`, and action button `<Button variant="outline" size="xs">Import media</Button>`.
   - Restrained utility height, placed naturally in the panel content area (not full viewport centered).

### State B — Populated State (`assets.length > 0`)
1. **Header**: Title reads `Assets (N)`.
2. **Search Control**: Inline search input (`placeholder="Find..."`, autoFocus, clear `XIcon` button) positioned at the top of the populated asset list.
3. **Thumbnail Grid**:
   - 4-column layout: `grid grid-cols-4 gap-2`.
   - Each tile is strictly `aspect-square`, `object-cover`, `rounded-[calc(var(--radius-lg)-4px)]`, and `bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]`.
   - **ZERO captions, ZERO filenames, ZERO dimensions beneath the thumbnail.**
4. **Add-Image Tile (`+`)**:
   - Integrated directly into the 4-column grid as the final square item.
   - Matches the exact dimensions, aspect-ratio, radius, and grid spacing of the image tiles.
5. **Delete Action**:
   - Compact `Button variant="ghost" size="icon-sm"` in the top-right corner of the tile, visible on tile hover.

---

## 5. Selection State Formula

Selection state across EffectsIO must strictly consume the canonical formula defined in `src/components/ui/primitives/selection-state.ts`:

- **Asset Thumbnail Selection**:
  ```ts
  export const selectedAssetRingClassName =
    "ring-2 ring-[color:color-mix(in_oklab,var(--link)_72%,transparent)] ring-offset-2 ring-offset-[color:var(--background)]";
  ```
- **List / Row Selection**:
  ```ts
  export const activeSelectedItemClassName =
    "data-active:border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] data-active:bg-[color:color-mix(in_oklab,var(--link)_12%,transparent)] data-active:text-[color:var(--foreground)]";
  ```
- **Toggle Selection**:
  ```ts
  export const toggleSelectedItemClassName =
    "data-[state=on]:border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] data-[state=on]:bg-[color:color-mix(in_oklab,var(--link)_12%,transparent)] data-[state=on]:text-[color:var(--foreground)]";
  ```

---

## 6. Parameter Controls Specification

All parameter controls reside in `src/components/ui/controls/` and wrap shared primitives:

1. **SliderControl**: For continuous numeric ranges (`min`, `max`, `step`, value readout label).
2. **SelectControl** / **StaticSelect**: For discrete option lists (`options: readonly ControlOption[]`).
3. **ColorControl**: For color properties. Consists of a color swatch button and hex input in a `ButtonGroup`, opening the full native color popover (SV gradient surface, Hue slider, Opacity input, Format selector).
4. **BooleanControl**: For on/off flags, implemented with the shared `Switch` primitive.
5. **SegmentedControl**: For compact grouped choices with animated pill indicators.

---

## 7. Badges Specification

- **Sizing**: `h-[18px]` (or `h-4`), `px-1.5`, `py-0`, text `text-[0.6875rem]` (`font-medium`).
- **Variants**:
  - `secondary`: Soft muted surface `bg-[color:color-mix(in_oklab,var(--secondary)_12%,transparent)] text-[color:var(--secondary-foreground)]` (default for built-in looks and categories).
  - `outline`: Subtle border `border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] text-[color:var(--foreground)]` (for custom tags and app status).
- **Rule**: Badges are metadata indicators, not primary buttons. They must remain visually subordinate to adjacent buttons and headings.

---

## 8. Canonical Component Adoption Policy & Decision Matrix

EffectsIO uses its native component architecture, sizing, spacing, surfaces, borders, typography, and interaction patterns as the canonical reference wherever the same product need exists.

### Component Choice Decision Matrix

| Product Need | Canonical Component | Architecture & Pattern | Anti-Patterns (Forbidden) |
| :--- | :--- | :--- | :--- |
| **Constrained Preset Palettes** | `PaletteControl` (`src/components/ui/controls/color/palette-control.tsx`) | 5×5 circular swatch grid (`size-[24px]`), active white ring indicator (`after:-inset-[4px]`), vertical hairline divider, vertical shade rail (11 steps, `50`–`950`) with grab indicator. | Homemade rows of color buttons, arbitrary hex swatches, inline square palette grids. |
| **Arbitrary / Free Hex Color Entry** | `ColorControl` (`src/components/ui/controls/color/color-control.tsx`) | Swatch trigger button + font-mono hex text input in a unified `ButtonGroup`. Opens SV saturation/brightness surface popover with hue slider and format toggle. | Raw `<input type="color">`, unstyled text inputs, unvalidated hex boxes. |
| **Free Color + Opacity** | `ColorOpacityControl` (`src/components/ui/controls/color/color-control.tsx`) | ColorControl compound group paired with numeric opacity percentage input. | Independent uncoordinated color and opacity sliders. |
| **Gradient Transitions & Stops** | `GradientControl` (`src/components/ui/controls/gradient/gradient-control.tsx`) | Type selector (Linear, Radial, Angular, Diamond), angle input with degree unit, draggable stops track with pin indicators, and stop list rows (position %, color swatch, opacity %, remove/add actions). | Separate start/end color boxes with manual angle slider. |
| **Content / Workflow Switching** | `Tabs` (`src/components/ui/primitives/tabs.tsx`) | Accessible `@base-ui/react/tabs` with roving focus and tabpanel associations (`Effects`, `Looks`, `Backdrop`, `Details`). | `ToggleGroup`, `ButtonGroup`, or raw buttons for switching panel contents. |
| **Compact Mode / Option Choices** | `SegmentedControl` (`src/components/ui/controls/segmented/segmented-control.tsx`) | Compact pill group with animated active indicator (e.g. Backdrop type, Export format). | Radio buttons or bulky button lists for compact choices. |

### Permanent Development Invariants

1. **Zero Reinvention Mandate**: When a UI requirement matches a canonical component capability, use the shared implementation in `src/components/ui/`. Do not invent a bespoke one-off interpretation.
2. **Strict Separation of Concerns**: Constrained token presets (`PaletteControl`) and freeform hex entry (`ColorControl`) are distinct controls and must not be conflated into ad-hoc merged components.
3. **Shared Primitive Import Discipline**: All app components must import primitives and controls directly from `src/components/ui` or `../ui`. Direct relative drilling into arbitrary internal directories is prohibited.

---

## 9. Icon System Specification (`@phosphor-icons/react`)

1. **Canonical Package**: `@phosphor-icons/react` is the sole, exclusive icon library used across EffectsIO. `lucide-react` is not permitted in the codebase.
2. **Weight Convention**:
   - Default weight: Regular (no `weight` prop passed), matching the EffectsIO design standard.
   - Contextual exceptions:
     - Help/Info tooltips in control layouts use `weight="fill"` (`<QuestionIcon weight="fill" />`).
     - Large empty-state dropzones use `weight="light"` (`<CloudArrowUpIcon weight="light" />`).
3. **Export Naming**: All Phosphor React icons follow the `*Icon` convention (e.g., `CaretDownIcon`, `CheckIcon`, `SparkleIcon`, `PlusIcon`, `MinusIcon`, `ArrowCounterClockwiseIcon`, `DownloadSimpleIcon`, `TrashIcon`, `DotsSixVerticalIcon`, `SpinnerGapIcon`).
