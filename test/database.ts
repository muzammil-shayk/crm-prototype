import { db } from "@/lib/db";

export async function resetDatabase() {
  await db.$transaction([
    db.lead.deleteMany(),
    db.searchRun.deleteMany(),
    db.searchConfig.deleteMany(),
    db.organization.deleteMany(),
    db.cacheEntry.deleteMany(),
  ]);
}

export async function seedOrganizations() {
  await db.organization.createMany({
    data: [
      {
        id: "cm0northwind000000000000",
        name: "Northwind Data Studio",
        description: "Data engineering studio.",
        services: JSON.stringify(["data engineering", "dbt", "Snowflake"]),
        industries: JSON.stringify(["ecommerce", "fintech"]),
        location: "Lahore, Pakistan",
      },
      {
        id: "cm0kestrel00000000000000",
        name: "Kestrel Mobile",
        description: "Mobile product team.",
        services: JSON.stringify(["React Native", "iOS", "Android"]),
        industries: JSON.stringify(["fintech", "healthcare"]),
        location: "Remote",
      },
    ],
  });
}
