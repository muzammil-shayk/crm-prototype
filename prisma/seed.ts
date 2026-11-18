import { db } from "@/lib/db";
import { seedDemoData } from "./demo/seed-demo";

seedDemoData()
  .then(async () => {
    const [organizationCount, configCount] = await Promise.all([
      db.organization.count(),
      db.searchConfig.count(),
    ]);
    process.stdout.write(`Seeded ${organizationCount} organizations and ${configCount} search configs.\n`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
