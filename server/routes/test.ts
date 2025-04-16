import { Hono } from 'hono'

import { db } from '~/server/database/index'
import { mySchemaCrimeData } from '~/server/database//schema'

const testRouter = new Hono()

const cacheAreaMap = new Map()

testRouter.get('/', async (c) => {
	const key = c.req.url
	if (cacheAreaMap.has(key)) {
		return c.json({	areas: cacheAreaMap.get(key) })
	}

	const areas = await db.selectDistinct({ fallsWithin: mySchemaCrimeData.fallsWithin }).from(mySchemaCrimeData).orderBy(mySchemaCrimeData.fallsWithin);
	const areaNames = areas.map((area) => area.fallsWithin);

	cacheAreaMap.set(key, areaNames)

	return c.json({ areas: areaNames })
})

export default testRouter
