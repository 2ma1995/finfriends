-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "activity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateEnum
CREATE TYPE "activity"."LearningTopic" AS ENUM ('EARN', 'SPEND', 'SAVE', 'GROW');

-- CreateEnum
CREATE TYPE "activity"."StarTrigger" AS ENUM ('ONBOARDING_LEARN', 'ATTENDANCE', 'QUIZ_CORRECT', 'MISSION_APPROVED', 'SPENDING_RETRO', 'WISHLIST_REACHED', 'SAVINGS_JOINED', 'SAVINGS_DONE');

-- CreateEnum
CREATE TYPE "activity"."TriggerPath" AS ENUM ('LEARNING', 'PRACTICE');

-- CreateEnum
CREATE TYPE "activity"."ApprovalState" AS ENUM ('PENDING', 'APPROVED', 'BACKFILLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "activity"."PlanMatchResult" AS ENUM ('MET', 'EXCEEDED', 'NO_PLAN');

-- CreateEnum
CREATE TYPE "activity"."CategoryMatch" AS ENUM ('MATCHED', 'MISMATCHED');

-- CreateEnum
CREATE TYPE "activity"."PlanAuthor" AS ENUM ('GUARDIAN', 'CHILD');

-- CreateEnum
CREATE TYPE "identity"."AccountState" AS ENUM ('CREATED', 'CONSENT_PENDING', 'ACTIVE', 'BLOCKED', 'TERMINATED');

-- CreateTable
CREATE TABLE "identity"."guardian_accounts" (
    "id" UUID NOT NULL,
    "auth_ref" TEXT NOT NULL,
    "consent_completed" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMPTZ(6),
    "notify_window" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."child_accounts" (
    "id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "birth_year" INTEGER NOT NULL,
    "device_type" TEXT,
    "state" "identity"."AccountState" NOT NULL DEFAULT 'CONSENT_PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."learning_progress" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "topic" "activity"."LearningTopic" NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "quiz_correct" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."practice_credits" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "trigger_code" "activity"."StarTrigger" NOT NULL,
    "trigger_path" "activity"."TriggerPath" NOT NULL,
    "topic" "activity"."LearningTopic",
    "approval_mode" TEXT NOT NULL,
    "earned_at" TIMESTAMPTZ(6) NOT NULL,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL,
    "cycle_id" INTEGER NOT NULL,

    CONSTRAINT "practice_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."star_ledger" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "trigger_code" "activity"."StarTrigger" NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "practice_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "star_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."tree_states" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "slot" "activity"."LearningTopic" NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "cond_learn" BOOLEAN NOT NULL DEFAULT false,
    "cond_quiz" BOOLEAN NOT NULL DEFAULT false,
    "practice_count" INTEGER NOT NULL DEFAULT 0,
    "cycle_started_at" DATE NOT NULL,
    "stall_days" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tree_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."forest_snapshots" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "year_month" TEXT NOT NULL,
    "final_stages" JSONB NOT NULL,
    "delta_items" JSONB NOT NULL,
    "stars_earned" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forest_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."plan_cards" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "where_text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limit_amount" INTEGER NOT NULL,
    "items" TEXT,
    "author" "activity"."PlanAuthor" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."spending_records" (
    "id" UUID NOT NULL,
    "plan_card_id" UUID,
    "child_id" UUID NOT NULL,
    "actual_amount" INTEGER NOT NULL,
    "merchant_category" TEXT NOT NULL,
    "match_result" "activity"."PlanMatchResult" NOT NULL,
    "category_match" "activity"."CategoryMatch",
    "sentence_id" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "spending_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."wishlists" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" INTEGER NOT NULL,
    "saved_amount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,
    "reached_steps" JSONB NOT NULL DEFAULT '[]',
    "rank_changed_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity"."app_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "child_id" UUID,
    "guardian_id" UUID,
    "client_ts" TIMESTAMPTZ(6) NOT NULL,
    "server_ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "app_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_accounts_auth_ref_key" ON "identity"."guardian_accounts"("auth_ref");

-- CreateIndex
CREATE INDEX "child_accounts_guardian_id_idx" ON "identity"."child_accounts"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_progress_child_id_topic_key" ON "activity"."learning_progress"("child_id", "topic");

-- CreateIndex
CREATE INDEX "practice_credits_child_id_cycle_id_idx" ON "activity"."practice_credits"("child_id", "cycle_id");

-- CreateIndex
CREATE INDEX "practice_credits_child_id_earned_at_idx" ON "activity"."practice_credits"("child_id", "earned_at");

-- CreateIndex
CREATE UNIQUE INDEX "star_ledger_idempotency_key_key" ON "activity"."star_ledger"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "star_ledger_practice_id_key" ON "activity"."star_ledger"("practice_id");

-- CreateIndex
CREATE INDEX "star_ledger_child_id_created_at_idx" ON "activity"."star_ledger"("child_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tree_states_child_id_slot_key" ON "activity"."tree_states"("child_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "forest_snapshots_child_id_year_month_key" ON "activity"."forest_snapshots"("child_id", "year_month");

-- CreateIndex
CREATE INDEX "plan_cards_child_id_created_at_idx" ON "activity"."plan_cards"("child_id", "created_at");

-- CreateIndex
CREATE INDEX "spending_records_child_id_occurred_at_idx" ON "activity"."spending_records"("child_id", "occurred_at");

-- CreateIndex
CREATE INDEX "wishlists_child_id_rank_idx" ON "activity"."wishlists"("child_id", "rank");

-- CreateIndex
CREATE INDEX "app_events_event_type_client_ts_idx" ON "activity"."app_events"("event_type", "client_ts");

-- CreateIndex
CREATE INDEX "app_events_child_id_client_ts_idx" ON "activity"."app_events"("child_id", "client_ts");

-- CreateIndex
CREATE UNIQUE INDEX "app_events_idempotency_key_client_ts_key" ON "activity"."app_events"("idempotency_key", "client_ts");

-- AddForeignKey
ALTER TABLE "identity"."child_accounts" ADD CONSTRAINT "child_accounts_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "identity"."guardian_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity"."star_ledger" ADD CONSTRAINT "star_ledger_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "activity"."practice_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity"."spending_records" ADD CONSTRAINT "spending_records_plan_card_id_fkey" FOREIGN KEY ("plan_card_id") REFERENCES "activity"."plan_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
