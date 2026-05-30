import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { Container } from "@/infra/container/Container";
import { ContainerProvider } from "@/infra/presenter/react/ContainerProvider";

export function renderWithContainer(
  ui: ReactElement,
  container: Container,
): RenderResult {
  return render(<ContainerProvider container={container}>{ui}</ContainerProvider>);
}