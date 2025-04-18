import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const titleCase = (str: string) => {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
}

export const formatMonth = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    const date = new Date(year, monthIndex - 1);
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}