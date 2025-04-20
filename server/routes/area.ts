import { Hono } from 'hono'
import { and, eq, like, notLike } from 'drizzle-orm'

import { db } from '~/server/database/index'
import { mySchemaCrimeData } from '~/server/database/schema/schema'

import { lower } from '../database/utils'

const areaRouter = new Hono()
const cacheAreaMap = new Map()

async function getCrimeDataForMonth(month: string, area: string) {
    const areaData = await db
        .select()
        .from(mySchemaCrimeData)
        .where(
            and(
                like(lower(mySchemaCrimeData.fallsWithin), `%${area}%`),
                like(mySchemaCrimeData.month, `%${month}%`)
            )
        )
        .orderBy(mySchemaCrimeData.month);

    const crimeTypeCount: { [key: string]: number } = {};
    areaData.forEach((data) => {
        const crimeType = data.crimeType;
        if (crimeType) {
            crimeTypeCount[crimeType] = (crimeTypeCount[crimeType] || 0) + 1;
        }
    });

    const sortedCrimeTypes = Object.entries(crimeTypeCount).sort((a, b) => b[1] - a[1]);
    const topCrimeTypes = sortedCrimeTypes.slice(0, 5).map(([crimeType, count]) => ({
        crimeType,
        count,
    }));

    const totalCrimes = Object.values(crimeTypeCount).reduce((total, count) => total + count, 0);

    return { topCrimeTypes, totalCrimes };
}

areaRouter.get('/locations', async (c) => {
	const key = c.req.url

	if (cacheAreaMap.has(key)) {
		return c.json({	data: cacheAreaMap.get(key).data })
	}

	const areas = await db.selectDistinct({ fallsWithin: mySchemaCrimeData.fallsWithin }).from(mySchemaCrimeData).orderBy(mySchemaCrimeData.fallsWithin);
	const areaNames = areas
		.map((area) => area.fallsWithin)

	cacheAreaMap.set(key, {
		data: areaNames,
	})

	return c.json({ data: areaNames })
})

areaRouter.get('/:id', async (c) => {
	const area = c.req.param('id').replace(/-/g, ' ');

	const months = ["2024-12", "2024-11", "2024-10", "2024-09", "2024-08", "2024-07", "2024-06", "2024-05", "2024-04", "2024-03", "2024-02", "2024-01"];
	const crimeDataByMonth = await Promise.all(months.map((month) => getCrimeDataForMonth(month, area)));
	const crimeTotalsByMonth = months.reduce((acc, month, index) => {
		acc[month] = crimeDataByMonth[index]?.totalCrimes || 0; // Ensure no undefined values
        return acc;
    }, {} as { [key: string]: number });

	const [decData, novData] = crimeDataByMonth;

	const overallCountNov = novData.topCrimeTypes.reduce((total, crime) => total + crime.count, 0);
	const overallCountDec = decData.topCrimeTypes.reduce((total, crime) => total + crime.count, 0);

	const percentageNov = (overallCountNov / decData.totalCrimes) * 100;
	const percentageDec = (overallCountDec / novData.totalCrimes) * 100;

	const increase = ((percentageDec - percentageNov) / percentageNov) * 100;

	return c.json({
		lastMonthTopCrimes: decData.topCrimeTypes, 
		lastYearTotalsByMonth: crimeTotalsByMonth, 
		topIncreaseFromPrevMonth: increase 
	});
})

areaRouter.get('/:id/shared', async (c) => {
	const area = c.req.param('id').replace(/-/g, ' ');

	const dates = await db.selectDistinct({ month: mySchemaCrimeData.month }).from(mySchemaCrimeData).where(like(lower(mySchemaCrimeData.fallsWithin), `%${area}%`)).orderBy(mySchemaCrimeData.month);
	const sortedDates = dates.map((date) => date.month);

	return c.json({
		dates: sortedDates
	});
});

areaRouter.get('/:id/getDataByMonth/:year', async (c) => {
	const area = c.req.param('id').replace(/-/g, ' ');
	const year = c.req.param('year');

	if (!year) {
		return c.json({ error: 'Year is required' }, 400)
	}

	const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
	const crimeDataByMonth = await Promise.all(months.map((month) => getCrimeDataForMonth(month, area)));
	const crimeTotalsByMonth = months.reduce((acc, month, index) => {
        acc[month] = crimeDataByMonth[index]?.totalCrimes || 0; // Ensure no undefined values
        return acc;
    }, {} as { [key: string]: number });

	return c.json({ data: crimeTotalsByMonth });
})

areaRouter.get('/:id/getCrimeDataByMonth/:year', async (c) => {
	const area = c.req.param('id').replace(/-/g, ' ');
	const year = c.req.param('year');

	if (!year) {
		return c.json({ error: 'Year is required' }, 400)
	}

	const crimes = await db
		.selectDistinct()
		.from(mySchemaCrimeData)
		.where(
			and(
				notLike(lower(mySchemaCrimeData.crimeID), `%unknown%`),
				like(lower(mySchemaCrimeData.fallsWithin), `%${area}%`),
				eq(mySchemaCrimeData.month, year)
			)
		)
		.orderBy(mySchemaCrimeData.fallsWithin);

	const crimeTypes = crimes.filter((crime) => {
		const latitude = parseFloat(crime.latitude as string);
		const longitude = parseFloat(crime.longitude as string);
		return !isNaN(latitude) && !isNaN(longitude);
	}).map((crime) => crime.crimeType) as string[]; // we got soo much data that we know that this is a string

	const crimeTypesCount = crimeTypes.reduce((acc, crimeType: string) => {
		acc[crimeType] = (acc[crimeType] || 0) + 1;
		return acc;
	}, {} as { [key: string]: number });

	const totalCrimes = Object.values(crimeTypesCount).reduce((total, count) => total + count, 0);
	const sortedCrimeTypes = Object.entries(crimeTypesCount).sort((a, b) => b[1] - a[1]).map(([crimeType, count]) => ({
		crimeType,
		count,
	}));

	return c.json({ data: sortedCrimeTypes, total: totalCrimes });
})

areaRouter.get('/:id/getCrimeDataByCrime/:year/:crimeType', async (c) => {
	const area = c.req.param('id').replace(/-/g, ' ');
	const year = c.req.param('year');
	const crimeType = c.req.param('crimeType');

	if (!year) {
		return c.json({ error: 'Year is required' }, 400)
	}

	const conditions = [
		notLike(lower(mySchemaCrimeData.crimeID), `%unknown%`),
		like(lower(mySchemaCrimeData.fallsWithin), `%${area}%`),
		like(mySchemaCrimeData.month, `%${year}%`),
		crimeType !== 'all' 
			? like(mySchemaCrimeData.crimeType, `%${crimeType}%`) 
			: undefined // omit the condition entirely if not needed
	].filter(Boolean); // removes undefined

	const crimes = await db
		.selectDistinct()
		.from(mySchemaCrimeData)
		.where(and(...conditions))
		.orderBy(mySchemaCrimeData.fallsWithin);
	
	const locations = crimes.map((crime) => ({
		key: `${crime.crimeID}-${crime.crimeType}-${crime.month}-${crime.fallsWithin}-${crime.latitude}-${crime.longitude}-${crime.location}-${crime.lsoaCode}-${crime.lsoaName}-${crime.lastOutcomeCategory}`,
		locationNear: crime.location,
		location: {
			lat: parseFloat(crime.latitude as string),
			lng: parseFloat(crime.longitude as string),
		},
	}));

	return c.json({ data: locations });
});

export default areaRouter
