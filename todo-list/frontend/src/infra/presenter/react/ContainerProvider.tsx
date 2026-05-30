import { createContext, useContext, type ReactNode } from "react";
import type { Container } from "@/infra/container/Container";

const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({
  container,
  children,
}: {
  container: Container;
  children: ReactNode;
}) {
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer(): Container {
  const container = useContext(ContainerContext);
  if (!container) {
    throw new Error(
      "useContainer must be called inside a <ContainerProvider>.",
    );
  }
  return container;
}