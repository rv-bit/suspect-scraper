import { Hono } from 'hono'

const testRouter = new Hono()

testRouter.get('/', async (c) => {
	return c.json({ message: 'Hello, World!' })
})

export default testRouter
