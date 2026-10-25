import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootstrapContainer } from "./infra/container/bootstrap";
import { ContainerProvider } from "./infra/presenter/react/ContainerProvider";
import "./styles.css";

const container = bootstrapContainer();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContainerProvider container={container}>
      <App />
    </ContainerProvider>
  </StrictMode>,
);
