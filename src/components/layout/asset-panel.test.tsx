// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StudioProvider } from '../../context/studio-context';
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
}));

describe('AssetPanel: Add Asset Controls (Correction 02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

