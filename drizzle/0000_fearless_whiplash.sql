CREATE SCHEMA "big_data";
--> statement-breakpoint
CREATE TABLE "big_data"."crime_data" (
	"context" text,
	"crime_id" text,
	"crime_type" text,
	"falls_within" text,
	"lsoa_code" text,
	"lsoa_name" text,
	"last_outcome_category" text,
	"latitude" text,
	"location" text,
	"longitude" text,
	"month" text,
	"reported_by" text
);
--> statement-breakpoint
CREATE TABLE "big_data"."stop_and_search" (
	"age_range" text,
	"date" text,
	"gender" text,
	"latitude" text,
	"legislation" text,
	"longitude" text,
	"object_of_search" text,
	"officer_defined_ethnicity" text,
	"outcome" text,
	"outcome_linked_to_object_of_search" text,
	"part_of_policing_operation" text,
	"removal_of_more_than_just_outer_clothing" text,
	"self_defined_ethnicity" text,
	"type" text
);
