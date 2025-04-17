import type { Route } from "./+types/_layout";

import React from 'react'
import { Outlet, useLoaderData } from 'react-router'

import axiosInstance from "~/lib/axios-instance";
import queryClient from "~/lib/query-instance";

type LoaderAreaData = {
    data: any[]
    area: string
}

const prefetchArea = async (id: string) => {
    console.log('prefetching area', id)

    await queryClient.prefetchQuery({
        queryKey: ['area'],
        queryFn: async () => {
            const result = await axiosInstance.get(`/api/v0/${id}`);
            return {
                data: result.data.data,
                area: id,
            };
        },
        staleTime: 10 * 1000, // 30 seconds
    });
}

export async function loader({ params }: Route.LoaderArgs) {
    if (!params.id) {
        throw new Response("", { status: 404, headers: { Location: "/" } }); // Redirect to home if no area is provided
    }
        
    let cachedData = queryClient.getQueryData(['area']) as LoaderAreaData;

    if (!cachedData) {
        await prefetchArea(params.id);
    } else {
        if (cachedData.area !== params.id) {
            await queryClient.invalidateQueries({
                queryKey: ['area']
            });
    
            await prefetchArea(params.id);
        }
    }

    cachedData = queryClient.getQueryData(['area']) as LoaderAreaData;

    return {
        data: cachedData.data || [],
        area: params.id,
    }
}

export default function Layout({
    loaderData,
}: Route.ComponentProps) {    
    console.log('data', loaderData)
    
    return (
        <div className='flex flex-col justify-center items-center'>
            <h1>_layout text</h1>
            <Outlet />
        </div>
    )
}
