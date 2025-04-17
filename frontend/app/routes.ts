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
            route(':id', './routes/area/$location/index.tsx'), 
        ])
    ]
)] satisfies RouteConfig
