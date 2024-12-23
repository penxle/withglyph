DROP TABLE "user_withdrawal_configs";
ALTER TABLE "user_settlement_identities" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;