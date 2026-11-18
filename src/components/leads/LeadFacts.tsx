import type { Lead, SearchType, SearchTypeId } from "@/api-client/types";
import { formatDate, formatUsd } from "@/components/format";
import styles from "./leads.module.css";

export function optionLabel(types: readonly SearchType[], value: string): string {
  for (const type of types) {
    for (const field of type.fields) {
      if (field.kind !== "multiselect") continue;
      const option = field.options.find((item) => item.value === value);
      if (option) return option.label;
    }
  }
  return value;
}

interface LeadFactsProps {
  lead: Lead;
  types: readonly SearchType[];
  configType: string;
}

const MATCHES_ORGANIZATIONS: SearchTypeId = "jobs-for-our-organizations";

export function LeadFacts({ lead, types, configType }: LeadFactsProps) {
  const facts: [string, string][] = [
    ["Company", lead.company],
    ["Location", lead.location],
    ["Industry", optionLabel(types, lead.industry)],
    ["Budget", lead.budgetUsd === null ? "Not stated" : formatUsd(lead.budgetUsd)],
  ];
  if (lead.engagementType) facts.push(["Engagement", optionLabel(types, lead.engagementType)]);
  facts.push(["Posted", `${formatDate(lead.publishedAt)} on ${lead.source}`]);

  const isJob = configType === MATCHES_ORGANIZATIONS;

  return (
    <section className={styles.detailSection} aria-labelledby="facts-heading">
      <h3 id="facts-heading" className={styles.detailHeading}>
        Details
      </h3>
      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {isJob ? (
          <div className={styles.fact}>
            <dt>Matched organization</dt>
            <dd>{lead.matchedOrganization?.name ?? "None of our organizations covers this work"}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
