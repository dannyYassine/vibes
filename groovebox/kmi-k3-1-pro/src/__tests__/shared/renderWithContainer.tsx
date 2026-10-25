import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Container } from "@/infra/container/Container";
import { ContainerProvider } from "@/infra/presenter/react/ContainerProvider";

export function renderWithContainer(view: ReactElement, container: Container) {
  return render(<ContainerProvider container={container}>{view}</ContainerProvider>);
}
