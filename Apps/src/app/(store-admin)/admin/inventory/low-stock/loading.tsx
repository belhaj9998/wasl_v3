import { TableSkeleton } from "@/components/shared/TableSkeleton";

export default function LowStockLoading() {
  return <TableSkeleton rows={10} columns={6} showFilters={false} />;
}
