CREATE TYPE "ProductStatus_new" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Product"
ALTER COLUMN "status" TYPE "ProductStatus_new"
USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'PUBLISHED'
    ELSE "status"::text
  END
)::"ProductStatus_new";

DROP TYPE "ProductStatus";
ALTER TYPE "ProductStatus_new" RENAME TO "ProductStatus";

ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

UPDATE "Product"
SET
  "is_published" = ("status" = 'PUBLISHED'),
  "published_at" = CASE
    WHEN "status" = 'PUBLISHED' THEN COALESCE("published_at", NOW())
    ELSE NULL
  END;
