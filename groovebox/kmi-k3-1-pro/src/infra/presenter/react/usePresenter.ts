import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Token } from "@/infra/container/Container";
import { useContainer } from "./ContainerProvider";

type PresenterLike = {
  onCreated(): void | Promise<void>;
  onMounted(): void | Promise<void>;
  onDestroyed(): void | Promise<void>;
  _markMounted(): void;
  _markUnmounted(): void;
  subscribe(listener: (state: unknown) => void): () => void;
  getState(): unknown;
};

type PresenterState<TPresenter> = TPresenter extends { getState(): infer TState } ? TState : never;

export function usePresenter<TPresenter extends PresenterLike>(token: Token<TPresenter>) {
  const container = useContainer();
  const presenterRef = useRef<TPresenter | null>(null);

  if (presenterRef.current === null) {
    const presenter = container.resolve(token);
    Promise.resolve(presenter.onCreated()).catch((error: unknown) => {
      console.error(`[usePresenter] ${token.name}.onCreated failed`, error);
    });
    presenterRef.current = presenter;
  }

  const presenter = presenterRef.current;
  const state = useSyncExternalStore(
    (listener) => presenter.subscribe(listener),
    () => presenter.getState(),
    () => presenter.getState(),
  ) as PresenterState<TPresenter>;

  useEffect(() => {
    presenter._markMounted();
    Promise.resolve(presenter.onMounted()).catch((error: unknown) => {
      console.error(`[usePresenter] ${token.name}.onMounted failed`, error);
    });
    return () => {
      presenter._markUnmounted();
      Promise.resolve(presenter.onDestroyed()).catch((error: unknown) => {
        console.error(`[usePresenter] ${token.name}.onDestroyed failed`, error);
      });
    };
  }, [presenter, token]);

  return { presenter, state };
}
