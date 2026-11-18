import type { SearchType } from "@/api-client/types";
import { searchTypes } from "@/modules/search-types/registry";

export const publicSearchTypes = (): SearchType[] =>
  searchTypes.map(({ id, label, description, fields }) => ({ id, label, description, fields: [...fields] }));

export async function orUndefined<T>(load: Promise<T>): Promise<T | undefined> {
  try {
    return await load;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
