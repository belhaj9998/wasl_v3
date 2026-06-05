/**
 * Order Assignee Form Validator
 *
 * Mirrors the backend Zod schema `assignAssigneeSchema` in
 * `Server/src/validators/order.validators.ts`:
 * a single `user_id` field that is a positive integer OR `null`
 * (null represents the "Unassign" sentinel), with no extra fields.
 *
 * Used by the Assignee_Card dropdown form for client-side validation; the
 * server still enforces the same constraints and surfaces error codes
 * (VALIDATION_ERROR, ASSIGNEE_NOT_ELIGIBLE) for unrecoverable cases.
 */

import { z } from "zod";

export const assigneeSchema = z
  .object({
    user_id: z.number().int().positive().nullable(),
  })
  .strict();

export type AssigneeFormValues = z.infer<typeof assigneeSchema>;
