import { createAsyncThunk } from "@reduxjs/toolkit";
import { memberService } from "@/lib/api/services/member.service";
import type {
  ChangeRolePayload,
  InviteMemberPayload,
} from "@/lib/api/services/member.service";
import type { PaginationParams } from "@/types";

export const fetchMembers = createAsyncThunk(
  "members/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await memberService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch members";
      return rejectWithValue(message);
    }
  },
);

export const inviteMember = createAsyncThunk(
  "members/invite",
  async (
    { storeId, payload }: { storeId: number; payload: InviteMemberPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await memberService.invite(storeId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to invite member";
      return rejectWithValue(message);
    }
  },
);

export const changeMemberRole = createAsyncThunk(
  "members/changeRole",
  async (
    {
      storeId,
      memberId,
      payload,
    }: { storeId: number; memberId: number; payload: ChangeRolePayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await memberService.changeRole(
        storeId,
        memberId,
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to change member role";
      return rejectWithValue(message);
    }
  },
);

export const removeMember = createAsyncThunk(
  "members/remove",
  async (
    { storeId, memberId }: { storeId: number; memberId: number },
    { rejectWithValue },
  ) => {
    try {
      await memberService.remove(storeId, memberId);
      return memberId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      return rejectWithValue(message);
    }
  },
);
