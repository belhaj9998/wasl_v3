import { RawRecord } from "./mapper.utils";

/**
 * Lightweight projection of a `User` row into the eligible-assignee summary
 * returned by `GET /orders/assignees` and reused wherever an assignee option
 * is surfaced. Only `id`, `name`, and `avatar_url` are exposed — `email`,
 * `phone`, `password`, and every other sensitive field are deliberately
 * omitted so the dropdown never leaks staff PII.
 *
 * Validates: Requirements 2.2, 7.2
 */
export function mapEligibleAssigneeToDto(user: RawRecord): {
  id: number;
  name: string;
  avatar_url: string | null;
} {
  return {
    id: user.id as number,
    name: user.name as string,
    avatar_url: (user.avatar_url as string | null | undefined) ?? null,
  };
}
