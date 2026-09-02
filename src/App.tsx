import * as React from "react";
import { StudioProvider } from "./context/studio-context";
import { AssetPanel, CanvasViewport, InspectorPanel } from "./components/layout";

export function App(): React.JSX.Element {
  const [isNarrow, setIsNarrow] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 900;
    }
    return false;
  });

  const [isAssetsDrawerOpen, setIsAssetsDrawerOpen] = React.useState(false);
  const [isInspectorDrawerOpen, setIsInspectorDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < 900;
      setIsNarrow(narrow);
      if (!narrow) {
        setIsAssetsDrawerOpen(false);
        setIsInspectorDrawerOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <StudioProvider>
      <div className="studio-workspace-grid bg-[color:var(--background)] text-[color:var(--foreground)] font-sans select-none">
        {/* Left Panel: Desktop View */}
        <div className="hidden min-[900px]:block h-full min-h-0 overflow-hidden">
          <AssetPanel />
        </div>

        {/* Center Canvas Viewport */}
        <div className="h-full min-h-0 min-w-0 overflow-hidden relative">
          <CanvasViewport
            isNarrow={isNarrow}
            onOpenAssets={() => setIsAssetsDrawerOpen(true)}
            onOpenInspector={() => setIsInspectorDrawerOpen(true)}
          />
        </div>

        {/* Right Panel: Desktop View */}
        <div className="hidden min-[900px]:block h-full min-h-0 overflow-hidden">
          <InspectorPanel />
        </div>

        {/* Narrow View (<900px): Asset Panel Drawer Overlay */}
        {isNarrow && isAssetsDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setIsAssetsDrawerOpen(false)}
            />
            {/* Slide-over Panel */}
            <div className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
              <AssetPanel onClose={() => setIsAssetsDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* Narrow View (<900px): Inspector Panel Drawer Overlay */}
        {isNarrow && isInspectorDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setIsInspectorDrawerOpen(false)}
            />
            {/* Slide-over Panel */}
            <div className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-right duration-200">
              <InspectorPanel onClose={() => setIsInspectorDrawerOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </StudioProvider>
  );
}
