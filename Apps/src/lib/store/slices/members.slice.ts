import { createSlice } from "@reduxjs/toolkit";
import type { Member } from "@/lib/api/services/member.service";
import {
  fetchMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
} from "./members.thunks";

export interface MembersState {
  items: Member[];
  loading: boolean;
  error: string | null;
}

const initialState: MembersState = {
  items: [],
  loading: false,
  error: null,
};

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchMembers
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // inviteMember
      .addCase(inviteMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(inviteMember.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(inviteMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // changeMemberRole
      .addCase(changeMemberRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeMemberRole.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(changeMemberRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // removeMember
      .addCase(removeMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((m) => m.id !== action.payload);
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset: resetMembers } = membersSlice.actions;
export default membersSlice.reducer;
