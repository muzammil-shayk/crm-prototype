import { apiRoute } from "@/lib/http";
import { listOrganizations } from "./organization-repository";

export const organizationRoutes = {
  GET: apiRoute(async () => Response.json({ organizations: await listOrganizations() })),
};
