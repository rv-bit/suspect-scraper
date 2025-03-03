import { useLoaderData } from 'react-router'
import type { Route } from './+types/home'

import axiosInstance from '~/lib/axios-instance'
import { Welcome } from '~/welcome/welcome'

export function meta({}: Route.MetaArgs) {
	return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }]
}

type LoaderData = {
	message: string[]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const res = await axiosInstance.get(`/api/test`)
	const res2 = await axiosInstance.get(`/api/test/python`)
	const data = await res.data
	const data2 = await res2.data
	return {
		...data,
		...data2,
	}
}

export function HydrateFallback() {
	return <div>Loading...</div>
}

export default function Home() {
	const data = useLoaderData<LoaderData>()

	console.log(data.message)

	return <Welcome />
}
