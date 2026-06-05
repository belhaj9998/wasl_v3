/** Lightweight shape returned by GET /orders/assignees and embedded in Order. */
export interface AssignedUserSummary {
  id: number;
  name: string;
  avatar_url: string | null;
}

/** Same shape as AssignedUserSummary; named for the dropdown context. */
export type EligibleAssignee = AssignedUserSummary;

/** Snapshot side of an ASSIGNEE_CHANGED timeline event after mapper projection. */
export type AssigneeTimelineSnapshot = null | {
  id: number;
  name: string;
  avatar_url: string | null;
  /** True when the live user could not be resolved (deleted / inactive). */
  is_deleted: boolean;
};

export interface AssigneeChangedTimelinePayload {
  from: AssigneeTimelineSnapshot;
  to: AssigneeTimelineSnapshot;
}
