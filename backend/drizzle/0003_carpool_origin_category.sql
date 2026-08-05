ALTER TABLE "destinations" ADD COLUMN "category" varchar(50) DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "carpools" ADD COLUMN "origin_id" uuid;--> statement-breakpoint
ALTER TABLE "carpools" ADD COLUMN "origin" varchar(255) DEFAULT 'GIM Campus (Sanquelim)' NOT NULL;
