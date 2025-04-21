import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({
	connectionString: process.env.DATABASE_URL!,
	max: 10,                      // Limit max connections
	connectionTimeoutMillis: 30000, // 30 seconds
	idleTimeoutMillis: 30000      // 30 seconds
})

const db = drizzle({ client: pool })

export { db, pool }
