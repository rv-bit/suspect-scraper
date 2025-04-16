import React from 'react'
import { Outlet } from 'react-router'

export default function Layout() {
    return (
        <div className='flex flex-col justify-center items-center'>
            <h1>_layout text</h1>
            <Outlet />
        </div>
    )
}
