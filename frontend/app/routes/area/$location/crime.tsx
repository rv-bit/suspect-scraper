import type { Route } from "./+types/crime";

import queryClient from "~/lib/query-instance";
import axiosInstance from "~/lib/axios-instance";

type LoaderAreaData = {
    data: any[]
    area: string
}

const prefetchArea = async (id: string) => {
    await queryClient.prefetchQuery({
        queryKey: [`crime-${id}`],
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

export async function loader({ params, request }: Route.LoaderArgs) {
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

export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();

	return {
        ...serverData
    }
}

export function HydrateFallback() {
	return <div>Loading...</div>
}

export default function Index({
    loaderData,
}: Route.ComponentProps) {
    const { data, area } = loaderData;

    console.log('crime',data, area);

    return (
        <div>
            <h1>index</h1>
            
        </div>
    )
}
