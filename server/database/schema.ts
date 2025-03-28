import { serial, text, pgSchema } from 'drizzle-orm/pg-core'
export const mySchema = pgSchema('big_data')

export const mySchemaStopAndSearch = mySchema.table('stop_and_search', {
	ageRange: text('age_range'),
	date: text('date'),
	gender: text('gender'),
	latitude: text('latitude'),
	legislation: text('legislation'),
	longitude: text('longitude'),
	objectOfSearch: text('object_of_search'),
	officerDefinedEthnicity: text('officer_defined_ethnicity'),
	outcome: text('outcome'),
	outcomeLinkedToObjectOfSearch: text('outcome_linked_to_object_of_search'),
	partOfPolicingOperation: text('part_of_policing_operation'),
	removalOfMoreThanJustOuterClothing: text('removal_of_more_than_just_outer_clothing'),
	selfDefinedEthnicity: text('self_defined_ethnicity'),
	type: text('type'),
})

export const mySchemaCrimeData = mySchema.table('crime_data', {
	context: text('context'),
	crimeID: text('crime_id'),
	crimeType: text('crime_type'),
	fallsWithin: text('falls_within'),
	lsoaCode: text('lsoa_code'),
	lsoaName: text('lsoa_name'),
	lastOutcomeCategory: text('last_outcome_category'),
	latitude: text('latitude'),
	location: text('location'),
	longitude: text('longitude'),
	month: text('month'),
	reportedBy: text('reported_by'),
})
