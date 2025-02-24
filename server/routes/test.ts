import { spawn } from 'bun'
import { Hono } from 'hono'
import { stream, streamText, streamSSE } from 'hono/streaming'

const inProduction = process.env.NODE_ENV === 'production'
const pathPython = inProduction ? 'python3' : './.venv/bin/python3'

const testRouter = new Hono()

testRouter.get('/', async (c) => {
	return c.json({ message: 'Hello, World!' })
})

testRouter.get('/python', async (c) => {
	const pythonProcess = spawn({
		cmd: [pathPython, 'data/data.py'],
		stdout: 'pipe',
		stderr: 'pipe',
	})

	const output = await new Response(pythonProcess.stdout as ReadableStream<Uint8Array>).text()
	const errorOutput = await new Response(pythonProcess.stderr as ReadableStream<Uint8Array>).text()

	if (errorOutput) {
		console.error('Python Error:', errorOutput)
		return new Response('Internal Server Error', { status: 500 })
	}

	return c.json({ message: output })
})

testRouter.get('/stream/python', async (c) => {
	const pythonProcess = spawn({
		cmd: [pathPython, 'data/data.py'],
		stdout: 'pipe',
		stderr: 'pipe',
	})

	//check for any error before streaming
	const errorOutput = await new Response(pythonProcess.stderr as ReadableStream<Uint8Array>).text()
	if (errorOutput) {
		console.error('Python Error:', errorOutput)
		return new Response('Internal Server Error', { status: 500 })
	}

	return streamText(c, async (stream) => {
		stream.onAbort(() => {
			console.log('Aborted!')
		})

		const reader = pythonProcess.stdout.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			// Decode and append to buffer
			buffer += decoder.decode(value, { stream: true })

			// Check for the end marker
			let endMarkerIndex
			while ((endMarkerIndex = buffer.indexOf('===END===')) !== -1) {
				// Extract the chunk up to the marker
				const chunk = buffer.slice(0, endMarkerIndex).trim()
				buffer = buffer.slice(endMarkerIndex + '===END==='.length)

				// Stream the chunk as a complete JSON
				console.log('Streaming Chunk:', chunk)
				await stream.write(chunk + '\n')
			}
		}
	})
})

export default testRouter
