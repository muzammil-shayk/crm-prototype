import type { Metadata } from "next";
import { ConfigForm } from "@/components/config-form/ConfigForm";

export const metadata: Metadata = { title: "New search config" };

export default function NewConfigPage() {
  return <ConfigForm />;
}
