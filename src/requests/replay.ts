import { paths } from '@/config'
import useAxios from './useAxios'

const BASE = '/replay'

export interface ReplayMonthly {
    year: number
    month: number
    total_minutes: number
    total_songs: number
    top_artists: Array<{ artisthash: string; name: string; playduration: number; playcount: number }>
    top_songs: Array<{ trackhash: string; title: string; playcount: number; playduration: number }>
    top_albums: Array<{ albumhash: string; title: string; playcount: number; playduration: number }>
    milestones: Array<{ type: string; value: number; label: string; timestamp: number }>
}

export interface ReplayYearly extends ReplayMonthly {
    top_genres: Array<{ name: string; playduration: number; playcount: number }>
    artist_streaks: Array<{ artisthash: string; name: string; months: number[]; month_count: number }>
    first_plays: {
        top_song_first_played: number | null
        top_artist_first_played: number | null
        top_album_first_played: number | null
    }
    monthly_number_ones: Array<{
        month: number
        top_song: any
        top_artist: any
        top_album: any
    }>
    year_over_year: any | null
}

export async function getReplayMonthly(year: number, month: number): Promise<ReplayMonthly> {
    const res = await useAxios({
        url: `${BASE}/monthly?year=${year}&month=${month}`,
        method: 'GET',
    })
    return res.data
}

export async function getReplayYearly(year: number): Promise<ReplayYearly> {
    const res = await useAxios({
        url: `${BASE}/yearly?year=${year}`,
        method: 'GET',
    })
    return res.data
}

export async function getReplayMonths(year: number): Promise<number[]> {
    const res = await useAxios({
        url: `${BASE}/months?year=${year}`,
        method: 'GET',
    })
    return res.data.months
}

export async function createReplayPlaylist(year: number, limit: number = 100): Promise<{ playlist_id: number; track_count: number }> {
    const res = await useAxios({
        url: `${BASE}/playlist?year=${year}&limit=${limit}`,
        method: 'POST',
    })
    return res.data
}
