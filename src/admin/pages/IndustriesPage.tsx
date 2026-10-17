import ManagedListPage from "@/admin/pages/ManagedListPage";
import { adminApi } from "@/admin/api";

const config = {
  title: "Industries",
  description: "Sectors listed on the website. Keep them to sectors you actually serve.",
  primaryKey: "name" as const,
  primaryLabel: "Industry name",
  secondaryKey: "summary" as const,
  secondaryLabel: "Summary",
  primaryMax: 80,
  secondaryMax: 300,
  load: adminApi.industries,
  create: (v: { primary: string; secondary: string }) => adminApi.createIndustry({ name: v.primary, summary: v.secondary }),
  update: (id: string, v: { primary: string; secondary: string }) => adminApi.updateIndustry(id, { name: v.primary, summary: v.secondary }),
};

export default function IndustriesPage() {
  return <ManagedListPage config={config} />;
}
