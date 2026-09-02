import * as React from "react";
import { MagnifyingGlassIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  Input,
  Button,
  ToggleGroup,
  ToggleGroupItem,
  ScrollFade,
} from "../ui";
import { EFFECT_REGISTRY } from "../../effects/registry";
import type { EffectCategory, EffectId } from "../../effects/types";
import { getEffectPreviewUrl } from "./effect-preview-cache";

interface EffectBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEffect: (effectId: EffectId) => void;
}

export function EffectBrowserModal({
  isOpen,
  onClose,
  onSelectEffect,
}: EffectBrowserModalProps): React.JSX.Element | null {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<EffectCategory | "all">("all");

  const categories: Array<{ id: EffectCategory | "all"; label: string }> = [
    { id: "all", label: "All Effects" },
    { id: "artistic", label: "Artistic" },
    { id: "graphic", label: "Graphic" },
    { id: "retro", label: "Retro" },
    { id: "experimental", label: "Experimental" },
  ];

  const filteredEffects = React.useMemo(() => {
    return EFFECT_REGISTRY.filter((effect) => {
      if (effect.id === "original") return false;
      const matchesCategory = selectedCategory === "all" || effect.category === selectedCategory;
      const matchesQuery =
        searchQuery.trim() === "" ||
        effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effect.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl" layout="sections">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <SparkleIcon size={16} className="text-[color:var(--primary)]" />
            <DialogTitle>Add Visual Effect</DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="gap-3">
          {/* Search & Category Filter */}
          <div className="flex flex-col gap-2.5">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon size={13} className="absolute left-2.5 text-[color:var(--muted-foreground)] pointer-events-none" />
              <Input
                type="text"
                placeholder="Search visual effects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-8 pr-8 h-8 text-xs w-full"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xxs"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 text-2xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                >
                  <XIcon size={11} />
                </Button>
              )}
            </div>

            <ToggleGroup
              value={[selectedCategory]}
              onValueChange={(val) => {
                if (val[0]) setSelectedCategory(val[0] as any);
              }}
              variant="outline"
              size="sm"
              className="w-full flex-wrap"
            >
              {categories.map((cat) => (
                <ToggleGroupItem
                  key={cat.id}
                  value={cat.id}
                  className="text-2xs px-2.5 py-1 flex-1 min-w-[70px]"
                >
                  {cat.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Rendered Effect Thumbnails Grid */}
          <ScrollFade className="max-h-[55vh] overflow-y-auto pr-1" containerClassName="min-h-0">
            {filteredEffects.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1 pb-2">
                {filteredEffects.map((effect) => {
                  const previewUrl = getEffectPreviewUrl(effect.id);
                  return (
                    <div
                      key={effect.id}
                      onClick={() => {
                        onSelectEffect(effect.id);
                        onClose();
                      }}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectEffect(effect.id);
                          onClose();
                        }
                      }}
                      className="group relative aspect-square w-full rounded-[calc(var(--radius-lg)-4px)] bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] hover:border-[color:var(--primary)] hover:ring-1 hover:ring-[color:var(--primary)] overflow-hidden cursor-pointer transition-all duration-150 outline-hidden"
                      title={`${effect.name} — ${effect.description}`}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={effect.name}
                          className="size-full object-cover select-none pointer-events-none"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center bg-[color:var(--card)] text-2xs text-[color:var(--muted-foreground)]">
                          {effect.name}
                        </div>
                      )}

                      {/* Hover Overlay Label (Hidden by default, shown on hover/focus) */}
                      <div className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 absolute inset-x-0 bottom-0 bg-black/75 p-1.5 text-center text-2xs font-semibold text-white truncate pointer-events-none">
                        {effect.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[color:var(--muted-foreground)]">
                No visual effects match your search or filter.
              </div>
            )}
          </ScrollFade>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
