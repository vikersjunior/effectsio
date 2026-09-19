import { describe, it, expect } from "vitest";
import {
  createDefaultBackdropLayer,
  createImageLayer,
  createGroup,
  createLayer,
  Frame,
} from "../types/frame";
import {
  findLayerInItems,
  findLayerLocation,
  findGroupContainingLayer,
  findGroupById,
  getEffectiveLayerVisibility,
  getEffectiveLayerLocked,
  pruneEmptyGroups,
  updateLayerInItems,
  removeLayerFromItems,
  createGroupFromSelection,
  ungroup,
  deleteGroup,
  moveRootItem,
  reorderGroupChild,
  moveLayerToGroup,
  ejectLayerFromGroup,
  renameGroup,
  setGroupVisibility,
  setGroupLocked,
  setGroupCollapsed,
  setGroupOpacity,
  setGroupBlendMode,
  updateGroupTransform,
  setGroupEffectStack,
} from "./tree-operations";

describe("tree-operations", () => {
  const backdrop = createDefaultBackdropLayer();
  const layer1 = createImageLayer("asset-1", "Layer 1");
  const layer2 = createImageLayer("asset-2", "Layer 2");
  const layer3 = createImageLayer("asset-3", "Layer 3");
  const layer4 = createImageLayer("asset-4", "Layer 4");

  it("finds layer at root or inside group", () => {
    const group = createGroup("Folder", [layer2, layer3]);
    const items = [backdrop, layer1, group, layer4];

    expect(findLayerInItems(items, layer1.id)?.id).toBe(layer1.id);
    expect(findLayerInItems(items, layer2.id)?.id).toBe(layer2.id);
    expect(findLayerInItems(items, "non-existent")).toBeNull();
  });

  it("finds layer location correctly", () => {
    const group = createGroup("Folder", [layer2, layer3]);
    const items = [backdrop, layer1, group, layer4];

    const loc1 = findLayerLocation(items, layer1.id);
    expect(loc1).toEqual({ type: "root", index: 1, layer: layer1 });

    const loc2 = findLayerLocation(items, layer3.id);
    expect(loc2).toEqual({
      type: "group",
      groupIndex: 2,
      childIndex: 1,
      group,
      layer: layer3,
    });
  });

  it("computes effective visibility and locked status", () => {
    const hiddenGroup = createGroup("Hidden", [layer2], { visible: false });
    const lockedGroup = createGroup("Locked", [layer3], { locked: true });
    const items = [backdrop, layer1, hiddenGroup, lockedGroup];

    expect(getEffectiveLayerVisibility(items, layer1.id)).toBe(true);
    expect(getEffectiveLayerVisibility(items, layer2.id)).toBe(false);

    expect(getEffectiveLayerLocked(items, layer1.id)).toBe(false);
    expect(getEffectiveLayerLocked(items, layer3.id)).toBe(true);
  });

  it("creates group from selection and excludes backdrop", () => {
    const items = [backdrop, layer1, layer2, layer3];
    // Attempt grouping backdrop, layer1, layer2
    const result = createGroupFromSelection(items, [backdrop.id, layer1.id, layer2.id], "New Group");

    expect(result.length).toBe(3);
    expect(result[0].id).toBe(backdrop.id);
    const group = result[1];
    expect(group).toHaveProperty("children");
    if ("children" in group) {
      expect(group.children.length).toBe(2);
      expect(group.children[0].id).toBe(layer1.id);
      expect(group.children[1].id).toBe(layer2.id);
    }
    expect(result[2].id).toBe(layer3.id);
  });

  it("rejects creating group from locked group children", () => {
    const lockedGroup = createGroup("Locked", [layer1, layer2], { locked: true });
    const items = [backdrop, lockedGroup, layer3];

    const result = createGroupFromSelection(items, [layer1.id, layer3.id]);
    expect(result).toBe(items); // rejected
  });

  it("ungroups into root at original group index", () => {
    const group = createGroup("Folder", [layer1, layer2]);
    const items = [backdrop, group, layer3];

    const result = ungroup(items, group.id);
    expect(result.length).toBe(4);
    expect(result[0].id).toBe(backdrop.id);
    expect(result[1].id).toBe(layer1.id);
    expect(result[2].id).toBe(layer2.id);
    expect(result[3].id).toBe(layer3.id);
  });

  it("rejects ungrouping if group is locked", () => {
    const lockedGroup = createGroup("Locked", [layer1, layer2], { locked: true });
    const items = [backdrop, lockedGroup, layer3];

    const result = ungroup(items, lockedGroup.id);
    expect(result).toBe(items);
  });

  it("deletes group and rejects if locked", () => {
    const group = createGroup("Folder", [layer1, layer2]);
    const items = [backdrop, group, layer3];

    const result = deleteGroup(items, group.id);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(backdrop.id);
    expect(result[1].id).toBe(layer3.id);

    const lockedGroup = createGroup("Locked", [layer1, layer2], { locked: true });
    const lockedItems = [backdrop, lockedGroup, layer3];
    expect(deleteGroup(lockedItems, lockedGroup.id)).toBe(lockedItems);
  });

  it("moves root items respecting lock state", () => {
    const items = [backdrop, layer1, layer2, layer3];

    // Attempt moving locked backdrop (index 0) -> rejected because it is locked
    expect(moveRootItem(items, 0, 2)).toBe(items);

    // Attempt moving to index 0 when backdrop is locked -> rejected
    expect(moveRootItem(items, 2, 0)).toBe(items);

    // Valid move between unlocked items
    const moved = moveRootItem(items, 1, 3);
    expect(moved[0].id).toBe(backdrop.id);
    expect(moved[1].id).toBe(layer2.id);
    expect(moved[2].id).toBe(layer3.id);
    expect(moved[3].id).toBe(layer1.id);

    // When unlocked, backdrop can move to another position and layers can move to index 0
    const unlockedBackdrop = { ...backdrop, locked: false };
    const itemsWithUnlocked = [unlockedBackdrop, layer1, layer2, layer3];
    const movedBackdrop = moveRootItem(itemsWithUnlocked, 0, 2);
    expect(movedBackdrop[0].id).toBe(layer1.id);
    expect(movedBackdrop[1].id).toBe(layer2.id);
    expect(movedBackdrop[2].id).toBe(unlockedBackdrop.id);

    const movedToZero = moveRootItem(itemsWithUnlocked, 2, 0);
    expect(movedToZero[0].id).toBe(layer2.id);
    expect(movedToZero[1].id).toBe(unlockedBackdrop.id);
  });

  it("allows deleting unlocked backdrop without auto-recreating it", () => {
    const unlockedBackdrop = { ...backdrop, locked: false };
    const items = [unlockedBackdrop, layer1, layer2];

    const result = removeLayerFromItems(items, unlockedBackdrop.id);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(layer1.id);
    expect(result[1].id).toBe(layer2.id);
  });

  it("reorders group children and rejects if group locked", () => {
    const group = createGroup("Folder", [layer1, layer2, layer3]);
    const items = [backdrop, group];

    const reordered = reorderGroupChild(items, group.id, 0, 2);
    const targetGroup = reordered[1];
    if ("children" in targetGroup) {
      expect(targetGroup.children.map((c) => c.id)).toEqual([layer2.id, layer3.id, layer1.id]);
    }

    const lockedGroup = createGroup("Locked", [layer1, layer2], { locked: true });
    const lockedItems = [backdrop, lockedGroup];
    expect(reorderGroupChild(lockedItems, lockedGroup.id, 0, 1)).toEqual(lockedItems);
  });

  it("moves layer to group and auto-prunes empty source group", () => {
    const group1 = createGroup("Group 1", [layer1]);
    const group2 = createGroup("Group 2", [layer2]);
    const items = [backdrop, group1, group2];

    const result = moveLayerToGroup(items, layer1.id, group2.id);
    // group1 became empty and should be auto-pruned
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(backdrop.id);
    const target = result[1];
    if ("children" in target) {
      expect(target.id).toBe(group2.id);
      expect(target.children.length).toBe(2);
      expect(target.children[0].id).toBe(layer2.id);
      expect(target.children[1].id).toBe(layer1.id);
    }
  });

  it("ejects layer from group and auto-prunes if empty", () => {
    const group = createGroup("Group", [layer1, layer2]);
    const items = [backdrop, group];

    const result = ejectLayerFromGroup(items, layer1.id);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe(backdrop.id);
    const remainingGroup = result[1];
    if ("children" in remainingGroup) {
      expect(remainingGroup.children.length).toBe(1);
      expect(remainingGroup.children[0].id).toBe(layer2.id);
    }
    expect(result[2].id).toBe(layer1.id);
  });

  it("allows renaming locked group", () => {
    const lockedGroup = createGroup("Old Name", [layer1], { locked: true });
    const items = [backdrop, lockedGroup];

    const result = renameGroup(items, lockedGroup.id, "New Name");
    expect((result[1] as any).name).toBe("New Name");
  });

  it("updates group opacity, blendMode, transform, and effectStack", () => {
    const group = createGroup("Folder", [layer1]);
    const items = [group];

    const opResult = setGroupOpacity(items, group.id, 0.75);
    expect((opResult[0] as any).opacity).toBe(0.75);

    const bmResult = setGroupBlendMode(items, group.id, "multiply");
    expect((bmResult[0] as any).blendMode).toBe("multiply");

    const tfResult = updateGroupTransform(items, group.id, { x: 50, y: -20, rotation: 45 });
    expect((tfResult[0] as any).transform.x).toBe(50);
    expect((tfResult[0] as any).transform.y).toBe(-20);
    expect((tfResult[0] as any).transform.rotation).toBe(45);

    const effStack = [
      { instanceId: "eff-1", effectId: "blur" as any, enabled: true, parameters: { radius: 10 } },
    ];
    const effResult = setGroupEffectStack(items, group.id, effStack);
    expect((effResult[0] as any).effectStack).toEqual(effStack);

    // Locked group rejects visual property updates
    const lockedGroup = createGroup("Locked Group", [layer1], { locked: true });
    const lockedItems = [lockedGroup];
    expect(setGroupOpacity(lockedItems, lockedGroup.id, 0.5)).toEqual(lockedItems);
    expect(setGroupBlendMode(lockedItems, lockedGroup.id, "screen")).toEqual(lockedItems);
    expect(updateGroupTransform(lockedItems, lockedGroup.id, { x: 10 })).toEqual(lockedItems);
  });
});
