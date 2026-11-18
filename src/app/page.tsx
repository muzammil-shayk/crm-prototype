import { connection } from "next/server";
import type { Json } from "@/api-client/types";
import { ConfigsScreen } from "@/components/configs/ConfigsScreen";
import { listConfigs } from "@/modules/configs/config-service";
import { searchTypes } from "@/modules/search-types/registry";

const toWire = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as Json<T>;

export default async function ConfigsPage() {
  await connection();
  const configs = await listConfigs().catch((error: unknown) => {
    console.error(error);
    return undefined;
  });
  return (
    <ConfigsScreen
      initialConfigs={configs && toWire(configs)}
      initialTypes={searchTypes.map(({ id, label, description, fields }) => ({
        id,
        label,
        description,
        fields: [...fields],
      }))}
    />
  );
}
