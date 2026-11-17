import { z } from "zod";
import { apiRoute, readId, readJsonBody, readQuery, type IdContext } from "@/lib/http";
import { recordIdSchema } from "@/lib/record-id";
import { cancelSearch, getSearchRun, listSearchRuns, startSearch } from "./search-service";

const startSearchSchema = z.strictObject({ configId: recordIdSchema });

export const searchCollectionRoutes = {
  GET: apiRoute(async (request) => Response.json({ runs: await listSearchRuns(readQuery(request)) })),

  POST: apiRoute(async (request) => {
    const { configId } = startSearchSchema.parse(await readJsonBody(request));
    const run = await startSearch(configId);
    return Response.json({ run }, { status: 202, headers: { Location: `/api/searches/${run.id}` } });
  }),
};

export const searchItemRoutes = {
  GET: apiRoute(async (_request, context: IdContext) =>
    Response.json(await getSearchRun(await readId(context))),
  ),
};

export const cancelSearchRoute = {
  POST: apiRoute(async (_request, context: IdContext) =>
    Response.json({ run: await cancelSearch(await readId(context)) }),
  ),
};
