export interface PlatformNavigationFlags {
  enablePlatformNavigation?: boolean
  [key: string]: boolean | undefined
}

export function getPlatformNavigationFlags(): PlatformNavigationFlags {
  return {
    enablePlatformNavigation: true,
  }
}
