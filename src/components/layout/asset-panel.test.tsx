// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StudioProvider } from '../../context/studio-context';
import { loadHydratedProject } from '../../storage/db';
import { AssetPanel } from './asset-panel';

const { mockSampleAsset } = vi.hoisted(() => ({
  mockSampleAsset: {
    id: 'asset-1',
    filename: 'test-image.png',
    mimeType: 'image/png',
    fileSize: 2048,
    objectUrl: 'blob:test-image',
    width: 800,
    height: 600,
    aspectRatio: 1.33,
    thumbnailUrl: 'blob:thumb-1',
    createdAt: 1000,
  },
}));

// Mock storage/db with pre-hydrated asset so panel renders populated state
vi.mock('../../storage/db', () => ({
  loadHydratedProject: vi.fn().mockResolvedValue({
    assets: [mockSampleAsset],
    frames: [],
    activeFrameId: null,
    activeLayerId: null,
    activeImageId: 'asset-1',
    projectName: 'Project Name',
    effectStacks: {},
    backgrounds: {},
    userLooks: [],
  }),
  dbSaveAsset: vi.fn().mockResolvedValue(undefined),
  dbDeleteAsset: vi.fn().mockResolvedValue(undefined),
  dbSaveEffectStack: vi.fn().mockResolvedValue(undefined),
  dbDeleteEffectStack: vi.fn().mockResolvedValue(undefined),
  dbSaveBackground: vi.fn().mockResolvedValue(undefined),
  dbDeleteBackground: vi.fn().mockResolvedValue(undefined),
  dbSaveUserLook: vi.fn().mockResolvedValue(undefined),
  dbDeleteUserLook: vi.fn().mockResolvedValue(undefined),
  dbSaveSessionState: vi.fn().mockResolvedValue(undefined),
  dbSaveFrame: vi.fn().mockResolvedValue(undefined),
  dbSaveFrames: vi.fn().mockResolvedValue(undefined),
  dbDeleteFrame: vi.fn().mockResolvedValue(undefined),
  dbGetAllFrames: vi.fn().mockResolvedValue([]),
}));

describe('AssetPanel: Add Asset Controls (Correction 02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadHydratedProject).mockResolvedValue({
      assets: [mockSampleAsset],
      frames: [],
      activeFrameId: null,
      activeLayerId: null,
      activeImageId: 'asset-1',
      projectName: 'Project Name',
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders section header Add button with accessible label and icon-sm size', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const headerButton = await screen.findByRole('button', { name: /import media/i });
    expect(headerButton).toBeDefined();
    expect(headerButton.getAttribute('title')).toBe('Import media');
    expect(headerButton.getAttribute('data-size')).toBe('icon-sm');
    expect(headerButton.querySelector('svg')).toBeDefined();
  });

  it('delegates header button click to hidden file input', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const clickSpy = vi.spyOn(fileInput, 'click');
    const headerButton = await screen.findByRole('button', { name: /import media/i });
    fireEvent.click(headerButton);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('renders Add-Asset tile as a semantic accessible button in populated state', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const addTileButton = await screen.findByRole('button', { name: /add asset/i });
    expect(addTileButton).toBeDefined();
    expect(addTileButton.tagName.toLowerCase()).toBe('button');
    expect(addTileButton.getAttribute('type')).toBe('button');
    expect(addTileButton.getAttribute('title')).toBe('Add asset');

    // Verify SVG icon exists inside the tile
    const svgIcon = addTileButton.querySelector('svg');
    expect(svgIcon).toBeDefined();

    // Verify file input delegation
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(addTileButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('provides visible focus ring and hover classes on the Add-Asset tile', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const addTileButton = await screen.findByRole('button', { name: /add asset/i });
    const className = addTileButton.className;

    // Check focus-visible ring styles
    expect(className).toContain('focus-visible:ring-2');
    expect(className).toContain('focus-visible:outline-none');

    // Check hover surface styles
    expect(className).toContain('hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)]');
    expect(className).toContain('hover:text-[color:var(--foreground)]');

    // Check aspect-square and rounded-md
    expect(className).toContain('aspect-square');
    expect(className).toContain('rounded-md');
  });

  it('applies canonical primary brand accent to the selected asset thumbnail ring', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    // Wait for populated grid
    await screen.findByRole('button', { name: /add asset/i });

    // The mock asset 'asset-1' is active and selected
    const selectedThumbnail = container.querySelector('img[alt="test-image.png"]')?.parentElement;
    expect(selectedThumbnail).toBeDefined();
    expect(selectedThumbnail?.className).toContain('ring-2');
    expect(selectedThumbnail?.className).toContain('ring-[color:var(--primary)]');
    expect(selectedThumbnail?.className).toContain('ring-offset-2');
    expect(selectedThumbnail?.className).not.toContain('var(--link)');
  });

  it('uses loosened gap-4 spacing between search input and thumbnail grid', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByRole('button', { name: /add asset/i });

    const populatedContainer = container.querySelector('.flex.flex-col.gap-4');
    expect(populatedContainer).toBeDefined();
  });

  it('provides tactile hover surface on ghost buttons matching search input aesthetic', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const headerButton = await screen.findByRole('button', { name: /import media/i });
    expect(headerButton.className).toContain(
      'hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]',
    );
  });
});

describe('AssetPanel: Empty State (Correction 02.7 — Figma 50:1165)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadHydratedProject).mockResolvedValue({
      assets: [],
      frames: [],
      activeFrameId: null,
      activeLayerId: null,
      activeImageId: null,
      projectName: 'Project Name',
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Empty state renders CloudArrowUp icon', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByText('Add media');
    const cloudIcon = container.querySelector('[data-slot="cloud-upload-icon"]');
    expect(cloudIcon).toBeDefined();
    expect(cloudIcon?.tagName.toLowerCase()).toBe('svg');
  });

  it('2. "Add media" renders', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const title = await screen.findByText('Add media');
    expect(title).toBeDefined();
    expect(title.className).toContain('text-base');
    expect(title.className).toContain('font-medium');
  });

  it('3. Description renders exact text', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const desc = await screen.findByText(
      'Drag here, import from your computer or choose from a stock image',
    );
    expect(desc).toBeDefined();
    expect(desc.className).toContain('text-xs');
  });

  it('4. "Stock library" renders', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const stockBtn = await screen.findByRole('button', { name: 'Stock library' });
    expect(stockBtn).toBeDefined();
  });

  it('5. "Import media" renders in empty state', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByText('Add media');
    const emptyStateImportBtn = container.querySelector(
      '[data-slot="asset-empty-state"] button[data-variant="primary"]',
    );
    expect(emptyStateImportBtn).toBeDefined();
    expect(emptyStateImportBtn?.textContent).toContain('Import media');
  });

  it('6. Stock library retains current behavior (file input fallback)', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const stockBtn = await screen.findByRole('button', { name: 'Stock library' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(stockBtn);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('7. Import media retains current behavior (opens file input)', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByText('Add media');
    const emptyStateImportBtn = container.querySelector(
      '[data-slot="asset-empty-state"] button[data-variant="primary"]',
    ) as HTMLButtonElement;
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(emptyStateImportBtn);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('8. Empty state contains no dashed outer dropzone', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByText('Add media');
    const emptyState = container.querySelector('[data-slot="asset-empty-state"]');
    expect(emptyState).toBeDefined();
    expect(emptyState?.querySelector('.border-dashed')).toBeNull();
    expect(emptyState?.className).not.toContain('border-dashed');
  });

  it('9. Empty state contains no extra wrapper card styling', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByText('Add media');
    const emptyState = container.querySelector('[data-slot="asset-empty-state"]');
    expect(emptyState?.className).not.toContain('border');
    expect(emptyState?.className).not.toContain('rounded-lg');
    expect(emptyState?.querySelector('.rounded-lg')).toBeNull();
  });

  it('10. Both buttons use equal/full width', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const stockBtn = await screen.findByRole('button', { name: 'Stock library' });
    const importBtn = container.querySelector(
      '[data-slot="asset-empty-state"] button[data-variant="primary"]',
    ) as HTMLButtonElement;

    expect(stockBtn.className).toContain('w-full');
    expect(importBtn.className).toContain('w-full');
  });

  it('11. Stock library uses the soft/muted variant', async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    const stockBtn = await screen.findByRole('button', { name: 'Stock library' });
    expect(stockBtn.getAttribute('data-variant')).toBe('secondary');
    expect(stockBtn.className).toContain('bg-[color:var(--secondary)]');
  });

  it('12. Import media uses the primary variant', async () => {
    const { container } = render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>,
    );

    await screen.findByText('Add media');
    const importBtn = container.querySelector(
      '[data-slot="asset-empty-state"] button[data-variant="primary"]',
    ) as HTMLButtonElement;

    expect(importBtn.getAttribute('data-variant')).toBe('primary');
  });
});

