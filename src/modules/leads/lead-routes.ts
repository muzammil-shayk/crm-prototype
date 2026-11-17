import { apiRoute, readId, readJsonBody, readQuery, type IdContext } from "@/lib/http";
import { listLeads, setLeadStatus } from "./lead-service";

export const leadCollectionRoutes = {
  GET: apiRoute(async (request) => Response.json({ leads: await listLeads(readQuery(request)) })),
};

export const leadItemRoutes = {
  PATCH: apiRoute(async (request, context: IdContext) => {
    const id = await readId(context);
    return Response.json({ lead: await setLeadStatus(id, await readJsonBody(request)) });
  }),
};
