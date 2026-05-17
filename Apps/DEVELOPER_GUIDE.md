# Developer Guide — Wasl SaaS Frontend

A practical, copy-paste-friendly guide for adding new pages, services, Redux slices, and common patterns in the Wasl SaaS frontend application.

## Prerequisites

- Node.js 18+
- Familiarity with Next.js 15 App Router, TypeScript, Redux Toolkit
- The project uses: React Hook Form + Zod (forms), TanStack Table (tables), next-intl (i18n), shadcn/ui (components)

## Table of Contents

1. [How to Add a New Page](#1-how-to-add-a-new-page)
2. [How to Add a New API Service](#2-how-to-add-a-new-api-service)
3. [How to Add a New Redux Slice](#3-how-to-add-a-new-redux-slice)
4. [Pattern: CRUD Page](#4-pattern-crud-page)
5. [Pattern: Form with Validation](#5-pattern-form-with-validation)
6. [Pattern: Table with Pagination](#6-pattern-table-with-pagination)

---

## 1. How to Add a New Page

This project uses Next.js 15 App Router with a Server Component + Client Component pattern.

### Step 1: Choose the Route Group

Pages live under `src/app/` in route groups:

- `(auth)/` — Login, register, password reset
- `(platform)/` — Platform admin dashboard
- `(store-admin)/admin/` — Store management dashboard
- `(storefront)/[domain]/` — Customer-facing store

### Step 2: Create the Page Directory

```bash
# Example: adding a "reports" page under store-admin
mkdir -p src/app/\(store-admin\)/admin/reports
```

### Step 3: Create the Server Component (page.tsx)

The `page.tsx` is a Server Component responsible for data fetching and metadata.

```tsx
// src/app/(store-admin)/admin/reports/page.tsx
import { Suspense } from "react";
import ReportsPageClient from "./ReportsPageClient";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Reports Page — Server Component (Container)
 *
 * Follows the Container/Presentational pattern:
 * - This Server Component handles the page shell and Suspense boundary
 * - ReportsPageClient handles interactivity and Redux state
 */
export default function ReportsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} columns={5} filterCount={2} />}>
      <ReportsPageClient />
    </Suspense>
  );
}
```

> **Dynamic Metadata (for Storefront pages):** Use `generateMetadata` when the title depends on fetched data:
>
> ```tsx
> // src/app/(storefront)/[domain]/products/[id]/page.tsx
> import type { Metadata } from "next";
>
> export async function generateMetadata({ params }): Promise<Metadata> {
>   const product = await fetchProduct(params.domain, params.id);
>   return {
>     title: product.name.slice(0, 70),
>     description: (product.description || "").slice(0, 160),
>   };
> }
> ```

### Step 4: Create the Client Component

The Client Component handles interactivity, state, and event handlers.

```tsx
// src/app/(store-admin)/admin/reports/ReportsPageClient.tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

export default function ReportsPageClient() {
  const t = useTranslations("reports");
  const dispatch = useAppDispatch();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {/* Interactive content here */}
    </div>
  );
}
```

### Step 5: Add Translation Keys

Add entries to both `messages/ar.json` and `messages/en.json`:

```json
{
  "reports": {
    "title": "Reports",
    "description": "View store analytics and reports"
  }
}
```

### Step 6: (Optional) Add a Loading File

Next.js uses `loading.tsx` for instant loading states during navigation:

```tsx
// src/app/(store-admin)/admin/reports/loading.tsx
import { TableSkeleton } from "@/components/shared/TableSkeleton";

export default function Loading() {
  return <TableSkeleton rows={10} columns={5} filterCount={2} />;
}
```

### Key Rules

- **Never** use `useState`, `useEffect`, or event handlers in Server Components
- **Always** add `"use client"` directive at the top of Client Components
- **Always** use `useTranslations()` for text — no hardcoded strings
- Wrap async data sections with `<Suspense>` and a skeleton fallback

---

## 2. How to Add a New API Service

API services live in `src/lib/api/services/` and use the centralized `apiClient` wrapper.

### Step 1: Define the Endpoint in Constants

```ts
// src/lib/constants/api.ts — add to API_ENDPOINTS
STORE: {
  // ... existing endpoints
  REPORTS: (storeId: number) => `/stores/${storeId}/reports`,
}
```

### Step 2: Create the Service File

```ts
// src/lib/api/services/report.service.ts

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Report {
  id: number;
  title: string;
  type: "sales" | "inventory" | "customers";
  generated_at: string;
  data: Record<string, unknown>;
}

export interface CreateReportPayload {
  title: string;
  type: "sales" | "inventory" | "customers";
  date_from: string;
  date_to: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const reportService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Report>>(
      `${API_ENDPOINTS.STORE.REPORTS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, reportId: number) {
    return apiClient<ApiResponse<Report>>(
      `${API_ENDPOINTS.STORE.REPORTS(storeId)}/${reportId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateReportPayload) {
    return apiClient<ApiResponse<Report>>(
      API_ENDPOINTS.STORE.REPORTS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  delete(storeId: number, reportId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.REPORTS(storeId)}/${reportId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },
};
```

### Step 3: Export from the Index

```ts
// src/lib/api/services/index.ts
export { reportService } from "./report.service";
```

### Key Rules

- **Always** pass `storeId` in options for store-scoped endpoints
- Use `apiClient<T>()` with proper generic types
- The client handles auth tokens, refresh, and error responses automatically
- GET requests get automatic retry with exponential backoff (1s, 2s, 4s)
- POST/PUT/PATCH/DELETE are **never** retried automatically

---

## 3. How to Add a New Redux Slice

Redux state is split into slice + thunks + selectors files.

### Step 1: Create the Slice

```ts
// src/lib/store/slices/reports.slice.ts

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PaginationMeta } from "@/types";
import type { CacheEntry } from "../cache";
import { createCacheEntry } from "../cache";
import type { Report } from "@/lib/api/services/report.service";
import { fetchReports, deleteReport } from "./reports.thunks";

export interface ReportsState {
  items: Report[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  _rollbackSnapshot: Report[] | null;
  listCache: CacheEntry<{ data: Report[]; meta: PaginationMeta }> | null;
}

const initialState: ReportsState = {
  items: [],
  meta: null,
  loading: false,
  error: null,
  _rollbackSnapshot: null,
  listCache: null,
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    reset: () => initialState,
    invalidateListCache(state) {
      state.listCache = null;
    },
    optimisticDelete(state, action: PayloadAction<number>) {
      state._rollbackSnapshot = state.items;
      state.items = state.items.filter((r) => r.id !== action.payload);
    },
    rollback(state) {
      if (state._rollbackSnapshot) {
        state.items = state._rollbackSnapshot;
        state._rollbackSnapshot = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
        state.listCache = createCacheEntry(
          { data: action.payload.data, meta: action.payload.meta },
          action.meta.arg.params,
        );
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  reset: resetReports,
  invalidateListCache: invalidateReportsListCache,
  optimisticDelete: optimisticDeleteReport,
  rollback: rollbackReports,
} = reportsSlice.actions;
export default reportsSlice.reducer;
```

### Step 2: Create the Thunks

```ts
// src/lib/store/slices/reports.thunks.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { reportService } from "@/lib/api/services/report.service";
import type { PaginationParams } from "@/types";
import type { RootState } from "../store";
import { shouldUseCachedData } from "../cache";
import { optimisticDeleteReport, rollbackReports } from "./reports.slice";

export const fetchReports = createAsyncThunk(
  "reports/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as RootState;
      const { listCache } = state.reports;

      // Return cached data if valid (TTL = 5 min) and params match
      if (shouldUseCachedData(listCache, params)) {
        return { data: listCache!.data.data, meta: listCache!.data.meta };
      }

      const response = await reportService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch reports";
      return rejectWithValue(message);
    }
  },
);

export const deleteReport = createAsyncThunk(
  "reports/delete",
  async (
    { storeId, reportId }: { storeId: number; reportId: number },
    { rejectWithValue, dispatch },
  ) => {
    // Optimistic update — remove from UI immediately
    dispatch(optimisticDeleteReport(reportId));
    try {
      await reportService.delete(storeId, reportId);
      return reportId;
    } catch (error: unknown) {
      // Rollback on failure
      dispatch(rollbackReports());
      const message =
        error instanceof Error ? error.message : "Failed to delete report";
      return rejectWithValue(message);
    }
  },
);
```

### Step 3: Create Memoized Selectors

```ts
// src/lib/store/selectors/reports.selectors.ts

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

const selectReportsState = (state: RootState) => state.reports;
const selectReportItems = (state: RootState) => state.reports.items;

export const selectReportsLoading = createSelector(
  [selectReportsState],
  (state) => state.loading,
);

export const selectReportsError = createSelector(
  [selectReportsState],
  (state) => state.error,
);

export const selectReportsMeta = createSelector(
  [selectReportsState],
  (state) => state.meta,
);

export const selectReportsByType = createSelector(
  [selectReportItems, (_: RootState, type: string) => type],
  (items, type) => items.filter((r) => r.type === type),
);
```

### Step 4: Register in the Store

```ts
// src/lib/store/store.ts — add the import and reducer
import reportsReducer from "./slices/reports.slice";

export const store = configureStore({
  reducer: {
    // ... existing reducers
    reports: reportsReducer,
  },
});
```

### Step 5: Add to Store Reset (for store switching)

```ts
// src/lib/store/resetStoreData.ts — add the reset action
import { resetReports } from "./slices/reports.slice";

export function resetStoreData(dispatch: AppDispatch) {
  // ... existing resets
  dispatch(resetReports());
}
```

---

## 4. Pattern: CRUD Page

A complete CRUD page integrates an API service, Redux slice, DataTable, and toast notifications.

### File Structure

```
src/app/(store-admin)/admin/reports/
├── page.tsx                  # Server Component (entry point)
├── ReportsPageClient.tsx     # Client Component (list + actions)
└── [id]/
    └── page.tsx              # Detail/edit page
```

### List Page (Client Component)

```tsx
// src/app/(store-admin)/admin/reports/ReportsPageClient.tsx
"use client";

import { useEffect, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchReports, deleteReport } from "@/lib/store/slices/reports.thunks";
import {
  selectReportsLoading,
  selectReportsError,
  selectReportsMeta,
} from "@/lib/store/selectors/reports.selectors";
import { useStore } from "@/hooks";
import { toastManager } from "@/lib/toast/toastManager";

import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { Report } from "@/lib/api/services/report.service";

export function ReportsPageClient() {
  const t = useTranslations("reports");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();

  const items = useAppSelector((state) => state.reports.items);
  const loading = useAppSelector(selectReportsLoading);
  const error = useAppSelector(selectReportsError);
  const meta = useAppSelector(selectReportsMeta);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const loadData = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(fetchReports({ storeId: currentStoreId, params: { page, limit } }));
  }, [dispatch, currentStoreId, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(
    (id: number) => {
      if (!currentStoreId) return;
      dispatch(deleteReport({ storeId: currentStoreId, reportId: id }))
        .unwrap()
        .then(() => toastManager.success(t("deleteSuccess")))
        .catch(() => toastManager.error(t("deleteError")));
    },
    [dispatch, currentStoreId, t],
  );

  const columns: ColumnDef<Report, unknown>[] = [
    { accessorKey: "title", header: t("columns.title"), enableSorting: true },
    { accessorKey: "type", header: t("columns.type") },
    { accessorKey: "generated_at", header: t("columns.date") },
    {
      id: "actions",
      header: t("columns.actions"),
      cell: ({ row }) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleDelete(row.original.id)}
        >
          {t("delete")}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => router.push("/admin/reports/new")}>
          <Plus className="h-4 w-4 me-2" />
          {t("create")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onRetry={loadData}
        emptyMessage={t("empty")}
      />
    </div>
  );
}
```

### Key Points

- Use `useStore()` hook to get `currentStoreId`
- Use `toastManager.success()` / `toastManager.error()` for notifications
- DataTable handles pagination, sorting, loading, empty, and error states
- Optimistic deletes happen in the thunk (dispatch rollback on failure)

---

## 5. Pattern: Form with Validation

Forms use React Hook Form + Zod for validation, with server error mapping.

### Step 1: Define the Zod Schema

```ts
// src/lib/validators/report.schema.ts

import { z } from "zod";

export const reportSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must not exceed 100 characters"),
  type: z.enum(["sales", "inventory", "customers"], {
    required_error: "Report type is required",
  }),
  date_from: z.string().min(1, "Start date is required"),
  date_to: z.string().min(1, "End date is required"),
});

export type ReportFormData = z.infer<typeof reportSchema>;
```

### Step 2: Build the Form Component

```tsx
// src/app/(store-admin)/admin/reports/new/ReportForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { reportSchema, type ReportFormData } from "@/lib/validators/report.schema";
import { reportService } from "@/lib/api/services/report.service";
import { mapServerErrors } from "@/lib/utils/mapServerErrors";
import { useStore } from "@/hooks";
import { toastManager } from "@/lib/toast/toastManager";

import { FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormSummaryError } from "@/components/forms/FormSummaryError";

export function ReportForm() {
  const t = useTranslations("reports.form");
  const router = useRouter();
  const { currentStoreId } = useStore();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: "",
      type: undefined,
      date_from: "",
      date_to: "",
    },
  });

  const onSubmit = async (data: ReportFormData) => {
    if (!currentStoreId) return;
    setGeneralError(null);

    try {
      await reportService.create(currentStoreId, data);
      toastManager.success(t("createSuccess"));
      router.push("/admin/reports");
    } catch (error: unknown) {
      // Map server validation errors (422) to form fields
      const summaryErrors = mapServerErrors(
        error as any,
        setError,
        ["title", "type", "date_from", "date_to"],
      );

      if (summaryErrors.length > 0) {
        setGeneralError(summaryErrors.join(", "));
      } else if (!(error as any)?.errors) {
        // Network or 5xx error — show general message
        toastManager.error(t("createError"));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {generalError && <FormSummaryError message={generalError} />}

      <FormField
        name="title"
        label={t("title")}
        type="text"
        control={control}
        required
        placeholder={t("titlePlaceholder")}
      />

      <FormField
        name="type"
        label={t("type")}
        type="select"
        control={control}
        required
        options={[
          { value: "sales", label: t("typeSales") },
          { value: "inventory", label: t("typeInventory") },
          { value: "customers", label: t("typeCustomers") },
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="date_from"
          label={t("dateFrom")}
          type="date"
          control={control}
          required
        />
        <FormField
          name="date_to"
          label={t("dateTo")}
          type="date"
          control={control}
          required
        />
      </div>

      <SubmitButton loading={isSubmitting}>
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
```

### How Server Error Mapping Works

When the API returns a 422 with validation errors:

```json
{
  "status": 422,
  "errors": [
    { "path": ["title"], "message": "Title already exists" },
    { "path": ["date_to"], "message": "End date must be after start date" }
  ]
}
```

The `mapServerErrors` utility:
1. Matches `path[0]` to form field names
2. Calls `setError(fieldName, { message })` for each match
3. Returns unmatched errors as an array for the general error area

### Key Rules

- Use `zodResolver(schema)` for client-side validation
- Use `mapServerErrors()` for server-side 422 error mapping
- Use `FormField` component for consistent field rendering with `aria-describedby`
- Use `SubmitButton` which handles debounce (disabled during submission)
- Never clear form data on network/server errors — keep user input intact

---

## 6. Pattern: Table with Pagination

Tables use TanStack Table via the shared `DataTable` component with server-side pagination.

### Step 1: Define Columns

```tsx
// src/app/(store-admin)/admin/reports/columns.tsx
"use client";

import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from "lucide-react";
import type { Report } from "@/lib/api/services/report.service";

export function useReportColumns(
  onView: (id: number) => void,
  onDelete: (id: number) => void,
): ColumnDef<Report, unknown>[] {
  const t = useTranslations("reports");

  return [
    {
      accessorKey: "title",
      header: t("columns.title"),
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: t("columns.type"),
      cell: ({ row }) => (
        <Badge variant="outline">{t(`types.${row.original.type}`)}</Badge>
      ),
    },
    {
      accessorKey: "generated_at",
      header: t("columns.date"),
      enableSorting: true,
      cell: ({ row }) => new Date(row.original.generated_at).toLocaleDateString(),
    },
    {
      id: "actions",
      header: t("columns.actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(row.original.id)}
            aria-label={t("view")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(row.original.id)}
            aria-label={t("delete")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}
```

### Step 2: Use DataTable in the Page

```tsx
"use client";

import { useState, useCallback } from "react";
import { DataTable } from "@/components/tables/DataTable";
import { useReportColumns } from "./columns";

export function ReportsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // ... fetch data with these params

  const handleSort = useCallback((field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1); // Reset to first page on sort change
  }, []);

  const columns = useReportColumns(handleView, handleDelete);

  return (
    <DataTable
      columns={columns}
      data={items}
      meta={meta}
      loading={loading}
      error={error}
      onPageChange={setPage}
      onLimitChange={(newLimit) => {
        setLimit(newLimit);
        setPage(1); // Reset to first page on limit change
      }}
      onSortChange={handleSort}
      onRetry={loadData}
      emptyMessage={t("empty")}
    />
  );
}
```

### DataTable Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `ColumnDef<T>[]` | TanStack Table column definitions |
| `data` | `T[]` | Array of row data |
| `meta` | `PaginationMeta \| null` | Server pagination info (`page`, `limit`, `total`, `totalPages`) |
| `loading` | `boolean` | Shows skeleton rows when true |
| `error` | `string \| null` | Shows error state with retry button |
| `onPageChange` | `(page: number) => void` | Called when user navigates pages |
| `onLimitChange` | `(limit: number) => void` | Called when user changes page size |
| `onSortChange` | `(field, order) => void` | Called when user clicks a sortable column |
| `onRetry` | `() => void` | Called when user clicks retry on error |
| `emptyMessage` | `string` | Message shown when data is empty |

### Key Rules

- Pagination is **server-side** — pass page/limit to your API service
- Sorting is **server-side** — pass sortBy/sortOrder to your API service
- Always reset page to 1 when changing filters, sort, or limit
- Add `enableSorting: true` to columns that support server-side sorting
- Always provide `aria-label` on icon-only action buttons

---

## Quick Reference: Existing Examples

| Pattern | Reference File |
|---------|---------------|
| API Service | `src/lib/api/services/category.service.ts` |
| Redux Slice | `src/lib/store/slices/products.slice.ts` |
| Redux Thunks | `src/lib/store/slices/products.thunks.ts` |
| Memoized Selectors | `src/lib/store/selectors/products.selectors.ts` |
| Cache Utility | `src/lib/store/cache.ts` |
| Zod Schema | `src/lib/validators/product.schema.ts` |
| DataTable | `src/components/tables/DataTable.tsx` |
| API Constants | `src/lib/constants/api.ts` |
| Store Setup | `src/lib/store/store.ts` |
| Typed Hooks | `src/lib/store/hooks.ts` |
| Server Error Mapping | `src/lib/utils/mapServerErrors.ts` |
| Toast Manager | `src/lib/toast/toastManager.ts` |
| FormField Component | `src/components/shared/FormField.tsx` |
| SubmitButton | `src/components/forms/SubmitButton.tsx` |

---

## Common Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Run all tests (Vitest)
npm run test:e2e     # Playwright e2e tests
```

---

## Project Conventions

| Convention | Rule |
|-----------|------|
| Text in UI | Always use `useTranslations()` from next-intl — never hardcode strings |
| Images | Always use `next/image` — never use `<img>` directly |
| Console logs | Never use `console.log` in production code (only in test files) |
| Exports | Use default export for page components, named exports for utilities |
| File naming | Pages: `page.tsx`, Client components: `PascalCase.tsx`, Services: `domain.service.ts`, Slices: `domain.slice.ts` |
| State management | Global shared data → Redux, Local UI state (modals, filters) → `useState`/`useReducer` |
| Error handling | Network errors show toast, 422 errors map to form fields, 401 triggers token refresh |
| Accessibility | Icon-only buttons must have `aria-label`, form errors use `aria-describedby` |
