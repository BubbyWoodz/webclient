import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
    registerDevice,
    sendHeartbeat,
    getDevices,
    disconnectDevice,
    transferPlayback,
    ConnectDevice,
    ConnectState,
} from '@/requests/connect'

const SESSION_KEY = 'connect_session_id'

function deviceName(): string {
    const stored = localStorage.getItem('connect_device_name')
    if (stored) return stored
    const platform =
        /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iPhone/iPad' :
        /Android/.test(navigator.userAgent) ? 'Android' :
        /Mac/.test(navigator.userAgent) ? 'Mac' :
        /Win/.test(navigator.userAgent) ? 'Windows PC' : 'Browser'
    return `${platform}`
}

export default defineStore('connect', () => {
    const sessionId = ref<string | null>(localStorage.getItem(SESSION_KEY))
    const devices = ref<ConnectDevice[]>([])
    const state = ref<ConnectState | null>(null)
    const connected = ref(false)

    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let eventSource: EventSource | null = null

    async function ensureSession() {
        if (sessionId.value) return sessionId.value
        try {
            const { session_id } = await registerDevice(deviceName(), 'web', true)
            sessionId.value = session_id
            localStorage.setItem(SESSION_KEY, session_id)
            return session_id
        } catch {
            return null
        }
    }

    async function heartbeat(extra: Parameters<typeof sendHeartbeat>[1] = {}) {
        const sid = await ensureSession()
        if (!sid) return
        try {
            await sendHeartbeat(sid, extra)
        } catch {
            sessionId.value = null
            localStorage.removeItem(SESSION_KEY)
        }
    }

    async function refreshDevices() {
        try {
            devices.value = await getDevices()
        } catch {
            devices.value = []
        }
    }

    async function disconnect(session_id: string) {
        await disconnectDevice(session_id)
        await refreshDevices()
    }

    async function transferTo(session_id: string) {
        return await transferPlayback(session_id)
    }

    function startHeartbeatLoop() {
        if (heartbeatTimer) return
        heartbeatTimer = setInterval(() => {
            heartbeat()
            refreshDevices()
        }, 30000)
    }

    function stopHeartbeatLoop() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer)
            heartbeatTimer = null
        }
    }

    function startStateFeed(onState?: (s: ConnectState) => void) {
        if (eventSource) return
        try {
            eventSource = new EventSource('/events/stream', { withCredentials: true })
            eventSource.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data)
                    if (msg.event === 'connect_state' && msg.data?.state) {
                        state.value = msg.data.state
                        connected.value = true
                        onState?.(msg.data.state)
                    }
                } catch {
                    /* ignore malformed events */
                }
            }
            eventSource.onerror = () => {
                connected.value = false
            }
        } catch {
            /* SSE unavailable */
        }
    }

    function stopStateFeed() {
        eventSource?.close()
        eventSource = null
        connected.value = false
    }

    return {
        sessionId,
        devices,
        state,
        connected,
        ensureSession,
        heartbeat,
        refreshDevices,
        disconnect,
        transferTo,
        startHeartbeatLoop,
        stopHeartbeatLoop,
        startStateFeed,
        stopStateFeed,
    }
})
