// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu } from "./Menu";

afterEach(cleanup);

function setup(disabled = false) {
  const duplicate = vi.fn();
  const remove = vi.fn();
  render(
    <Menu
      label="More actions for Clinics replacing their patient portal"
      disabled={disabled}
      items={[
        { label: "Duplicate", onSelect: duplicate },
        { label: "Delete…", onSelect: remove, danger: true },
      ]}
    />,
  );
  const trigger = screen.getByRole("button", { name: /More actions/ });
  return { trigger, duplicate, remove };
}

function key(target: Element, name: string) {
  act(() => {
    fireEvent.keyDown(target, { key: name });
  });
}

describe("Menu", () => {
  it("opens on click with focus on the first item and moves with the arrow keys", () => {
    const { trigger } = setup();
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      trigger.click();
    });
    const [duplicate, remove] = screen.getAllByRole("menuitem");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(screen.getByRole("menu").id);
    expect(document.activeElement).toBe(duplicate);

    key(duplicate as Element, "ArrowDown");
    expect(document.activeElement).toBe(remove);
    key(remove as Element, "ArrowDown");
    expect(document.activeElement).toBe(duplicate);
    key(duplicate as Element, "End");
    expect(document.activeElement).toBe(remove);
    key(remove as Element, "Home");
    expect(document.activeElement).toBe(duplicate);
  });

  it("closes on Escape and returns focus to the button", () => {
    const { trigger } = setup();
    key(trigger, "ArrowDown");
    expect(screen.getByRole("menu")).toBeTruthy();
    key(screen.getAllByRole("menuitem")[0] as Element, "Escape");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("runs the chosen item, closes, and keeps focus on the button", () => {
    const { trigger, remove } = setup();
    act(() => {
      trigger.click();
    });
    act(() => {
      screen.getByRole("menuitem", { name: "Delete…" }).click();
    });
    expect(remove).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the pointer goes down elsewhere and stays shut while disabled", () => {
    const { trigger } = setup();
    act(() => {
      trigger.click();
    });
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(screen.queryByRole("menu")).toBeNull();
    cleanup();

    const locked = setup(true);
    act(() => {
      locked.trigger.click();
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
