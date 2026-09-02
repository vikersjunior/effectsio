import * as React from "react";

export type PortalLayerContainer =
  | HTMLElement
  | ShadowRoot
  | null
  | React.RefObject<HTMLElement | ShadowRoot | null>
  | undefined;

export const PortalLayerContainerContext = React.createContext<PortalLayerContainer>(undefined);

export function PortalLayerContainerProvider({
  children,
  container,
}: {
  children: React.ReactNode;
  container: PortalLayerContainer;
}): React.JSX.Element {
  return (
    <PortalLayerContainerContext.Provider value={container}>
      {children}
    </PortalLayerContainerContext.Provider>
  );
}

export function usePortalLayerContainer(container?: PortalLayerContainer): PortalLayerContainer {
  const inheritedContainer = React.useContext(PortalLayerContainerContext);
  return container ?? inheritedContainer;
}
