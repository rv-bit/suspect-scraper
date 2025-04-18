import { Hono } from 'hono'
import { and, like } from 'drizzle-orm'

import { db } from '~/server/database/index'
import { mySchemaCrimeData } from '~/server/database/schema'

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

	const months = ["2024-12", "2024-11", "2024-10", "2024-09", "2024-08", "2024-07", "2024-06", "2024-05", "2024-04", "2024-03", "2024-02", "2024-01",];
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

	return c.json({ lastMonthTopCrimes: decData.topCrimeTypes, lastYearTotalsByMonth: crimeTotalsByMonth, topIncreaseFromPrevMonth: increase });
})

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

export default areaRouter
