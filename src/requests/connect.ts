import useAxios from './useAxios'

export interface ConnectDevice {
    session_id: string
    device_name: string
    app_type: string
    can_play_audio: boolean
    volume: number
    last_seen: number
    is_stale: boolean
}

export interface ConnectState {
    trackhash: string | null
    queue: string[]
    queue_index: number
    position_ms: number
    position_reported_ms: number
    as_of: number
    is_playing: boolean
    volume: number
    active_session_id: string | null
    updated_at: number
}

const BASE = '/connect'

export async function registerDevice(device_name: string, app_type = 'web', can_play_audio = true) {
    const { data } = await useAxios({
        url: `${BASE}/register`,
        method: 'POST',
        props: { device_name, app_type, can_play_audio },
    })
    return data as { session_id: string }
}

export async function sendHeartbeat(
    session_id: string,
    state: Partial<{
        trackhash: string | null
        position_ms: number
        is_playing: boolean
        volume: number
        queue: string[]
        queue_index: number
    }> = {}
) {
    const { data } = await useAxios({
        url: `${BASE}/heartbeat`,
        method: 'POST',
        props: { session_id, ...state },
    })
    return data
}

export async function getConnectState() {
    const { data } = await useAxios({ url: `${BASE}/state`, method: 'GET' })
    return data as ConnectState
}

export async function getDevices() {
    const { data } = await useAxios({ url: `${BASE}/devices`, method: 'GET' })
    return (data.devices || []) as ConnectDevice[]
}

export async function disconnectDevice(session_id: string) {
    return await useAxios({
        url: `${BASE}/devices/${session_id}`,
        method: 'DELETE',
    })
}

export async function remotePlay() {
    const { data } = await useAxios({ url: `${BASE}/play`, method: 'PUT' })
    return data as ConnectState
}

export async function remotePause() {
    const { data } = await useAxios({ url: `${BASE}/pause`, method: 'PUT' })
    return data as ConnectState
}

export async function remoteNext() {
    const { data } = await useAxios({ url: `${BASE}/next`, method: 'POST' })
    return data as ConnectState
}

export async function remotePrevious() {
    const { data } = await useAxios({ url: `${BASE}/previous`, method: 'POST' })
    return data as ConnectState
}

export async function remoteSeek(position_ms: number) {
    const { data } = await useAxios({
        url: `${BASE}/seek`,
        method: 'PUT',
        props: { position_ms },
    })
    return data as ConnectState
}

export async function remoteVolume(volume_percent: number) {
    const { data } = await useAxios({
        url: `${BASE}/volume`,
        method: 'PUT',
        props: { volume_percent },
    })
    return data as ConnectState
}

export async function transferPlayback(session_id: string) {
    const { data } = await useAxios({
        url: `${BASE}/transfer`,
        method: 'PUT',
        props: { session_id },
    })
    return data as {
        trackhash: string
        position_ms: number
        as_of: number
        queue: string[]
        queue_index: number
        is_playing: boolean
        volume: number
    }
}
