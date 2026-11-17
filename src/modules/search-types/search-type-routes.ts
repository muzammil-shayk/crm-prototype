import { apiRoute } from "@/lib/http";
import { searchTypes, toPublicSearchType } from "./registry";

export const searchTypeRoutes = {
  GET: apiRoute(() => Promise.resolve(Response.json({ searchTypes: searchTypes.map(toPublicSearchType) }))),
};
