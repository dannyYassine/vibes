import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Presenter } from "../Presenter";
import type { Token } from "@/infra/container/Container";
import { useContainer } from "./ContainerProvider";

export type UsePresenterOptions<TPresenter> = {
  configure?: (presenter: TPresenter) => void;
};

export type UsePresenterResult<TPresenter> = {
  presenter: TPresenter;
  state: TPresenter extends Presenter<infer TState> ? TState : never;
};

export function usePresenter<TPresenter extends Presenter<any>>(
  Token: Token<TPresenter>,
  options: UsePresenterOptions<TPresenter> = {},
): UsePresenterResult<TPresenter> {
  const container = useContainer();

  const presenterRef = useRef<TPresenter | null>(null);
  if (presenterRef.current === null) {
    const presenter = container.resolve(Token);
    options.configure?.(presenter);
    Promise.resolve(presenter.onCreated()).catch((err) => {
      console.error(`[usePresenter] ${Token.name}.onCreated threw:`, err);
    });
    presenterRef.current = presenter;
  }

  const presenter = presenterRef.current;

  const state = useSyncExternalStore(
    (listener) => presenter.subscribe(listener),
    () => presenter.getState(),
    () => presenter.getState(),
  );

  useEffect(() => {
    presenter._markMounted();
    Promise.resolve(presenter.onMounted()).catch((err) => {
      console.error(`[usePresenter] ${Token.name}.onMounted threw:`, err);
    });

    return () => {
      presenter._markUnmounted();
      Promise.resolve(presenter.onDestroyed()).catch((err) => {
        console.error(`[usePresenter] ${Token.name}.onDestroyed threw:`, err);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    presenter,
    state: state as TPresenter extends Presenter<infer S> ? S : never,
  };
}