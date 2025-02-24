import app from './app'

Bun.serve({
	port: process.env.PORT || 3000,
	fetch: app.fetch,
})

console.log('Server Running on port', process.env.PORT || 3000)
