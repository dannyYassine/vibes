import "./index.css";
import { createRoot } from "react-dom/client";
import { bootstrapContainer } from "@/infra/container/bootstrap";
import { ContainerProvider } from "@/infra/presenter/react/ContainerProvider";
import { TodoView } from "@/features/todo/presentation/TodoView";

const container = bootstrapContainer();

createRoot(document.getElementById("root")!).render(
  <ContainerProvider container={container}>
    <TodoView />
  </ContainerProvider>,
);