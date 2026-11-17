import Link from "next/link";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <div className="page page-narrow">
      <EmptyState
        title="This page does not exist"
        action={
          <Link href="/" className="button">
            Back to search configs
          </Link>
        }
      >
        The link may be out of date, or the config it pointed to was deleted.
      </EmptyState>
    </div>
  );
}
