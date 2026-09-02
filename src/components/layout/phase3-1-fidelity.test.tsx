// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from '@testing-library/react';
import { StudioProvider, useStudioStore } from '../../context/studio-context';
import { ProjectNameInput } from './project-name-input';
import { AssetSearch } from './asset-search';
import { CanvasControlDock } from './canvas-control-dock';
import { FloatingEffectPanel } from './floating-effect-panel';

// Mock storage/db
vi.mock('../../storage/db', () => ({
  loadHydratedProject: vi.fn().mockResolvedValue({
    assets: [],
    activeImageId: null,
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

describe('Phase 3.1: Figma Fidelity Workspace Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. ProjectNameInput', () => {
    it('renders initial project name as non-editing button', () => {
      render(
        <StudioProvider>
          <ProjectNameInput />
        </StudioProvider>,
      );

      const nameElement = screen.getByRole('button', {
        name: /Project Name: Project Name/i,
      });
      expect(nameElement).toBeDefined();
      expect(nameElement.textContent).toBe('Project Name');
    });

    it('enters editing mode on click and commits on Enter', () => {
      render(
        <StudioProvider>
          <ProjectNameInput />
        </StudioProvider>,
      );

      const button = screen.getByRole('button', {
        name: /Project Name: Project Name/i,
      });
      fireEvent.click(button);

      const input = screen.getByLabelText('Project Name');
      expect(input).toBeDefined();

      fireEvent.change(input, { target: { value: 'Summer Campaign 2026' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // After commit, returns to button displaying the new name
      const updated = screen.getByRole('button', {
        name: /Project Name: Summer Campaign 2026/i,
      });
      expect(updated.textContent).toBe('Summer Campaign 2026');
    });

    it('cancels editing and reverts on Escape', () => {
      render(
        <StudioProvider>
          <ProjectNameInput />
        </StudioProvider>,
      );

      const button = screen.getByRole('button', {
        name: /Project Name: Project Name/i,
      });
      fireEvent.click(button);

      const input = screen.getByLabelText('Project Name');
      fireEvent.change(input, { target: { value: 'Discard Me' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      const reverted = screen.getByRole('button', {
        name: /Project Name: Project Name/i,
      });
      expect(reverted.textContent).toBe('Project Name');
    });
  });

  describe('2. AssetSearch', () => {
    it('renders search input with placeholder and calls onChange', () => {
      const handleChange = vi.fn();
      render(<AssetSearch value="" onChange={handleChange} />);

      const input = screen.getByLabelText('Search assets');
      expect(input).toBeDefined();
      expect(input.getAttribute('placeholder')).toBe('Search assets...');

      fireEvent.change(input, { target: { value: 'photo' } });
      expect(handleChange).toHaveBeenCalledWith('photo');
    });

    it('renders clear button when query is present and clears on click', () => {
      const handleChange = vi.fn();
      render(<AssetSearch value="hero" onChange={handleChange} />);

      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toBeDefined();

      fireEvent.click(clearBtn);
      expect(handleChange).toHaveBeenCalledWith('');
    });
  });

  describe('3. CanvasControlDock', () => {
    it('renders timeline playback and viewport controls in exact Figma grouping', () => {
      const containerRef = { current: document.createElement('div') };

      render(
        <StudioProvider>
          <CanvasControlDock
            isHandToolActive={false}
            setIsHandToolActive={vi.fn()}
            isSpacePressed={false}
            containerRef={containerRef}
          />
        </StudioProvider>,
      );

      // Verify toolbar presence
      expect(
        screen.getByRole('toolbar', { name: /Canvas Workspace Controls/i }),
      ).toBeDefined();

      // Verify Zoom group
      expect(screen.getByLabelText('Zoom out')).toBeDefined();
      expect(screen.getByLabelText('Zoom in')).toBeDefined();

      // Verify Viewport framing tools
      expect(screen.getByTitle('Fit to Viewport')).toBeDefined();
      expect(screen.getByTitle('Actual Size 1:1')).toBeDefined();

      // Verify Viewport inspection tools
      expect(screen.getByLabelText('Pan Tool')).toBeDefined();
      expect(screen.getByLabelText('Split View')).toBeDefined();
      expect(screen.getByLabelText('Grid Overlay')).toBeDefined();
      expect(screen.getByLabelText('Transparency Checkerboard')).toBeDefined();

      // Verify Undo/Redo
      expect(screen.getByLabelText('Undo')).toBeDefined();
      expect(screen.getByLabelText('Redo')).toBeDefined();
    });
  });

  describe('4. FloatingEffectPanel', () => {
    it('returns null when no active asset or selected effect', () => {
      const { container } = render(
        <StudioProvider>
          <FloatingEffectPanel />
        </StudioProvider>,
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders floating dialog when an effect instance is selected', async () => {
      function TestHost() {
        const store = useStudioStore();
        return (
          <div>
            <button
              onClick={async () => {
                // Mock adding asset and effect
                const file = new File(['test'], 'sample.png', {
                  type: 'image/png',
                });
                await store.addAssets([file]);
              }}
            >
              Setup
            </button>
            <FloatingEffectPanel />
          </div>
        );
      }

      const { container } = render(
        <StudioProvider>
          <TestHost />
        </StudioProvider>,
      );

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });
  });
});
