import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { MembershipStatus } from "../../../generated/prisma";
import { PaginatedResult } from "../../types";

/**
 * Parameters for listing store members with pagination, filtering, and search.
 */
export interface MemberListParams {
  storeId: number;
  page: number;
  limit: number;
  status?: MembershipStatus;
  search?: string;
}

/**
 * Input data for inviting a new member to a store.
 */
export interface InviteMemberInput {
  email: string;
  role_id: number;
}

/**
 * Shared include clause for membership queries — includes User and StoreRole relations.
 */
const memberInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar_url: true,
    },
  },
  role: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

/**
 * StoreMemberService handles the member lifecycle within a store:
 * listing, inviting, viewing, updating roles, removing, and resending invitations.
 */
export class StoreMemberService {
  /**
   * Returns a paginated list of store members with optional status and search filters.
   * Includes related User and StoreRole data.
   */
  async list(params: MemberListParams): Promise<PaginatedResult<any>> {
    const { storeId, page, limit, status, search } = params;

    const where: any = { store_id: storeId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      prisma.storeMembership.findMany({
        where,
        include: memberInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.storeMembership.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Invites a user to the store by email.
   * - Looks up the user by email (404 if not found)
   * - Validates the role belongs to the store (404 if not)
   * - Checks the user is not already a member (409 if they are)
   * - Creates a StoreMembership with status=INVITED
   */
  async invite(
    storeId: number,
    data: InviteMemberInput,
    invitedByUserId: number,
  ) {
    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw AppError.notFound("User with this email not found");
    }

    // Validate role belongs to this store
    const role = await prisma.storeRole.findFirst({
      where: { id: data.role_id, store_id: storeId },
    });

    if (!role) {
      throw AppError.notFound("Role not found in this store");
    }

    // Check user is not already a member of this store
    const existingMembership = await prisma.storeMembership.findUnique({
      where: { store_id_user_id: { store_id: storeId, user_id: user.id } },
    });

    if (existingMembership) {
      throw AppError.conflict("User is already a member of this store");
    }

    // Create membership with INVITED status
    const membership = await prisma.storeMembership.create({
      data: {
        store_id: storeId,
        user_id: user.id,
        role_id: data.role_id,
        status: MembershipStatus.INVITED,
        invited_by_user_id: invitedByUserId,
      },
      include: memberInclude,
    });

    return membership;
  }

  /**
   * Fetches a single membership by ID within a store.
   * Includes User and StoreRole relations.
   * Throws 404 if not found.
   */
  async getById(storeId: number, memberId: number) {
    const membership = await prisma.storeMembership.findFirst({
      where: { id: memberId, store_id: storeId },
      include: memberInclude,
    });

    if (!membership) {
      throw AppError.notFound("Member not found");
    }

    return membership;
  }

  /**
   * Updates a member's role within the store.
   * - Checks membership existence (404)
   * - Checks owner protection (403) — cannot change the store owner's role
   * - Validates the new role belongs to the store (404)
   * - Updates the role_id
   */
  async updateRole(storeId: number, memberId: number, roleId: number) {
    // Check membership exists
    const membership = await prisma.storeMembership.findFirst({
      where: { id: memberId, store_id: storeId },
      include: { role: { select: { slug: true } } },
    });

    if (!membership) {
      throw AppError.notFound("Member not found");
    }

    // Owner protection: cannot change role of the original store owner
    if (
      membership.role.slug === "owner" &&
      membership.invited_by_user_id === null
    ) {
      throw AppError.forbidden("Cannot change the store owner's role");
    }

    // Validate the new role belongs to this store
    const role = await prisma.storeRole.findFirst({
      where: { id: roleId, store_id: storeId },
    });

    if (!role) {
      throw AppError.notFound("Role not found in this store");
    }

    // Update the membership role
    const updated = await prisma.storeMembership.update({
      where: { id: memberId },
      data: { role_id: roleId },
      include: memberInclude,
    });

    return updated;
  }

  /**
   * Removes a member from the store.
   * Order of checks: existence → self-removal → owner protection → deletion
   * (Permission check is handled by middleware before this method is called)
   */
  async remove(storeId: number, memberId: number, actorUserId: number) {
    // Check membership exists
    const membership = await prisma.storeMembership.findFirst({
      where: { id: memberId, store_id: storeId },
      include: { role: { select: { slug: true } } },
    });

    if (!membership) {
      throw AppError.notFound("Member not found");
    }

    // Self-removal check
    if (membership.user_id === actorUserId) {
      throw AppError.forbidden("Cannot remove yourself from the store");
    }

    // Owner protection: cannot remove the original store owner
    if (
      membership.role.slug === "owner" &&
      membership.invited_by_user_id === null
    ) {
      throw AppError.forbidden("Cannot remove the store owner");
    }

    // Delete the membership record
    await prisma.storeMembership.delete({
      where: { id: memberId },
    });
  }

  /**
   * Resends an invitation for a member with INVITED status.
   * - Checks membership existence (404)
   * - Checks status is INVITED (400)
   * - Returns success (actual email delivery is out of scope)
   */
  async resendInvitation(storeId: number, memberId: number) {
    const membership = await prisma.storeMembership.findFirst({
      where: { id: memberId, store_id: storeId },
    });

    if (!membership) {
      throw AppError.notFound("Member not found");
    }

    if (membership.status !== MembershipStatus.INVITED) {
      throw AppError.badRequest(
        "Can only resend invitation for members with INVITED status",
      );
    }

    // Actual email delivery is out of scope for this phase
    // Return success to indicate the invitation was "resent"
  }
}

export const storeMemberService = new StoreMemberService();
