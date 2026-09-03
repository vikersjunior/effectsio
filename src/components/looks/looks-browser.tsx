import * as React from "react";
import {
  SparkleIcon,
  BookmarkSimpleIcon,
  TrashIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Badge,
  ScrollFade,
  ToggleGroup,
  ToggleGroupItem,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { getAllLooks } from "../../looks/look-manager";
import type { Look } from "../../types/look";
import { SaveLookModal } from "./save-look-modal";

export interface LooksBrowserProps {
  onSelectLook?: (look: Look) => void;
}

export function LooksBrowser({ onSelectLook }: LooksBrowserProps = {}): React.JSX.Element {
  const {
    userLooks,
    activeAsset,
    selectedAssetIds,
    activeEffectStack,
    applyLookToActiveAsset,
    applyLookToAssets,
    deleteUserLook,
  } = useStudioStore();

  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false);
  const [appliedLookId, setAppliedLookId] = React.useState<string | null>(null);

  const allLooks = React.useMemo(() => getAllLooks(userLooks), [userLooks]);

  const filteredLooks = React.useMemo(() => {
    if (selectedCategory === "all") return allLooks;
    if (selectedCategory === "user") return userLooks;
    return allLooks.filter((l) => l.category === selectedCategory);
  }, [allLooks, userLooks, selectedCategory]);

  const categories = [
    { id: "all", label: "All" },
    { id: "editorial", label: "Editorial" },
    { id: "retro", label: "Retro" },
    { id: "monochrome", label: "Mono" },
    { id: "experimental", label: "Experimental" },
    { id: "user", label: `Saved (${userLooks.length})` },
  ];

  const isMultiSelect = selectedAssetIds.size > 1;

  const handleApply = (look: Look) => {
    if (isMultiSelect) {
      applyLookToAssets(Array.from(selectedAssetIds), look);
    } else {
      applyLookToActiveAsset(look);
    }
    setAppliedLookId(look.id);
    onSelectLook?.(look);
    setTimeout(() => setAppliedLookId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header & Save Action */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[color:color-mix(in_oklab,var(--card)_40%,transparent)] border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
        <div className="flex items-center gap-2">
          <SparkleIcon size={13} className="text-[color:var(--primary)]" />
          <span className="text-xs font-semibold tracking-tight text-[color:var(--foreground)]">
            Looks & Presets
          </span>
        </div>
        <Button
          variant="secondary"
          size="xs"
          disabled={!activeAsset || activeEffectStack.length === 0}
          onClick={() => setIsSaveModalOpen(true)}
          className="gap-1 text-2xs"
          title="Save active effect stack as a reusable Look"
        >
          <BookmarkSimpleIcon size={11} />
          Save as Look
        </Button>
      </div>

      {/* Category Filter Pills */}
      <div className="p-2 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:color-mix(in_oklab,var(--card)_20%,transparent)]">
        <ToggleGroup
          value={[selectedCategory]}
          onValueChange={(val) => {
            if (val[0]) setSelectedCategory(val[0]);
          }}
          className="w-full flex-wrap"
          variant="outline"
          size="sm"
        >
          {categories.map((cat) => (
            <ToggleGroupItem
              key={cat.id}
              value={cat.id}
              className="text-2xs px-2 py-0.5 h-6 flex-1 min-w-[50px]"
            >
              {cat.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Looks Cards List */}
      <ScrollFade className="flex-1 overflow-y-auto p-4" containerClassName="flex-1 min-h-0">
        <div className="flex flex-col gap-2.5">
          {filteredLooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-[color:var(--muted-foreground)]">
              <SparkleIcon size={24} className="opacity-30" />
              <span className="text-xs font-medium">No looks found in this category</span>
              {selectedCategory === "user" && (
                <span className="text-2xs text-[color:var(--muted-foreground)] opacity-80">
                  Click \"Save as Look\" above to save your custom effect combinations!
                </span>
              )}
            </div>
          ) : (
            filteredLooks.map((look) => (
              <div
                key={look.id}
                className="flex flex-col gap-2 p-3 rounded-lg border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:color-mix(in_oklab,var(--card)_60%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] transition-colors duration-150"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[color:var(--foreground)] truncate">
                        {look.name}
                      </span>
                      <Badge
                        variant={look.isBuiltIn ? "secondary" : "outline"}
                        className="text-3xs uppercase px-1.5 py-0"
                      >
                        {look.isBuiltIn ? look.category : "Custom"}
                      </Badge>
                    </div>
                    {look.description && (
                      <p className="text-2xs text-[color:var(--muted-foreground)] line-clamp-2">
                        {look.description}
                      </p>
                    )}
                  </div>

                  {!look.isBuiltIn && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteUserLook(look.id)}
                      title="Delete custom look"
                    >
                      <TrashIcon size={11} className="text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]" />
                    </Button>
                  )}
                </div>

                {/* Effect Layer Badges */}
                <div className="flex flex-wrap gap-1">
                  {look.effectStack.map((inst, i) => (
                    <Badge
                      key={i}
                      variant="mutedOutline"
                      className="text-3xs font-medium px-1.5 py-0 capitalize"
                    >
                      {inst.effectId.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>

                {/* Apply Action */}
                <div className="flex justify-end pt-1">
                  <Button
                    variant={appliedLookId === look.id ? "secondary" : "primary"}
                    size="xs"
                    disabled={!activeAsset && selectedAssetIds.size === 0}
                    onClick={() => handleApply(look)}
                    className="gap-1 text-2xs"
                  >
                    {appliedLookId === look.id ? (
                      <>
                        <CheckIcon size={11} />
                        {isMultiSelect
                          ? `Applied to ${selectedAssetIds.size} Assets!`
                          : "Applied!"}
                      </>
                    ) : (
                      <>
                        <ArrowRightIcon size={11} />
                        {isMultiSelect
                          ? `Apply to ${selectedAssetIds.size} Selected`
                          : "Apply Look"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollFade>

      {/* Save Look Modal */}
      {isSaveModalOpen && (
        <SaveLookModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} />
      )}
    </div>
  );
}
