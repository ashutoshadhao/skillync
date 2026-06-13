-- Skillync: remove subscription/billing columns from users.
-- Idempotent so it is safe on both fresh databases (where 0000 no longer
-- creates these columns) and existing databases carried over from earlier.
ALTER TABLE "users" DROP COLUMN IF EXISTS "plan";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "razorpay_customer_id";
