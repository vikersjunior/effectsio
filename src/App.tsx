import * as React from "react";
import { StudioProvider } from "./context/studio-context";
import { TopNav, AssetPanel, CanvasViewport, InspectorPanel } from "./components/layout";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./components/ui";

export function App(): React.JSX.Element {
  return (
    <StudioProvider>
      <div className="flex flex-col w-screen h-screen overflow-hidden bg-[color:var(--background)] text-[color:var(--foreground)] font-sans">
        {/* Top Navigation Bar */}
        <TopNav />

        {/* Main Resizable 3-Column Studio Workspace */}
        <div className="flex-1 w-full min-h-0 min-w-0 overflow-hidden relative">
          <ResizablePanelGroup
            orientation="horizontal"
            className="h-full w-full"
          >
            {/* Left Panel: Image Library */}
            <ResizablePanel
              id="asset-library-panel"
              defaultSize="16%"
              minSize="180px"
              maxSize="320px"
            >
              <AssetPanel />
            </ResizablePanel>

            {/* Left Hairline Resize Seam */}
            <ResizableHandle />

            {/* Center Viewport: Interactive Canvas */}
            <ResizablePanel
              id="canvas-viewport-panel"
              defaultSize="68%"
              minSize="320px"
            >
              <CanvasViewport />
            </ResizablePanel>

            {/* Right Hairline Resize Seam */}
            <ResizableHandle />

            {/* Right Panel: Effects Inspector */}
            <ResizablePanel
              id="inspector-panel"
              defaultSize="16%"
              minSize="200px"
              maxSize="360px"
            >
              <InspectorPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </StudioProvider>
  );
}
