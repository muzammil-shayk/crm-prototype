import type { SearchConfig as SearchConfigRow } from "@prisma/client";
import { db, nullIfMissing } from "@/lib/db";
import type { SearchConfigInput } from "@/modules/search-types/registry";

function toColumns(input: SearchConfigInput) {
  return {
    type: input.type,
    name: input.name,
    description: input.description,
    criteria: JSON.stringify(input.criteria),
  };
}

export const configRepository = {
  insert: (input: SearchConfigInput): Promise<SearchConfigRow> =>
    db.searchConfig.create({ data: toColumns(input) }),

  findAll: (): Promise<SearchConfigRow[]> => db.searchConfig.findMany({ orderBy: { updatedAt: "desc" } }),

  findById: (id: string): Promise<SearchConfigRow | null> => db.searchConfig.findUnique({ where: { id } }),

  replace: (id: string, input: SearchConfigInput): Promise<SearchConfigRow | null> =>
    nullIfMissing(db.searchConfig.update({ where: { id }, data: toColumns(input) })),

  remove: async (id: string): Promise<boolean> =>
    (await nullIfMissing(db.searchConfig.delete({ where: { id } }))) !== null,
};
