import type { Metadata } from "next";
import { ConfigForm } from "@/components/config-form/ConfigForm";
import { getConfig } from "@/modules/configs/config-service";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const config = await getConfig(id).catch(() => undefined);
  return { title: config ? `Edit ${config.name}` : "Edit search config" };
}

export default async function EditConfigPage({ params }: { params: Params }) {
  const { id } = await params;
  return <ConfigForm configId={id} />;
}
