// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SearchType } from "@/api-client/types";
import { searchTypes, toPublicSearchType } from "@/modules/search-types/registry";
import { ConfigEditor } from "./ConfigEditor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

const [first, ...rest] = searchTypes.map((type): SearchType => ({
  ...toPublicSearchType(type),
  id: type.id,
  fields: [...type.fields],
}));
if (!first) throw new Error("No search types registered");
const editorTypes: [SearchType, ...SearchType[]] = [first, ...rest];

function editor() {
  render(<ConfigEditor types={editorTypes} config={null} />);
}

function submit() {
  act(() => {
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement);
  });
}

describe("ConfigEditor error summary", () => {
  it("lists every failing field by label and links each one to its field", () => {
    editor();
    submit();

    const summary = document.querySelector("[data-error-summary]");
    const links = [...(summary?.querySelectorAll("a") ?? [])];
    const required = first.fields.filter((field) => field.required).map((field) => field.label);
    expect(links.map((link) => link.textContent)).toEqual(["Name", ...required]);
    expect(document.activeElement).toBe(links[0]);

    act(() => {
      links[0]?.click();
    });
    expect(document.activeElement?.id).toBe("field-name");
  });
});

describe("ConfigEditor cancel", () => {
  it("leaves a clean form without asking", () => {
    editor();
    act(() => {
      screen.getByRole("link", { name: "Cancel" }).click();
    });
    expect(screen.queryByText("Discard your changes?")).toBeNull();
  });

  it("asks before throwing away edits", () => {
    editor();
    act(() => {
      fireEvent.change(document.getElementById("field-name") as HTMLInputElement, {
        target: { value: "Clinics replacing their patient portal" },
      });
    });
    act(() => {
      screen.getByRole("link", { name: "Cancel" }).click();
    });
    expect(screen.getByText("Discard your changes?")).toBeTruthy();

    act(() => {
      screen.getByRole("button", { name: "Keep editing" }).click();
    });
    expect(screen.queryByText("Discard your changes?")).toBeNull();
    expect(push).not.toHaveBeenCalled();

    act(() => {
      screen.getByRole("link", { name: "Cancel" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: "Discard" }).click();
    });
    expect(push).toHaveBeenCalledWith("/");
  });
});
