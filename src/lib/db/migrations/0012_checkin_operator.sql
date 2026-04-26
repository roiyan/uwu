-- Operator link + PIN for hari-H check-in delegation. The couple
-- generates a token + 4-digit PIN in Pengaturan, shares the link to
-- whoever is greeting guests at the venue (saudara, WO, friend),
-- and that person enters the PIN once on the public station to
-- unlock scan/search/walk-in. Token is rotated on reset, which
-- invalidates any operator session relying on the old token.
ALTER TABLE "events" ADD COLUMN "operator_pin" varchar(4);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "operator_token" varchar(32);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "operator_token_created_at" timestamp with time zone;
