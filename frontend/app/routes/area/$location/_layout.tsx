import type { Route } from "./+types/_layout";

import React from 'react'
import { Outlet, useLoaderData, useNavigate, useParams, useSearchParams } from 'react-router'

import { cn, titleCase } from "~/lib/utils";

import { ChartNoAxesCombined, Hand, House, Map as MapIcon, TrendingUpDown, type LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

interface Actions {
	title: string;
	tab: string;
	icon?: LucideIcon;
	disabled?: boolean;
}

const actions: Actions[] = [
	{
		title: "Overview",
		tab: "overview",
        icon: House,
	},
	{
		title: "Crimes",
		tab: "crimes",
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
];

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
	return {
        params,
        request,
    }
}

export default function Layout() {
    const navigate = useNavigate();
    const { params, request } = useLoaderData() as {
        params: { id: string };
        request: Request;
    }
    const policeForceName = params.id.replace(/\b(and|or)\b/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').replace(/ /g, '-').toLowerCase();
    
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
                                    className="text-lg font-semibold min-h-10 h-auto wrap-anywhere w-auto rounded-sm whitespace-normal justify-start"
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
                                    navigate(`/area/${params.id}/${action.tab}`);
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
