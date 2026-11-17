import { apiRoute, readId, readJsonBody, type IdContext } from "@/lib/http";
import {
  createConfig,
  deleteConfig,
  duplicateConfig,
  getConfig,
  listConfigs,
  updateConfig,
} from "./config-service";

export const configCollectionRoutes = {
  GET: apiRoute(async () => Response.json({ configs: await listConfigs() })),

  POST: apiRoute(async (request) => {
    const config = await createConfig(await readJsonBody(request));
    return Response.json({ config }, { status: 201 });
  }),
};

export const configItemRoutes = {
  GET: apiRoute(async (_request, context: IdContext) =>
    Response.json({ config: await getConfig(await readId(context)) }),
  ),

  PUT: apiRoute(async (request, context: IdContext) => {
    const id = await readId(context);
    return Response.json({ config: await updateConfig(id, await readJsonBody(request)) });
  }),

  DELETE: apiRoute(async (_request, context: IdContext) => {
    await deleteConfig(await readId(context));
    return new Response(null, { status: 204 });
  }),
};

export const duplicateConfigRoute = {
  POST: apiRoute(async (_request, context: IdContext) => {
    const config = await duplicateConfig(await readId(context));
    return Response.json({ config }, { status: 201 });
  }),
};
