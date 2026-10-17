import { prisma } from "../utils/prisma.js";
import { dashboardRfqCounts } from "./admin-rfq.service.js";

/** Counts that help a person act. Deliberately no decorative charts. */
export async function dashboardSummary() {
  const [rfq, productsActive, productsArchived, productsFeatured, categoriesActive, contactsNew] = await Promise.all([
    dashboardRfqCounts(),
    prisma.product.count({ where: { archivedAt: null } }),
    prisma.product.count({ where: { archivedAt: { not: null } } }),
    prisma.product.count({ where: { featured: true, archivedAt: null } }),
    prisma.productCategory.count({ where: { archivedAt: null } }),
    prisma.contactEnquiry.count({ where: { status: "NEW" } }),
  ]);
  return {
    rfq,
    products: { active: productsActive, archived: productsArchived, featured: productsFeatured },
    categories: { active: categoriesActive },
    contacts: { new: contactsNew },
  };
}
