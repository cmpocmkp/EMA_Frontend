import { useEffect, useState } from 'react'
import { ApiError, getTehsils, type SummaryCells } from '../../api'
import { type Cell, toCells } from './data'

// Each district's tehsils download once per page load, the first time they are needed.
const tehsilRequests = new Map<string, Promise<SummaryCells>>()

export function loadTehsils(token: string, district: string) {
  let request = tehsilRequests.get(district)
  if (!request) {
    request = getTehsils(token, district)
    request.catch(() => tehsilRequests.delete(district))
    tehsilRequests.set(district, request)
  }
  return request
}

export type TehsilCells =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; cells: Cell[] }
  | { status: 'error' }

/** The tehsil cells of `district`, loaded when a district is chosen. */
export function useTehsilCells(token: string, district: string | null, onUnauthorized: () => void): TehsilCells {
  // `cells: null` records a failed load for that district.
  const [loaded, setLoaded] = useState<{ district: string; cells: Cell[] | null } | null>(null)

  useEffect(() => {
    if (!district) return
    let active = true
    loadTehsils(token, district)
      .then((data) => {
        if (active) setLoaded({ district, cells: toCells(data) })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) onUnauthorized()
        else setLoaded({ district, cells: null })
      })
    return () => {
      active = false
    }
  }, [token, district, onUnauthorized])

  if (!district) return { status: 'none' }
  if (loaded?.district !== district) return { status: 'loading' }
  return loaded.cells ? { status: 'ready', cells: loaded.cells } : { status: 'error' }
}
