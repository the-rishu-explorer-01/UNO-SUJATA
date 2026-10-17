import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { audit } from "./audit.service.js";
import { isValidGstin } from "../lib/gstin.js";

/**
 * Customer records (CRM). Customer identification only: GSTIN is stored as a reference field,
 * and is format-checked, never verified against the GST portal.
 */
export interface CustomerInput {
  name: string;
  billingAddress: string;
  shippingAddress?: string;
  gstin?: string;
  stateName: string;
  stateCode: string;
  contactName?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export async function listCustomers(includeInactive: boolean) {
  return prisma.customer.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, billingAddress: true, shippingAddress: true, gstin: true, stateName: true, stateCode: true, contactName: true, phone: true, email: true, active: true },
  });
}

export function assertCustomerInput(input: CustomerInput) {
  if (input.gstin && !isValidGstin(input.gstin)) throw new HttpError(422, "GSTIN format is not valid", { gstin: ["Format not valid"] });
}

export async function createCustomer(actorId: string, input: CustomerInput) {
  assertCustomerInput(input);
  const row = await prisma.customer.create({ data: input, select: { id: true } });
  await audit({ actorId, action: "customer.created", entityType: "Customer", entityId: row.id, summary: `Added customer ${input.name}` });
  return row;
}

export async function updateCustomer(actorId: string, id: string, input: CustomerInput) {
  assertCustomerInput(input);
  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Customer not found");
  await prisma.customer.update({ where: { id }, data: input });
  await audit({ actorId, action: "customer.updated", entityType: "Customer", entityId: id, summary: `Updated customer ${input.name}` });
}
