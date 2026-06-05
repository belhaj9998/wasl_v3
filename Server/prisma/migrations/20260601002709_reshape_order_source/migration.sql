BEGIN;

-- 1. Build the final enum type
CREATE TYPE "OrderSource_new" AS ENUM (
  'STOREFRONT','ADMIN','WHATSAPP','PHONE','INSTAGRAM','FACEBOOK','TIKTOK','OTHER'
);

-- 2. Drop the column default so the type cast is unambiguous
ALTER TABLE "Order" ALTER COLUMN "source" DROP DEFAULT;

-- 3. Convert any legacy MANUAL rows to ADMIN (harmless no-op on a clean DB)
UPDATE "Order" SET "source" = 'ADMIN' WHERE "source" = 'MANUAL';

-- 4. Swap the column to the new type
ALTER TABLE "Order"
  ALTER COLUMN "source" TYPE "OrderSource_new"
  USING ("source"::text::"OrderSource_new");

-- 5. Drop the old type and rename the new one into its place
DROP TYPE "OrderSource";
ALTER TYPE "OrderSource_new" RENAME TO "OrderSource";

-- 6. Restore the default
ALTER TABLE "Order" ALTER COLUMN "source" SET DEFAULT 'STOREFRONT';

COMMIT;
