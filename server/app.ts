import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { HTTPException } from 'hono/http-exception'

import { ErrorResponse } from '~/shared/types'

import testRouter from './routes/test'

const app = new Hono().basePath('/api')

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',').map((origin) => {
	return origin.startsWith('http') ? origin : `https://${origin}`
})

app.use('*', async (c, next) => {
	const corsMiddleware = cors({
		origin: trustedOrigins ?? '',
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
		allowHeaders: ['Content-Type', 'Authorization'],
		maxAge: 600, // 10 minutes
		credentials: true,
	})

	return corsMiddleware(c, next)
})

app.use(logger())
app.route('/test', testRouter)

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		const errResponse =
			err.res ??
			c.json<ErrorResponse>(
				{
					success: false,
					error: err.message,
					isFormError: err.cause && typeof err.cause === 'object' && 'form' in err.cause ? err.cause.form === true : false,
				},
				err.status
			)
		return errResponse
	}

	return c.json<ErrorResponse>(
		{
			success: false,
			error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.stack ?? err.message,
		},
		500
	)
})

app.get('*', serveStatic({ root: './frontend/dist' }))
app.get('*', serveStatic({ path: './frontend/dist/index.html' }))

export default app
