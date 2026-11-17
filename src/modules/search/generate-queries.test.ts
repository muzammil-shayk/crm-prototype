import { describe, expect, it } from "vitest";
import { parseSearchConfigInput } from "@/modules/search-types/registry";
import { generateQueries } from "./generate-queries";

const jobsConfig = parseSearchConfigInput({
  type: "jobs-for-our-organizations",
  name: "Data contracts",
  criteria: {
    keywords: ["data pipeline", "Data Engineering"],
    servicesToMatch: ["data engineering", "dbt"],
  },
});

const buyersConfig = parseSearchConfigInput({
  type: "buyers-seeking-providers",
  name: "Clinics",
  criteria: { keywords: ["patient portal"] },
});

describe("generateQueries", () => {
  it("builds one query per distinct term from the type's query fields, ignoring case", () => {
    expect(generateQueries(jobsConfig, 10)).toEqual({
      queries: [
        { text: "data pipeline", leadKind: "job" },
        { text: "Data Engineering", leadKind: "job" },
        { text: "dbt", leadKind: "job" },
      ],
      truncated: false,
    });
  });

  it("uses only keywords for the buyers type and tags queries with the buyer lead kind", () => {
    expect(generateQueries(buyersConfig, 10).queries).toEqual([
      { text: "patient portal", leadKind: "buyer" },
    ]);
  });

  it("caps the number of queries and reports the cut", () => {
    expect(generateQueries(jobsConfig, 2)).toEqual({
      queries: [
        { text: "data pipeline", leadKind: "job" },
        { text: "Data Engineering", leadKind: "job" },
      ],
      truncated: true,
    });
  });
});
