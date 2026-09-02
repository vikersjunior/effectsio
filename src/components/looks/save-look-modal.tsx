import * as React from "react";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  Input,
  Textarea,
  Button,
  ToggleGroup,
  ToggleGroupItem,
  Field,
  Label,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import type { LookCategory } from "../../types/look";

interface SaveLookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveLookModal({ isOpen, onClose }: SaveLookModalProps): React.JSX.Element | null {
  const { activeEffectStack, saveCurrentStackAsLook } = useStudioStore();

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<LookCategory>("editorial");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setCategory("editorial");
      setDescription("");
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveCurrentStackAsLook(name.trim(), category, description.trim());
    onClose();
  };

  const categories: Array<{ id: LookCategory; label: string }> = [
    { id: "editorial", label: "Editorial" },
    { id: "retro", label: "Retro" },
    { id: "monochrome", label: "Monochrome" },
    { id: "experimental", label: "Experimental" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="default" layout="sections">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BookmarkSimpleIcon size={16} className="text-[color:var(--primary)]" />
            <DialogTitle>Save Effect Stack as Look</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <DialogBody className="gap-3.5">
            {/* Active Stack Layers Summary */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-[color:color-mix(in_oklab,var(--card)_60%,transparent)] border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] text-2xs">
              <span className="text-[color:var(--muted-foreground)]">Active Stack Layers:</span>
              <span className="font-semibold text-[color:var(--primary)]">
                {activeEffectStack.length} effect{activeEffectStack.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Look Name Input */}
            <Field className="gap-1.5">
              <Label className="text-2xs font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wider">
                Look Name *
              </Label>
              <Input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cyberpunk Acid Wash"
                className="h-8 text-xs"
              />
            </Field>

            {/* Category Select Pills */}
            <Field className="gap-1.5">
              <Label className="text-2xs font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wider">
                Category
              </Label>
              <ToggleGroup
                value={[category]}
                onValueChange={(val) => {
                  if (val[0]) setCategory(val[0] as LookCategory);
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
            </Field>

            {/* Description Input */}
            <Field className="gap-1.5">
              <Label className="text-2xs font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wider">
                Description (Optional)
              </Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add styling notes or target aesthetic..."
                size="sm"
                className="text-xs"
              />
            </Field>
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!name.trim()}>
              Save Look
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
