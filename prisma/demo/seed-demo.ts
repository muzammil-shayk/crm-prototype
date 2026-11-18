import { db } from "@/lib/db";
import { createConfig } from "@/modules/configs/config-service";
import { demoOrganizations } from "./organizations";
import { demoSearchConfigs } from "./search-configs";

export async function seedDemoData() {
  for (const { services, industries, ...organization } of demoOrganizations) {
    const columns = {
      ...organization,
      services: JSON.stringify(services),
      industries: JSON.stringify(industries),
    };
    await db.organization.upsert({ where: { name: organization.name }, create: columns, update: columns });
  }
  for (const config of demoSearchConfigs) {
    if ((await db.searchConfig.count({ where: { name: config.name } })) === 0) await createConfig(config);
  }
}
