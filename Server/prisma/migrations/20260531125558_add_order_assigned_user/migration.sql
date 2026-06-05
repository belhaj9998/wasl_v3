-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assigned_user_id" INTEGER;

-- CreateIndex
CREATE INDEX "Order_store_id_assigned_user_id_idx" ON "Order"("store_id", "assigned_user_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
