-- CreateEnum
CREATE TYPE "OrderTagColorPreset" AS ENUM ('slate', 'gray', 'red', 'orange', 'amber', 'yellow', 'green', 'emerald', 'teal', 'sky', 'blue', 'indigo', 'purple', 'pink');

-- CreateTable
CREATE TABLE "OrderTag" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "name_lower" VARCHAR(30) GENERATED ALWAYS AS (lower("name")) STORED NOT NULL,
    "color_preset" "OrderTagColorPreset" NOT NULL DEFAULT 'slate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTagAssignment" (
    "store_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "OrderTagAssignment_pkey" PRIMARY KEY ("store_id","order_id","tag_id")
);

-- CreateIndex
CREATE INDEX "OrderTag_store_id_created_at_idx" ON "OrderTag"("store_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTag_store_id_name_lower_key" ON "OrderTag"("store_id", "name_lower");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTag_id_store_id_key" ON "OrderTag"("id", "store_id");

-- CreateIndex
CREATE INDEX "OrderTagAssignment_order_id_idx" ON "OrderTagAssignment"("order_id");

-- CreateIndex
CREATE INDEX "OrderTagAssignment_tag_id_idx" ON "OrderTagAssignment"("tag_id");

-- AddForeignKey
ALTER TABLE "OrderTag" ADD CONSTRAINT "OrderTag_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTagAssignment" ADD CONSTRAINT "OrderTagAssignment_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTagAssignment" ADD CONSTRAINT "OrderTagAssignment_order_id_store_id_fkey" FOREIGN KEY ("order_id", "store_id") REFERENCES "Order"("id", "store_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTagAssignment" ADD CONSTRAINT "OrderTagAssignment_tag_id_store_id_fkey" FOREIGN KEY ("tag_id", "store_id") REFERENCES "OrderTag"("id", "store_id") ON DELETE CASCADE ON UPDATE CASCADE;
