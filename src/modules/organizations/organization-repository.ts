import { db } from "@/lib/db";
import { parseStringList } from "@/lib/json";

export interface Organization {
  id: string;
  name: string;
  description: string;
  services: string[];
  industries: string[];
  location: string;
}

export async function listOrganizations(): Promise<Organization[]> {
  const rows = await db.organization.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    ...row,
    services: parseStringList(row.services),
    industries: parseStringList(row.industries),
  }));
}
