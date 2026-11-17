import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/api-client/types";
import { searchTypes, toPublicSearchType } from "@/modules/search-types/registry";
import { DynamicForm } from "./DynamicForm";
import type { FieldErrors, FormValues } from "./form-values";

const [buyers, jobs] = searchTypes.map(toPublicSearchType);
if (!buyers || !jobs) throw new Error("Both search types must be registered");

function render(fields: readonly FieldDefinition[], values: FormValues = {}, errors: FieldErrors = {}) {
  return renderToStaticMarkup(
    <DynamicForm fields={fields} values={values} errors={errors} onChange={() => undefined} />,
  );
}

function openingTag(html: string, id: string) {
  const match = new RegExp(`<(\\w+)\\b[^>]*\\sid="${id}"[^>]*>`).exec(html);
  if (!match?.[1]) throw new Error(`No element with id ${id}`);
  const tag = match[0];
  const attribute = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
  return { name: match[1], attribute, has: (name: string) => new RegExp(`\\s${name}(=|\\s|>|/)`).test(tag) };
}

describe("DynamicForm", () => {
  it("renders one labelled control per field definition of each search type", () => {
    for (const type of [buyers, jobs]) {
      const html = render(type.fields);
      for (const field of type.fields) {
        expect(openingTag(html, `field-${field.key}`).name).toBeTruthy();
        expect(html).toContain(field.label);
        if (field.kind !== "multiselect") expect(html).toContain(`for="field-${field.key}"`);
      }
    }
  });

  it("picks the control from the field kind", () => {
    const html = render(jobs.fields);
    expect(openingTag(html, "field-rules").name).toBe("textarea");
    expect(openingTag(html, "field-keywords").name).toBe("input");
    expect(openingTag(html, "field-engagementTypes").name).toBe("fieldset");
    expect(html.match(/type="checkbox"/g)).toHaveLength(14);
    expect(html).not.toContain('id="field-minBudgetUsd"');
    expect(openingTag(render(buyers.fields), "field-minBudgetUsd").attribute("type")).toBe("number");
  });

  it("shows current values", () => {
    const html = render(buyers.fields, {
      keywords: ["patient portal"],
      industries: ["fintech"],
      minBudgetUsd: "20000",
    });
    expect(html).toContain("Remove patient portal");
    expect(openingTag(html, "field-industries-fintech").has("checked")).toBe(true);
    expect(openingTag(html, "field-industries-healthcare").has("checked")).toBe(false);
    expect(openingTag(html, "field-minBudgetUsd").attribute("value")).toBe("20000");
  });

  it("puts each error next to its field and links it for assistive tech", () => {
    const html = render(buyers.fields, {}, { keywords: "Add at least one keyword or phrase" });
    expect(html).toContain('id="field-keywords-error"');
    expect(html).toContain("Add at least one keyword or phrase");
    const input = openingTag(html, "field-keywords");
    expect(input.attribute("aria-invalid")).toBe("true");
    expect(input.attribute("aria-describedby")).toContain("field-keywords-error");
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(1);
  });
});
