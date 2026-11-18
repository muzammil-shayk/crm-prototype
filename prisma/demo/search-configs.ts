export const demoSearchConfigs = [
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
    type: "buyers-seeking-providers",
    name: "Gulf brands shopping for SEO and content",
    description:
      "Property developers, hotels and online shops in the UAE and Saudi Arabia that want an outside team for search and content. Saltmarsh Digital takes these; posts from anywhere else are left out.",
    criteria: {
      keywords: ["SEO", "content marketing"],
      excludedKeywords: ["backlink packages"],
      industries: ["real-estate", "hospitality", "ecommerce"],
      locations: ["UAE", "Saudi Arabia"],
      rules: "A monthly or project budget is stated. English and Arabic content is a plus.",
      minBudgetUsd: 8000,
    },
  },
  {
    type: "buyers-seeking-providers",
    name: "Security audits for fintech and SaaS",
    description:
      "Lenders, payment companies and SaaS teams asking for a paid penetration test, SOC 2 readiness or a GDPR assessment. Bug bounty programmes and free-audit requests are not work we take.",
    criteria: {
      keywords: ["penetration test", "SOC 2", "GDPR"],
      excludedKeywords: ["bug bounty", "free audit", "volunteer"],
      industries: ["fintech", "saas", "healthcare"],
      locations: [],
      rules: "Budget of at least $15k. A named owner for the findings, usually the CTO.",
      minBudgetUsd: 15000,
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
  {
    type: "jobs-for-our-organizations",
    name: "Mobile builds for Kestrel and Quayside",
    description:
      "App contracts in fintech, education and health that Kestrel Mobile (React Native, native iOS and Android) or Quayside Apps (Flutter) can staff this quarter.",
    criteria: {
      keywords: ["mobile app"],
      excludedKeywords: ["unpaid trial"],
      industries: ["fintech", "education", "healthcare"],
      locations: ["Remote", "Pakistan"],
      rules: "Fixed-price builds or hourly work of at least 20 hours a week.",
      servicesToMatch: ["React Native", "Flutter", "iOS", "Android"],
      engagementTypes: ["fixed-price", "hourly"],
    },
  },
  {
    type: "jobs-for-our-organizations",
    name: "Health IT and logistics integrations",
    description:
      "Integration tenders in Pakistan and the Gulf for Medlink Health IT and Tessera Freight Systems. Broad on purpose: it lists more terms than one run searches.",
    criteria: {
      keywords: ["HL7", "FHIR"],
      excludedKeywords: [],
      industries: ["healthcare", "logistics"],
      locations: ["Pakistan", "United Arab Emirates"],
      rules: "Public tenders or fixed-price work with a named technical contact.",
      servicesToMatch: [
        "HL7 integration",
        "EHR integration",
        "telehealth",
        "fleet tracking",
        "warehouse management system",
        "route optimisation",
        "driver app",
      ],
      engagementTypes: ["tender", "fixed-price"],
    },
  },
];
