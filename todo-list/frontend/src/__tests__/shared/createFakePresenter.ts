import { Presenter } from "@/infra/presenter/Presenter";
import { vi, type MockedFunction } from "vitest";

export class FakePresenter<TState> extends Presenter<TState> {
  setStateForTest(patch: Partial<TState>): void {
    (this as unknown as { setState: (p: Partial<TState>) => void }).setState(patch);
  }

  replaceStateForTest(next: TState): void {
    (this as unknown as { replaceState: (n: TState) => void }).replaceState(next);
  }
}

export function createFakePresenter<TState, TMethods extends Record<string, unknown>>(
  initialState: TState,
  methodNames: (keyof TMethods)[],
): FakePresenter<TState> & {
  [K in keyof TMethods]: MockedFunction<TMethods[K] extends (...args: infer A) => infer R ? (...args: A) => R : never>;
} {
  const presenter = new FakePresenter(initialState);
  for (const name of methodNames) {
    (presenter as unknown as Record<string, unknown>)[name as string] = vi.fn();
  }
  return presenter as FakePresenter<TState> & {
    [K in keyof TMethods]: MockedFunction<TMethods[K] extends (...args: infer A) => infer R ? (...args: A) => R : never>;
  };
}