import { db } from "@/lib/db";
import { createConfig } from "@/modules/configs/config-service";

const organizations = [
  {
    name: "Northwind Data Studio",
    description: "Eight-person data team building warehouses, pipelines and finance reporting.",
    services: ["data engineering", "dbt", "Snowflake", "BigQuery", "analytics dashboards"],
    industries: ["ecommerce", "fintech", "healthcare"],
    location: "Lahore, Pakistan (remote-first)",
  },
  {
    name: "Kestrel Mobile",
    description: "Product studio shipping iOS and Android apps for regulated industries.",
    services: ["React Native", "iOS", "Android", "mobile app"],
    industries: ["fintech", "healthcare", "education"],
    location: "Remote",
  },
  {
    name: "Fernhill Web Co",
    description: "Web agency for booking flows, patient portals and online stores.",
    services: ["Next.js", "patient portal", "Shopify", "website redesign"],
    industries: ["healthcare", "hospitality", "ecommerce"],
    location: "Manchester, United Kingdom",
  },
  {
    name: "Larkspur Cloud",
    description: "Cloud engineers who migrate legacy systems and cut hosting bills.",
    services: ["AWS", "Kubernetes", "cloud migration", "DevOps"],
    industries: ["saas", "real-estate", "logistics"],
    location: "Remote",
  },
];

const configs = [
  {
    type: "buyers-seeking-providers",
    name: "Healthcare and fintech teams hiring an app agency",
    description:
      "Clinic groups, lenders and insurers in the UK and US who are asking for an outside team to build a portal or mobile app. We want posts from the person who owns the budget, not job ads for in-house roles.",
    criteria: {
      keywords: ["patient portal", "looking for an agency", "development partner"],
      excludedKeywords: ["equity only", "unpaid"],
      industries: ["healthcare", "fintech"],
      locations: ["United Kingdom", "United States"],
      rules: "Budget is stated or the poster can sign off spend. Work starts within three months.",
      minBudgetUsd: 20000,
    },
  },
  {
    type: "jobs-for-our-organizations",
    name: "Data and cloud contracts for our studios",
    description:
      "Remote contracts and tenders that Northwind Data Studio or Larkspur Cloud could deliver with their current team.",
    criteria: {
      keywords: ["data pipeline", "cloud migration"],
      excludedKeywords: ["internship"],
      locations: ["Remote"],
      rules: "Fixed scope or a monthly retainer. No full-time hires.",
      servicesToMatch: ["data engineering", "dbt", "AWS", "Kubernetes"],
      engagementTypes: ["fixed-price", "retainer"],
    },
  },
];

async function seed() {
  for (const { services, industries, ...organization } of organizations) {
    const columns = {
      ...organization,
      services: JSON.stringify(services),
      industries: JSON.stringify(industries),
    };
    await db.organization.upsert({ where: { name: organization.name }, create: columns, update: columns });
  }
  for (const config of configs) {
    if ((await db.searchConfig.count({ where: { name: config.name } })) === 0) await createConfig(config);
  }
}

seed()
  .then(async () => {
    const [organizationCount, configCount] = await Promise.all([
      db.organization.count(),
      db.searchConfig.count(),
    ]);
    process.stdout.write(`Seeded ${organizationCount} organizations and ${configCount} search configs.\n`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
