import {
    type RouteConfig,
    route,
    index,
    layout,
    prefix,
} from "@react-router/dev/routes";

export default [
    index('routes/index.tsx'), 
    
    ...prefix('area', [
        layout('./routes/area/$location/_layout.tsx', [
            route(':id/overview', './routes/area/$location/overview.tsx'),
            route(':id/crimes', './routes/area/$location/crime.tsx'),
        ])
    ]
)] satisfies RouteConfig
