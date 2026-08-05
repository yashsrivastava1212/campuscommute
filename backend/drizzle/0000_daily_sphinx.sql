CREATE TYPE "public"."carpool_status" AS ENUM('OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."discussion_room_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."join_request_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."merge_proposal_status" AS ENUM('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED', 'MERGED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'VERIFIED');--> statement-breakpoint
CREATE TABLE "carpool_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carpool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"contact_revealed" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carpools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"destination_id" uuid,
	"destination" varchar(255) NOT NULL,
	"departure_at" timestamp with time zone NOT NULL,
	"total_seats" integer DEFAULT 4 NOT NULL,
	"seats_available" integer NOT NULL,
	"status" "carpool_status" DEFAULT 'OPEN' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"join_cutoff_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"institute_code" varchar(50) DEFAULT 'GIM' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discussion_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carpool_id" uuid NOT NULL,
	"status" "discussion_room_status" DEFAULT 'ACTIVE' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_rooms_carpool_id_unique" UNIQUE("carpool_id")
);
--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carpool_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"status" "join_request_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merge_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carpool_a_id" uuid NOT NULL,
	"carpool_b_id" uuid NOT NULL,
	"compatibility_score" integer NOT NULL,
	"status" "merge_proposal_status" DEFAULT 'PENDING' NOT NULL,
	"resulting_carpool_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_id" uuid,
	"body" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_email" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"phone_encrypted" text,
	"verification_status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"active_carpool_id" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_campus_email_unique" UNIQUE("campus_email")
);
--> statement-breakpoint
ALTER TABLE "carpool_memberships" ADD CONSTRAINT "carpool_memberships_carpool_id_carpools_id_fk" FOREIGN KEY ("carpool_id") REFERENCES "public"."carpools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_memberships" ADD CONSTRAINT "carpool_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_rooms" ADD CONSTRAINT "discussion_rooms_carpool_id_carpools_id_fk" FOREIGN KEY ("carpool_id") REFERENCES "public"."carpools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_carpool_id_carpools_id_fk" FOREIGN KEY ("carpool_id") REFERENCES "public"."carpools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_carpool_a_id_carpools_id_fk" FOREIGN KEY ("carpool_a_id") REFERENCES "public"."carpools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_carpool_b_id_carpools_id_fk" FOREIGN KEY ("carpool_b_id") REFERENCES "public"."carpools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_resulting_carpool_id_carpools_id_fk" FOREIGN KEY ("resulting_carpool_id") REFERENCES "public"."carpools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_discussion_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."discussion_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "carpool_memberships_carpool_user_idx" ON "carpool_memberships" USING btree ("carpool_id","user_id");--> statement-breakpoint
CREATE INDEX "carpool_memberships_user_idx" ON "carpool_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "carpools_status_departure_idx" ON "carpools" USING btree ("status","departure_at");--> statement-breakpoint
CREATE INDEX "carpools_destination_idx" ON "carpools" USING btree ("destination");--> statement-breakpoint
CREATE UNIQUE INDEX "join_requests_carpool_requester_pending_idx" ON "join_requests" USING btree ("carpool_id","requester_id");--> statement-breakpoint
CREATE INDEX "join_requests_carpool_idx" ON "join_requests" USING btree ("carpool_id");--> statement-breakpoint
CREATE INDEX "merge_proposals_status_idx" ON "merge_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_room_sent_idx" ON "messages" USING btree ("room_id","sent_at");--> statement-breakpoint
CREATE INDEX "otp_tokens_email_idx" ON "otp_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "otp_tokens_expires_at_idx" ON "otp_tokens" USING btree ("expires_at");