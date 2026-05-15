import { z } from "zod";

/**
 * Member Validation Schemas
 * Validates: Requirements 13.1
 */

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .email("Invalid email format (RFC 5322)")
    .max(254, "Email must not exceed 254 characters"),
  role_id: z
    .number({ required_error: "Role is required" })
    .int()
    .positive("Role ID must be a positive integer"),
});

export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
