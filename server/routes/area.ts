import { Hono } from 'hono'
import { and, like } from 'drizzle-orm'

import { db } from '~/server/database/index'
import { mySchemaCrimeData } from '~/server/database/schema'

import { lower } from '../database/utils'

const areaRouter = new Hono()
const cacheAreaMap = new Map()

areaRouter.get('/locations', async (c) => {
	const key = c.req.url

	if (cacheAreaMap.has(key)) {
		return c.json({	data: cacheAreaMap.get(key) })
	}

	const areas = await db.selectDistinct({ fallsWithin: mySchemaCrimeData.fallsWithin }).from(mySchemaCrimeData).orderBy(mySchemaCrimeData.fallsWithin);
	const areaNames = areas.map((area) => area.fallsWithin);

	cacheAreaMap.set(key, areaNames)

	return c.json({ data: areaNames })
})

areaRouter.get('/:id', async (c) => {
	const area = c.req.param('id').replace(/-/g, ' ');

	const areaData = await db.select().from(mySchemaCrimeData).where(and(like(lower(mySchemaCrimeData.fallsWithin), `%${area}%`), like(mySchemaCrimeData.month, "%2024-12%"))).orderBy(mySchemaCrimeData.month);
	if (areaData.length === 0) {
		return c.json({ data: [] })
	}

	const crimeTypeCount: { [key: string]: number } = {};

	areaData.forEach((data) => {
		const crimeType = data.crimeType;
		if (crimeType) {
			if (!crimeTypeCount[crimeType]) {
				crimeTypeCount[crimeType] = 0;
			}

			crimeTypeCount[crimeType]++;
		}
	});

	const sortedCrimeTypes = Object.entries(crimeTypeCount).sort((a, b) => b[1] - a[1])
	const topCrimeTypes = sortedCrimeTypes.slice(0, 5);

	return c.json({ data: topCrimeTypes });
})

export default areaRouter
