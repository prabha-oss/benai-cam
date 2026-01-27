import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const isValidUrl = (urlString: string) => {
    try {
        return Boolean(new URL(urlString));
    }
    catch (e) {
        return false;
    }
}
