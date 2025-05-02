import type { Route } from './+types/index'

import { useLoaderData, useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'

import axiosInstance from '~/lib/axios-instance'

export function meta({}: Route.MetaArgs) {
	return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const res = await axiosInstance.get(`/api/v0/locations`)
	const data = res.data.data

	return {
		data,
	}
}

export function HydrateFallback() {
	return <div>Loading...</div>
}

export default function Home() {
	const navigate = useNavigate();
	const { data } = useLoaderData() as {
		data: string[]
	}

	return (
		<div className='flex items-start flex-col justify-start h-svh w-full mx-auto'>
			<header className='flex justify-center items-center w-full border-border border-2 py-5 bg-gray-100'>
				<h1 className='font-bricolage text-xl tracking-tighter text-center'>Welcome to <span className='text-amber-500 text-4xl text-center tracking-[-0.10rem]'>Suspect Watch</span></h1>
			</header>

			<main className='flex justify-center items-center gap-2 mx-2 mt-5 pb-5 w-full'>
				<ul className='grid sm:grid-cols-4 md:grid-cols-3 justify-center gap-2 w-full sm:w-auto'>
					{data.map((area: string, index) => (
						<Button 
							key={index} 
							className='text-lg font-semibold min-h-20 h-auto wrap-anywhere w-full whitespace-normal'
							onClick={() => {
								const areaSlug = area.replace(/ /g, '-').toLowerCase()
								navigate(
									`/area/${areaSlug}/overview`,
								);
							}}
						>
							<p className='text-center break-all'>{area}</p>
						</Button>
					))}
				</ul>
			</main>
		</div>
	)
}
