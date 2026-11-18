import type { Metadata } from "next";
import { connection } from "next/server";
import { toJson } from "@/api-client/to-json";
import { ConfigsScreen } from "@/components/configs/ConfigsScreen";
import { listConfigs } from "@/modules/configs/config-service";
import { orUndefined, publicSearchTypes } from "./server-data";

export const metadata: Metadata = { title: "Search configs" };

export default async function ConfigsPage() {
  await connection();
  const configs = await orUndefined(listConfigs());
  return <ConfigsScreen initialConfigs={configs && toJson(configs)} initialTypes={publicSearchTypes()} />;
}
