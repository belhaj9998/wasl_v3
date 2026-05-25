CREATE TYPE "ProductOptionType" AS ENUM ('TEXT', 'COLOR', 'IMAGE');

ALTER TABLE "ProductOption"
ADD COLUMN "type" "ProductOptionType" NOT NULL DEFAULT 'TEXT';

ALTER TABLE "ProductOptionValue"
ADD COLUMN "color_hex" TEXT,
ADD COLUMN "image_url" TEXT;
