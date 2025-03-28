import { pool } from '.'
import { from as copyFrom } from 'pg-copy-streams'
import fs from 'fs'

async function importCSV() {
	const table = 'big_data.crime_data' // this is schema.table
	const absolutePath = '/Users/rv/Projects/6CS030/bigdata/crime_data.csv' // this is the absolute path to the CSV file

	const client = await pool.connect()
	try {
		const stream = client.query(copyFrom(`COPY ${table} FROM STDIN WITH CSV HEADER`))
		fs.createReadStream(absolutePath).pipe(stream)

		stream.on('finish', async () => {
			console.log('CSV successfully imported!')
			client.release()
		})

		stream.on('error', (err: any) => {
			console.error('Stream error:', err)
			client.release()
		})
	} catch (error) {
		console.error('Error importing CSV:', error)
		client.release()
	}
}

export default importCSV
