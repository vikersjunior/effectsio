import * as React from "react";
import {
  CaretRightIcon,
  CaretDownIcon,
  FolderSimpleIcon,
  DotsSixVerticalIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PencilSimpleIcon,
  TrashIcon,
  ExcludeIcon,
} from "@phosphor-icons/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Badge,
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ICON_SIZES,
} from "../ui";
import { cn } from "../ui/lib/utils";
import type { Group } from "../../types/frame";

export interface GroupRowProps {
  group: Group;
  isSelected?: boolean;
  onSelect?: () => void;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (newName: string) => void;
  onUngroup: () => void;
  onDelete: () => void;
}

export function GroupRow({
  group,
  isSelected,
  onSelect,
  onToggleCollapse,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onUngroup,
  onDelete,
}: GroupRowProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, disabled: group.locked });

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(group.name);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setEditName(group.name);
  }, [group.name]);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleCommitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== group.name) {
      onRename(trimmed);
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommitRename();
    } else if (e.key === "Escape") {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : !group.visible ? 0.6 : 1,
  };

  const childCount = group.children.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-slot="group-row"
      data-testid="group-row"
      data-group-id={group.id}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-1.5 px-2 h-10 rounded-md border transition-colors cursor-pointer select-none",
        isSelected
          ? "border-[color:var(--primary)] bg-[color:color-mix(in_oklab,var(--primary)_10%,var(--card))] ring-1 ring-[color:var(--primary)]"
          : "border-[color:color-mix(in_oklab,var(--border)_50%,transparent)] bg-[color:color-mix(in_oklab,var(--card)_90%,var(--foreground)_2%)] hover:border-[color:color-mix(in_oklab,var(--border)_80%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_4%,var(--card))]"
      )}
    >
      {/* 1. Drag Handle / Lock indicator */}
      {group.locked ? (
        <div
          className="p-0.5 text-[color:var(--muted-foreground)] shrink-0 opacity-60 flex items-center justify-center"
          title="Group is locked"
        >
          <LockSimpleIcon size={ICON_SIZES.sm} />
        </div>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${group.name}`}
          className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] p-0.5 rounded-xs shrink-0 touch-none outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ring)]"
        >
          <DotsSixVerticalIcon size={ICON_SIZES.md} />
        </button>
      )}

      {/* 2. Caret Expand/Collapse Toggle Button */}
      <button
        type="button"
        aria-label={group.collapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        className="size-5 flex items-center justify-center rounded-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] transition-colors shrink-0"
      >
        {group.collapsed ? (
          <CaretRightIcon size={ICON_SIZES.xs} />
        ) : (
          <CaretDownIcon size={ICON_SIZES.xs} />
        )}
      </button>

      {/* 3. Folder Icon */}
      <div className="text-[color:var(--muted-foreground)] shrink-0 flex items-center justify-center">
        <FolderSimpleIcon size={ICON_SIZES.sm} />
      </div>

      {/* 4. Group Name or Inline Rename Input */}
      <div
        className="flex-1 min-w-0 flex items-center gap-1.5"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {isEditing ? (
          <Input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleCommitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-xs px-1 py-0 rounded-xs font-medium"
          />
        ) : (
          <span
            className="text-xs font-medium text-[color:var(--foreground)] truncate"
            title="Double-click to rename"
          >
            {group.name}
          </span>
        )}
      </div>

      {/* 5. Child Layer Count Badge */}
      <Badge
        variant="outline"
        className="h-[18px] text-2xs px-1.5 py-0 font-normal shrink-0 text-[color:var(--muted-foreground)] border-[color:color-mix(in_oklab,var(--border)_60%,transparent)]"
      >
        {childCount} {childCount === 1 ? "item" : "items"}
      </Badge>

      {/* 6. Collective Action Buttons (Visibility, Lock, More Menu) */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visibility Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onToggleVisibility}
          title={group.visible ? "Hide group" : "Show group"}
          aria-label={group.visible ? `Hide ${group.name}` : `Show ${group.name}`}
          className={cn(
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-opacity",
            !group.visible ? "opacity-100 text-[color:var(--muted-foreground)]" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {group.visible ? (
            <EyeIcon size={ICON_SIZES.sm} />
          ) : (
            <EyeSlashIcon size={ICON_SIZES.sm} />
          )}
        </Button>

        {/* Lock Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onToggleLock}
          title={group.locked ? "Unlock group" : "Lock group"}
          aria-label={group.locked ? `Unlock ${group.name}` : `Lock ${group.name}`}
          className={cn(
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-opacity",
            group.locked ? "opacity-100 text-[color:var(--primary)]" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {group.locked ? (
            <LockSimpleIcon size={ICON_SIZES.sm} />
          ) : (
            <LockSimpleOpenIcon size={ICON_SIZES.sm} />
          )}
        </Button>

        {/* Popover Action Menu */}
        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <PopoverTrigger
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                type="button"
                variant="ghost"
                size="icon-xs"
                title="Group actions"
                aria-label="Group actions"
                className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <DotsThreeVerticalIcon size={ICON_SIZES.sm} />
              </Button>
            )}
          />
          <PopoverContent
            align="end"
            className="w-44 p-1 flex flex-col gap-0.5 bg-[color:var(--popover)] border border-[color:var(--border)] rounded-md shadow-md z-50 text-xs"
          >
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsEditing(true);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-xs hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-foreground)] text-[color:var(--foreground)]"
            >
              <PencilSimpleIcon size={ICON_SIZES.sm} />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onUngroup();
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-xs hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-foreground)] text-[color:var(--foreground)]"
            >
              <ExcludeIcon size={ICON_SIZES.sm} />
              <span>Ungroup</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-xs hover:bg-[color:var(--destructive)] hover:text-[color:var(--destructive-foreground)] text-[color:var(--destructive)]"
            >
              <TrashIcon size={ICON_SIZES.sm} />
              <span>Delete Group</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
