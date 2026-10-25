import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { Container } from "@/infra/container/Container";
import { Presenter } from "@/infra/presenter/Presenter";
import { renderWithContainer } from "@/__tests__/shared/renderWithContainer";
import { makeGrooveboxViewModel } from "@/__tests__/shared/grooveboxViewModelFactory";
import { GrooveboxPresenter } from "../presentation/GrooveboxPresenter";
import { GrooveboxView } from "../presentation/GrooveboxView";
import type { GrooveboxViewModel } from "../presentation/GrooveboxViewModel";

class FakeGrooveboxPresenter extends Presenter<GrooveboxViewModel> {
  togglePlayback = vi.fn();
  selectPatch = vi.fn();
  adjustTempo = vi.fn();
  changeTempo = vi.fn();
  changeSwing = vi.fn();
  changeMasterVolume = vi.fn();
  changeControl = vi.fn();
  toggleMute = vi.fn();
  changeStep = vi.fn();
  clearPattern = vi.fn();
  selectDrumTrack = vi.fn();
  dismissError = vi.fn();
}

describe("GrooveboxView", () => {
  let container: Container;
  let presenter: FakeGrooveboxPresenter;

  beforeEach(() => {
    container = new Container();
    presenter = new FakeGrooveboxPresenter(makeGrooveboxViewModel());
    container.register(GrooveboxPresenter, () => presenter as unknown as GrooveboxPresenter);
  });

  function renderView() {
    return renderWithContainer(<GrooveboxView />, container);
  }

  it("renders the four units and three patch memories", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "PARALLAX" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DRUMS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "BASS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PADS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "LEAD" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /ORIGINAL PATCH/ })).toHaveLength(3);
  });

  it("switches patches and starts transport through the presenter", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /VELVET TIDE/ }));
    fireEvent.click(screen.getByRole("button", { name: "PLAY" }));

    expect(presenter.selectPatch).toHaveBeenCalledWith("velvet-tide");
    expect(presenter.togglePlayback).toHaveBeenCalledTimes(1);
  });

  it("forwards step accents and drum lane selection", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "SNARE" }));
    fireEvent.click(screen.getByRole("button", { name: "BASS PATTERN step 2" }), { shiftKey: true });

    expect(presenter.selectDrumTrack).toHaveBeenCalledWith(1);
    expect(presenter.changeStep).toHaveBeenCalledWith("bass", 1, true);
  });

  it("forwards live sound and mute controls", () => {
    renderView();

    fireEvent.change(screen.getAllByLabelText("CUTOFF")[1], { target: { value: "1200" } });
    fireEvent.click(screen.getAllByRole("button", { name: "MUTE" })[2]);

    expect(presenter.changeControl).toHaveBeenCalledWith("bass", "cutoff", 1200);
    expect(presenter.toggleMute).toHaveBeenCalledWith("pads");
  });
});
