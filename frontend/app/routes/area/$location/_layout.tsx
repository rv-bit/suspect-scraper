import type { Route } from "./+types/_layout";

import React from 'react'
import { Outlet, useLoaderData, useNavigate, useParams, useSearchParams } from 'react-router'

import queryClient from "~/lib/query-instance";
import axiosInstance from "~/lib/axios-instance";

import { cn, titleCase } from "~/lib/utils";

import { ChartNoAxesCombined, Hand, House, Map as MapIcon, TrendingUpDown, type LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

type LoaderAreaData = {
    dates: string[]
    area: string
}

const prefetchArea = async (id: string) => {
    await queryClient.prefetchQuery({
        queryKey: [`area-shared-data`],
        queryFn: async () => {
            const result = await axiosInstance.get(`/api/v0/${id}/shared`);

            if (result.status !== 200) {
                throw new Error("Failed to fetch data");
            }

            return {
                dates: result.data.dates,
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

    let cachedData = queryClient.getQueryData([`area-shared-data`]) as LoaderAreaData;

    if (!cachedData) {
        await prefetchArea(params.id);
    } else {
        if (cachedData.area !== params.id) {
            await queryClient.invalidateQueries({
                queryKey: [`area-shared-data`],
            });
    
            await prefetchArea(params.id);
        }
    }

    cachedData = queryClient.getQueryData([`area-shared-data`]) as LoaderAreaData;

    return {
        dates: cachedData.dates || [],
        area: params.id,
    }
}

export async function clientLoader({ serverLoader, params, request }: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();

	return {
        ...serverData,
        params: params,
        request: request,
    }
}

export default function Layout() {
    const navigate = useNavigate();
    const { dates, params, request } = useLoaderData() as {
        dates: string[];
        params: { id: string };
        request: Request;
    }

    const policeForceName = params.id.replace(/\b(and|or)\b/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').replace(/ /g, '-').toLowerCase();    

    const actions = React.useMemo(() => [
        {
            title: "Overview",
            tab: "overview",
            icon: House,
        },
        {
            title: "Crimes",
            tab: "crimes",
            params: dates.sort().reverse()[0], // latest date
            icon: MapIcon,
        },
        {
            title: "Stop and Search",
            tab: "stop-and-search",
            icon: Hand,
            disabled: true,
        },
        {
            title: "Statistics",
            tab: "statistics",
            icon: ChartNoAxesCombined,
        },
        {
            title: "Predictions",
            tab: "predictions",
            icon: TrendingUpDown,
            disabled: true,
        },
    ] as {
        title: string;
        tab: string;
        params?: string;
        icon?: LucideIcon;
        disabled?: boolean;
    }[], [dates]);

    const url = new URL(request.url);
    const path = url.pathname;
    const isActive = React.useMemo(
        () => (url: string) => {
            if (Array.isArray(url)) {
                return url.includes(path);
            }
            return path.includes(url);
        },
        [path],
    );

    return (
        <div className='relative flex flex-col justify-center items-center w-full'>
            <header className="flex flex-col justify-center w-full items-center">
                <section className="bg-gray-100/20 w-full">
                    <div className="max-w-7xl w-full mx-auto flex items-center justify-center p-20 px-10 pb-10 lg:px-60 gap-5">
                        <span className="w-full flex items-center gap-5 flex-col sm:justify-start sm:flex-row">
                            <img src={`/police-forces/${params ? policeForceName : ""}.png`} alt={`${params ? policeForceName : ""} Police Force`} className="w-70 h-full" />
                            <span className="h-full w-full flex flex-col justify-between items-center sm:items-start gap-2">
                                <h1 className="break-all text-3xl font-bold text-center sm:text-left">{titleCase(params ? params.id.replace(/-/g, " ") : "")}</h1>

                                <Button
                                    className="text-sm font-medium min-h-10 h-auto wrap-anywhere w-auto rounded-sm whitespace-normal justify-start"
                                    onClick={() => {
                                        window.open(`https://www.police.uk/pu/your-area/${params ? policeForceName : ""}/`, "_blank");
                                    }}
                                >
                                    <p className="text-left break-all">View more</p>
                                </Button>
                            </span>
                        </span>
                    </div>
                </section>

                <section className="w-full h-auto bg-gray-100/10 border-border border-t border-b sticky top-0">
                    <div className="max-w-7xl mx-auto w-full flex items-center justify-center h-auto flex-wrap">
                        {actions.map((action, index) =>  (
                            <Button
                                key={index}
                                variant={"link"}
                                disabled={action.disabled}
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/area/${params.id}/${action.tab}${action.params ? `?year=${action.params}` : ""}`);
                                }}
                                className={cn(
                                    "group relative h-auto w-auto min-w-40 shrink-0 items-center justify-center rounded-none p-9 pt-7 pb-3 hover:no-underline flex flex-col gap-0 [&_svg:not([class*='size-'])]:size-5 hover:bg-gray-100 transition-all duration-75 ease-in-out",
                                    isActive(`/area/${params.id}/${action.tab}`) || isActive(`/area/${params.id}/${action.tab}/`) ? "border-b-3 border-black" : "hover:border-b-3 hover:border-black/50",
                                )}
                            >
                                {action.icon && <action.icon size={28} />}
                                <h1
                                    className="inline-flex text-black text-xl tracking-tighter"
                                >
                                    {action.title}
                                </h1>
                            </Button>
                        ))}
                    </div>
                </section>
            </header>

            <main className="py-5 w-full h-full flex justify-center items-center bg-gray-200/25">
                <Outlet />
            </main>
        </div>
    )
}
