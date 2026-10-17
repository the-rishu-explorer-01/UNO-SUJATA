import ManagedListPage from "@/admin/pages/ManagedListPage";
import { adminApi } from "@/admin/api";

const config = {
  title: "Capabilities",
  description: "Manufacturing capabilities shown on the website. Only list what the workshop can actually do.",
  primaryKey: "title" as const,
  primaryLabel: "Capability title",
  secondaryKey: "description" as const,
  secondaryLabel: "Description",
  primaryMax: 120,
  secondaryMax: 400,
  load: adminApi.capabilities,
  create: (v: { primary: string; secondary: string }) => adminApi.createCapability({ title: v.primary, description: v.secondary }),
  update: (id: string, v: { primary: string; secondary: string }) => adminApi.updateCapability(id, { title: v.primary, description: v.secondary }),
};

export default function CapabilitiesPage() {
  return <ManagedListPage config={config} />;
}
