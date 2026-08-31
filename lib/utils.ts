import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneForCall(phone?: string | null): string {
  if (!phone) return ""
  return phone.replace(/[^0-9+]/g, "")
}
