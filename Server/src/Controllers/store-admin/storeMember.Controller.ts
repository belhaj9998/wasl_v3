import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { storeMemberService } from "../../services/store-admin/storeMember.Service";
import { AppRequest } from "../../types";
import { MembershipStatus } from "../../../generated/prisma";

/**
 * StoreMemberController handles store member management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/members
 * Returns a paginated list of store members with optional status and search filters.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const status = req.query.status as MembershipStatus | undefined;
  const search = req.query.search as string | undefined;

  const result = await storeMemberService.list({
    storeId,
    page,
    limit,
    status,
    search,
  });

  sendPaginated(res, result.data, result.meta, "Members retrieved");
});

/**
 * POST /api/stores/:storeId/members/invite
 * Invites a new member to the store by email with a specified role.
 */
export const invite = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const { email, role_id } = req.body;
  const invitedByUserId = req.user!.userId;

  const membership = await storeMemberService.invite(
    storeId,
    { email, role_id },
    invitedByUserId,
  );

  sendSuccess(res, { membership }, "Member invited successfully", 201);
});

/**
 * GET /api/stores/:storeId/members/:memberId
 * Returns details of a specific store member.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const memberId = parseInt(req.params.memberId as string, 10);

  const membership = await storeMemberService.getById(storeId, memberId);

  sendSuccess(res, { membership }, "Member retrieved");
});

/**
 * PATCH /api/stores/:storeId/members/:memberId/role
 * Updates a store member's role.
 */
export const updateRole = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const memberId = parseInt(req.params.memberId as string, 10);
    const { role_id } = req.body;

    const membership = await storeMemberService.updateRole(
      storeId,
      memberId,
      role_id,
    );

    sendSuccess(res, { membership }, "Member role updated");
  },
);

/**
 * DELETE /api/stores/:storeId/members/:memberId
 * Removes a member from the store.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const memberId = parseInt(req.params.memberId as string, 10);
  const actorUserId = req.user!.userId;

  await storeMemberService.remove(storeId, memberId, actorUserId);

  sendSuccess(res, null, "Member removed successfully");
});

/**
 * POST /api/stores/:storeId/members/:memberId/resend-invite
 * Resends an invitation to a member with INVITED status.
 */
export const resendInvitation = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const memberId = parseInt(req.params.memberId as string, 10);

    await storeMemberService.resendInvitation(storeId, memberId);

    sendSuccess(res, null, "Invitation resent successfully");
  },
);
