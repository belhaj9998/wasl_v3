ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "Cart_store_id_session_id_key";

DROP INDEX IF EXISTS "Cart_store_id_session_id_key";

CREATE INDEX IF NOT EXISTS "Cart_store_id_session_id_idx"
ON "Cart" ("store_id", "session_id");

CREATE UNIQUE INDEX IF NOT EXISTS "Cart_one_open_session_cart"
ON "Cart" ("store_id", "session_id")
WHERE status = 'OPEN' AND session_id IS NOT NULL;
