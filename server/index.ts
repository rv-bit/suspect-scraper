import app from './app'

Bun.serve({
	port: process.env.PORT || 3000,
	fetch: app.fetch,
	idleTimeout: 255, // 100 seconds
})

console.log('Server Running on port', process.env.PORT || 3000)
