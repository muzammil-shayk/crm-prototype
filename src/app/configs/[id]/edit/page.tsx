import type { Metadata } from "next";
import { ConfigForm } from "@/components/config-form/ConfigForm";

export const metadata: Metadata = { title: "Edit search config" };

export default async function EditConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConfigForm configId={id} />;
}
