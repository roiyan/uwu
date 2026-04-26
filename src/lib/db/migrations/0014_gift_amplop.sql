-- "Tanda Kasih" / Amplop Digital. Pasangan registers receiving
-- accounts (bank or e-wallet); guests submit a confirmation when
-- they've transferred. UWU does NOT process payment — it only
-- displays the destination + records the guest's confirmation.
CREATE TABLE IF NOT EXISTS "gift_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "provider" varchar(50) NOT NULL,
  "account_name" varchar(100) NOT NULL,
  "account_number" varchar(50) NOT NULL,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_gift_accounts_event"
  ON "gift_accounts"("event_id");

CREATE TABLE IF NOT EXISTS "gift_confirmations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "guest_id" uuid REFERENCES "guests"("id") ON DELETE SET NULL,
  "guest_name" varchar(100) NOT NULL,
  "guest_message" text,
  "account_id" uuid REFERENCES "gift_accounts"("id") ON DELETE SET NULL,
  "amount" bigint,
  "transfer_proof_url" text,
  "status" varchar(20) DEFAULT 'pending',
  "confirmed_at" timestamptz,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_gift_confirmations_event"
  ON "gift_confirmations"("event_id");
