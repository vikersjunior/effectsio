/**
 * Tree Operations for EffectsIO Unified Composition Model (Canonical Model B).
 *
 * All operations are pure, immutable functions operating on `(Layer | Group)[]`.
 *
 * Invariants:
 * 1. Single-tier nesting: Frame.items contains Layer or Group; Group.children contains Layer only.
 * 2. Locking enforcement: locked layers or groups cannot be moved or mutated; unlocked layers (including backdrop) can be reordered or deleted.
 * 3. Locked group enforcement:
 *    - Child editing, reordering, ejection, moving to another group, or deletion is rejected if parent group is locked.
 *    - Reordering, ungrouping, or deleting a locked group is rejected.
 *    - Renaming, visibility toggle, lock toggle, and collapse toggle on a locked group are allowed.
 * 4. Empty group auto-pruning: any group with 0 children is pruned.
 */

import {
  Layer,
  Group,
  isGroup,
  isLayer,
  createGroup,
  type BlendMode,
  type LayerTransform,
  DEFAULT_LAYER_TRANSFORM,
} from "../types/frame";
import type { EffectStack } from "../types/asset";

export type LayerLocation =
  | { type: "root"; index: number; layer: Layer }
  | { type: "group"; groupIndex: number; childIndex: number; group: Group; layer: Layer };

// ---------------------------------------------------------------------------
// Query Operations
// ---------------------------------------------------------------------------

/**
 * Searches items (root items and group children) for a Layer or Group by ID.
 */
export function findItemInItems(
  items: (Layer | Group)[],
  id: string | null | undefined
): Layer | Group | null {
  if (!id) return null;
  for (const item of items) {
    if (item.id === id) return item;
    if (isGroup(item)) {
      for (const child of item.children) {
        if (child.id === id) return child;
      }
    }
  }
  return null;
}

/**
 * Finds the parent Group containing a given layer ID, if any.
 */
export function findParentGroupOfLayer(
  items: (Layer | Group)[],
  layerId: string
): Group | null {
  for (const item of items) {
    if (isGroup(item)) {
      if (item.children.some((c) => c.id === layerId)) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Searches items (root items and group children) for a layer by ID.
 */
export function findLayerInItems(
  items: (Layer | Group)[],
  layerId: string | null | undefined
): Layer | null {
  if (!layerId) return null;
  for (const item of items) {
    if (isLayer(item)) {
      if (item.id === layerId) return item;
    } else if (isGroup(item)) {
      for (const child of item.children) {
        if (child.id === layerId) return child;
      }
    }
  }
  return null;
}

/**
 * Returns detailed location information for a layer in the items tree.
 */
export function findLayerLocation(
  items: (Layer | Group)[],
  layerId: string
): LayerLocation | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (isLayer(item)) {
      if (item.id === layerId) {
        return { type: "root", index: i, layer: item };
      }
    } else if (isGroup(item)) {
      for (let j = 0; j < item.children.length; j++) {
        const child = item.children[j];
        if (child.id === layerId) {
          return { type: "group", groupIndex: i, childIndex: j, group: item, layer: child };
        }
      }
    }
  }
  return null;
}

/**
 * Finds the Group that contains a given layer, or null if the layer is at root or not found.
 */
export function findGroupContainingLayer(
  items: (Layer | Group)[],
  layerId: string
): Group | null {
  for (const item of items) {
    if (isGroup(item)) {
      if (item.children.some((child) => child.id === layerId)) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Finds a Group by ID along with its root index.
 */
export function findGroupById(
  items: (Layer | Group)[],
  groupId: string
): { group: Group; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (isGroup(item) && item.id === groupId) {
      return { group: item, index: i };
    }
  }
  return null;
}

/**
 * Computes effective visibility for a layer:
 * If inside a group: group.visible && layer.visible.
 * If at root: layer.visible.
 */
export function getEffectiveLayerVisibility(
  items: (Layer | Group)[],
  layerId: string
): boolean {
  const loc = findLayerLocation(items, layerId);
  if (!loc) return false;
  if (loc.type === "group") {
    return loc.group.visible !== false && loc.layer.visible !== false;
  }
  return loc.layer.visible !== false;
}

/**
 * Computes effective locked status for a layer:
 * If inside a group: group.locked || layer.locked.
 * If at root: layer.locked.
 */
export function getEffectiveLayerLocked(
  items: (Layer | Group)[],
  layerId: string
): boolean {
  const loc = findLayerLocation(items, layerId);
  if (!loc) return false;
  if (loc.type === "group") {
    return Boolean(loc.group.locked || loc.layer.locked);
  }
  return Boolean(loc.layer.locked);
}

// ---------------------------------------------------------------------------
// Maintenance & Mutation Operations
// ---------------------------------------------------------------------------

/**
 * Removes any Group that contains 0 children.
 */
export function pruneEmptyGroups(items: (Layer | Group)[]): (Layer | Group)[] {
  return items.filter((item) => {
    if (isGroup(item)) {
      return item.children.length > 0;
    }
    return true;
  });
}

/**
 * Updates a layer by ID (whether root or inside a group) using an updater function.
 * If the layer's parent group is locked, the update is rejected unless allowIfLocked is true.
 */
export function updateLayerInItems(
  items: (Layer | Group)[],
  layerId: string,
  updater: (layer: Layer) => Layer,
  allowIfLocked = false
): (Layer | Group)[] {
  return items.map((item) => {
    if (isLayer(item)) {
      if (item.id === layerId) {
        return updater(item);
      }
      return item;
    }

    if (isGroup(item)) {
      const childIdx = item.children.findIndex((c) => c.id === layerId);
      if (childIdx === -1) return item;

      // Check locked group constraint
      if (item.locked && !allowIfLocked) {
        return item;
      }

      const newChildren = [...item.children];
      newChildren[childIdx] = updater(newChildren[childIdx]);
      return {
        ...item,
        children: newChildren,
        updatedAt: Date.now(),
      };
    }

    return item;
  });
}

/**
 * Removes a layer by ID from the composition tree.
 * Invariants:
 * - Locked layer or layer inside a locked group cannot be deleted.
 * - Empty groups are auto-pruned.
 */
export function removeLayerFromItems(
  items: (Layer | Group)[],
  layerId: string
): (Layer | Group)[] {
  const loc = findLayerLocation(items, layerId);
  if (!loc) return items;

  if (loc.type === "group" && loc.group.locked) {
    return items; // Locked group constraint
  }
  if (loc.layer.locked) {
    return items; // Locked layer constraint
  }

  let updated: (Layer | Group)[];

  if (loc.type === "root") {
    updated = items.filter((item) => !isLayer(item) || item.id !== layerId);
  } else {
    updated = items.map((item) => {
      if (isGroup(item) && item.id === loc.group.id) {
        return {
          ...item,
          children: item.children.filter((c) => c.id !== layerId),
          updatedAt: Date.now(),
        };
      }
      return item;
    });
  }

  return pruneEmptyGroups(updated);
}

/**
 * Creates a Group from an array of selected layer IDs.
 *
 * Rules:
 * - If selectedLayerIds is empty or only 1 layer, returns items unchanged.
 * - Rejects any layer whose parent group is locked or if the layer itself is locked.
 * - Extracts valid selected layers from their current locations.
 * - Calculates insertion position as the lowest original index among extracted items.
 * - Creates new group at that insertion position.
 * - Auto-prunes any groups left empty.
 */
export function createGroupFromSelection(
  items: (Layer | Group)[],
  selectedLayerIds: string[],
  name?: string
): (Layer | Group)[] {
  const selectedSet = new Set(selectedLayerIds);
  if (selectedSet.size === 0) return items;

  // Verify none of the selected layers are locked or in locked groups
  const layersToExtract: Layer[] = [];
  let minRootIndex = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (isLayer(item)) {
      if (selectedSet.has(item.id)) {
        if (item.locked) {
          continue;
        }
        layersToExtract.push(item);
        if (i < minRootIndex) minRootIndex = i;
      }
    } else if (isGroup(item)) {
      let groupContainsSelected = false;
      for (const child of item.children) {
        if (selectedSet.has(child.id)) {
          if (item.locked || child.locked) {
            // Cannot extract child from a locked group or locked child!
            return items;
          }
          layersToExtract.push(child);
          groupContainsSelected = true;
        }
      }
      if (groupContainsSelected && i < minRootIndex) {
        minRootIndex = i;
      }
    }
  }

  if (layersToExtract.length === 0) return items;

  // Remove extracted layers from their source locations
  const extractedIds = new Set(layersToExtract.map((l) => l.id));
  const remainingItems: (Layer | Group)[] = [];

  for (const item of items) {
    if (isLayer(item)) {
      if (!extractedIds.has(item.id)) {
        remainingItems.push(item);
      }
    } else if (isGroup(item)) {
      const remainingChildren = item.children.filter((c) => !extractedIds.has(c.id));
      if (remainingChildren.length > 0) {
        remainingItems.push({
          ...item,
          children: remainingChildren,
          updatedAt: Date.now(),
        });
      }
    }
  }

  // Create new group
  const newGroup = createGroup(name || "Group", layersToExtract);

  // Insertion index based on lowest original index among extracted items
  const insertIndex = Math.max(0, Math.min(minRootIndex, remainingItems.length));
  return [
    ...remainingItems.slice(0, insertIndex),
    newGroup,
    ...remainingItems.slice(insertIndex),
  ];
}

/**
 * Ungroups a Group, dissolving it and placing its children at root at the group's position.
 * Rejects if group is locked.
 */
export function ungroup(
  items: (Layer | Group)[],
  groupId: string
): (Layer | Group)[] {
  const target = findGroupById(items, groupId);
  if (!target) return items;
  if (target.group.locked) return items; // Locked group cannot be ungrouped

  const { group, index } = target;

  return [
    ...items.slice(0, index),
    ...group.children,
    ...items.slice(index + 1),
  ];
}

/**
 * Deletes a Group and all its children.
 * Rejects if group is locked.
 */
export function deleteGroup(
  items: (Layer | Group)[],
  groupId: string
): (Layer | Group)[] {
  const target = findGroupById(items, groupId);
  if (!target) return items;
  if (target.group.locked) return items; // Locked group cannot be deleted

  return items.filter((item) => !isGroup(item) || item.id !== groupId);
}

/**
 * Moves a root item from one index to another.
 * Invariants:
 * - Locked root item or locked group cannot be moved.
 */
export function moveRootItem(
  items: (Layer | Group)[],
  fromIndex: number,
  toIndex: number
): (Layer | Group)[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0) return items;
  if (fromIndex >= items.length || toIndex >= items.length) return items;

  const itemToMove = items[fromIndex];
  if (itemToMove.locked) return items;

  // Cannot displace a locked item at base index 0
  if (toIndex === 0 && items[0]?.locked) return items;

  const nextItems = [...items];
  const [removed] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, removed);

  return nextItems;
}

/**
 * Reorders a child within a Group's children array.
 * Rejects if group is locked.
 */
export function reorderGroupChild(
  items: (Layer | Group)[],
  groupId: string,
  fromIndex: number,
  toIndex: number
): (Layer | Group)[] {
  if (fromIndex === toIndex) return items;

  return items.map((item) => {
    if (!isGroup(item) || item.id !== groupId) return item;
    if (item.locked) return item; // Locked group reject

    if (
      fromIndex < 0 ||
      fromIndex >= item.children.length ||
      toIndex < 0 ||
      toIndex >= item.children.length
    ) {
      return item;
    }

    const newChildren = [...item.children];
    const [removed] = newChildren.splice(fromIndex, 1);
    newChildren.splice(toIndex, 0, removed);

    return {
      ...item,
      children: newChildren,
      updatedAt: Date.now(),
    };
  });
}

/**
 * Moves a layer into a target Group at an optional child index.
 * Invariants:
 * - Locked layer cannot be moved.
 * - Source group (if any) cannot be locked.
 * - Target group cannot be locked.
 * - Auto-prunes empty source group.
 */
export function moveLayerToGroup(
  items: (Layer | Group)[],
  layerId: string,
  targetGroupId: string,
  targetIndex?: number
): (Layer | Group)[] {
  const loc = findLayerLocation(items, layerId);
  if (!loc) return items;
  if (loc.type === "group" && loc.group.locked) return items;
  if (loc.layer.locked) return items;

  const target = findGroupById(items, targetGroupId);
  if (!target || target.group.locked) return items;

  // If already in target group and no index specified, no-op
  if (loc.type === "group" && loc.group.id === targetGroupId && targetIndex === undefined) {
    return items;
  }

  const layer = loc.layer;

  // Remove layer from source
  let intermediate: (Layer | Group)[];
  if (loc.type === "root") {
    intermediate = items.filter((item) => !isLayer(item) || item.id !== layerId);
  } else {
    intermediate = items.map((item) => {
      if (isGroup(item) && item.id === loc.group.id) {
        return {
          ...item,
          children: item.children.filter((c) => c.id !== layerId),
          updatedAt: Date.now(),
        };
      }
      return item;
    });
  }

  // Insert into target group
  const result = intermediate.map((item) => {
    if (isGroup(item) && item.id === targetGroupId) {
      const newChildren = [...item.children];
      const insertAt =
        typeof targetIndex === "number"
          ? Math.max(0, Math.min(targetIndex, newChildren.length))
          : newChildren.length;
      newChildren.splice(insertAt, 0, layer);
      return {
        ...item,
        children: newChildren,
        updatedAt: Date.now(),
      };
    }
    return item;
  });

  return pruneEmptyGroups(result);
}

/**
 * Ejects a layer from its parent Group out to the root items list.
 * Invariants:
 * - Source group cannot be locked.
 * - Auto-prunes empty source group.
 */
export function ejectLayerFromGroup(
  items: (Layer | Group)[],
  layerId: string,
  targetRootIndex?: number
): (Layer | Group)[] {
  const loc = findLayerLocation(items, layerId);
  if (!loc || loc.type !== "group") return items;
  if (loc.group.locked) return items;

  const layer = loc.layer;
  const groupIndex = loc.groupIndex;

  // Remove from group
  const intermediate = items.map((item) => {
    if (isGroup(item) && item.id === loc.group.id) {
      return {
        ...item,
        children: item.children.filter((c) => c.id !== layerId),
        updatedAt: Date.now(),
      };
    }
    return item;
  });

  // Calculate root insertion point (default right above the group)
  const defaultInsert = Math.max(0, groupIndex + 1);
  const insertIndex =
    typeof targetRootIndex === "number"
      ? Math.max(0, Math.min(targetRootIndex, intermediate.length))
      : defaultInsert;

  const nextItems = [
    ...intermediate.slice(0, insertIndex),
    layer,
    ...intermediate.slice(insertIndex),
  ];

  return pruneEmptyGroups(nextItems);
}

// ---------------------------------------------------------------------------
// Group Attribute Setters
// ---------------------------------------------------------------------------

/**
 * Renames a Group (allowed even if group is locked).
 */
export function renameGroup(
  items: (Layer | Group)[],
  groupId: string,
  newName: string
): (Layer | Group)[] {
  const trimmed = newName.trim();
  if (!trimmed) return items;

  return items.map((item) => {
    if (isGroup(item) && item.id === groupId) {
      return {
        ...item,
        name: trimmed,
        updatedAt: Date.now(),
      };
    }
    return item;
  });
}

/**
 * Toggles or sets a Group's visibility.
 */
export function setGroupVisibility(
  items: (Layer | Group)[],
  groupId: string,
  visible: boolean
): (Layer | Group)[] {
  return items.map((item) => {
    if (isGroup(item) && item.id === groupId) {
      return {
        ...item,
        visible,
        updatedAt: Date.now(),
      };
    }
    return item;
  });
}

/**
 * Toggles or sets a Group's locked state.
 */
export function setGroupLocked(
  items: (Layer | Group)[],
  groupId: string,
  locked: boolean
): (Layer | Group)[] {
  return items.map((item) => {
    if (isGroup(item) && item.id === groupId) {
      return {
        ...item,
        locked,
        updatedAt: Date.now(),
      };
    }
    return item;
  });
}

/**
 * Toggles or sets a Group's collapsed state (UI state, no undo snapshot).
 */
export function setGroupCollapsed(
  items: (Layer | Group)[],
  groupId: string,
  collapsed: boolean
): (Layer | Group)[] {
  return items.map((item) => {
    if (isGroup(item) && item.id === groupId) {
      return {
        ...item,
        collapsed,
        updatedAt: Date.now(),
      };
    }
    return item;
  });
}

/**
 * Updates a Group by ID using an updater function.
 * If the group is locked, the update is rejected unless allowIfLocked is true.
 */
export function updateGroupInItems(
  items: (Layer | Group)[],
  groupId: string,
  updater: (group: Group) => Group,
  allowIfLocked = false
): (Layer | Group)[] {
  return items.map((item) => {
    if (isGroup(item) && item.id === groupId) {
      if (item.locked && !allowIfLocked) return item;
      return updater(item);
    }
    return item;
  });
}

/**
 * Sets a Group's opacity (clamped between 0.0 and 1.0).
 */
export function setGroupOpacity(
  items: (Layer | Group)[],
  groupId: string,
  opacity: number
): (Layer | Group)[] {
  const clamped = Math.max(0, Math.min(1, opacity));
  return updateGroupInItems(items, groupId, (g) => ({
    ...g,
    opacity: clamped,
    updatedAt: Date.now(),
  }));
}

/**
 * Sets a Group's blend mode.
 */
export function setGroupBlendMode(
  items: (Layer | Group)[],
  groupId: string,
  blendMode: BlendMode
): (Layer | Group)[] {
  return updateGroupInItems(items, groupId, (g) => ({
    ...g,
    blendMode,
    updatedAt: Date.now(),
  }));
}

/**
 * Updates a Group's transform properties.
 */
export function updateGroupTransform(
  items: (Layer | Group)[],
  groupId: string,
  transformUpdates: Partial<LayerTransform>
): (Layer | Group)[] {
  return updateGroupInItems(items, groupId, (g) => {
    const current = g.transform ?? DEFAULT_LAYER_TRANSFORM;
    const nextTransform: LayerTransform = {
      x: transformUpdates.x !== undefined && Number.isFinite(transformUpdates.x) ? transformUpdates.x : current.x,
      y: transformUpdates.y !== undefined && Number.isFinite(transformUpdates.y) ? transformUpdates.y : current.y,
      scaleX: transformUpdates.scaleX !== undefined && Number.isFinite(transformUpdates.scaleX) ? Math.max(0.05, Math.min(20, transformUpdates.scaleX)) : current.scaleX,
      scaleY: transformUpdates.scaleY !== undefined && Number.isFinite(transformUpdates.scaleY) ? Math.max(0.05, Math.min(20, transformUpdates.scaleY)) : current.scaleY,
      rotation: transformUpdates.rotation !== undefined && Number.isFinite(transformUpdates.rotation) ? transformUpdates.rotation : current.rotation,
    };
    return {
      ...g,
      transform: nextTransform,
      updatedAt: Date.now(),
    };
  });
}

/**
 * Sets a Group's entire effect stack.
 */
export function setGroupEffectStack(
  items: (Layer | Group)[],
  groupId: string,
  effectStack: EffectStack
): (Layer | Group)[] {
  return updateGroupInItems(items, groupId, (g) => ({
    ...g,
    effectStack: [...effectStack],
    updatedAt: Date.now(),
  }));
}
