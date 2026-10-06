<template>
    <div class="connect-devices">
        <div class="devices-header">
            <div class="desc">
                Devices signed in to your account. Disconnect any device remotely,
                or hand playback to another device.
            </div>
            <button class="refresh-btn" @click="refresh" :disabled="loading">
                {{ loading ? 'Refreshing…' : 'Refresh' }}
            </button>
        </div>

        <div v-if="devices.length === 0" class="empty">
            No devices connected yet.
        </div>

        <div v-for="d in devices" :key="d.session_id" class="device-row">
            <div class="device-icon" :class="d.app_type">
                <component :is="iconFor(d.app_type)" />
            </div>
            <div class="device-info">
                <div class="device-name">
                    {{ d.device_name }}
                    <span v-if="d.session_id === store.sessionId" class="badge this-device">This device</span>
                    <span v-if="d.is_stale" class="badge stale">Offline</span>
                    <span v-else class="badge online">Active</span>
                </div>
                <div class="device-meta">
                    {{ appTypeLabel(d.app_type) }} · Last active {{ timeAgo(d.last_seen) }}
                </div>
            </div>
            <div class="device-actions">
                <button
                    v-if="d.can_play_audio && d.session_id !== store.sessionId && !d.is_stale"
                    class="transfer-btn"
                    @click="transfer(d)"
                    :disabled="transferring === d.session_id"
                >
                    {{ transferring === d.session_id ? '…' : 'Play here' }}
                </button>
                <button
                    v-if="d.session_id !== store.sessionId"
                    class="disconnect-btn"
                    @click="askDisconnect(d)"
                >
                    Disconnect
                </button>
            </div>
        </div>

        <!-- Confirmation popup -->
        <div v-if="pendingDisconnect" class="confirm-overlay" @click.self="cancelDisconnect">
            <div class="confirm-popup">
                <div class="confirm-title">Disconnect device?</div>
                <div class="confirm-text">
                    <strong>{{ pendingDisconnect.device_name }}</strong> will be signed out
                    and removed from your devices. If it's playing music, playback will stop there.
                </div>
                <div class="confirm-buttons">
                    <button class="cancel-btn" @click="cancelDisconnect">Cancel</button>
                    <button class="confirm-btn" @click="confirmDisconnect" :disabled="disconnecting">
                        {{ disconnecting ? 'Disconnecting…' : 'Disconnect' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import useConnectStore from '@/stores/connect'
import { ConnectDevice } from '@/requests/connect'

import PhoneSvg from '@/assets/icons/phone.svg'
import LaptopSvg from '@/assets/icons/laptop.svg'
import HeadphonesSvg from '@/assets/icons/headphones.svg'

const store = useConnectStore()
const loading = ref(false)
const disconnecting = ref(false)
const transferring = ref<string | null>(null)
const pendingDisconnect = ref<ConnectDevice | null>(null)

const devices = computed(() => store.devices)

function iconFor(appType: string) {
    switch (appType) {
        case 'ios':
        case 'android':
            return PhoneSvg
        case 'tv':
            return HeadphonesSvg
        default:
            return LaptopSvg
    }
}

function appTypeLabel(appType: string) {
    const labels: Record<string, string> = {
        web: 'Web',
        ios: 'iOS',
        android: 'Android',
        desktop: 'Desktop app',
        tv: 'TV',
        other: 'Other',
    }
    return labels[appType] || appType
}

function timeAgo(ts: number): string {
    const s = Math.max(0, Math.floor(Date.now() / 1000 - ts))
    if (s < 10) return 'just now'
    if (s < 60) return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
}

async function refresh() {
    loading.value = true
    try {
        await store.refreshDevices()
    } finally {
        loading.value = false
    }
}

function askDisconnect(d: ConnectDevice) {
    pendingDisconnect.value = d
}

function cancelDisconnect() {
    pendingDisconnect.value = null
}

async function confirmDisconnect() {
    if (!pendingDisconnect.value) return
    disconnecting.value = true
    try {
        await store.disconnect(pendingDisconnect.value.session_id)
    } finally {
        disconnecting.value = false
        pendingDisconnect.value = null
    }
}

async function transfer(d: ConnectDevice) {
    transferring.value = d.session_id
    try {
        await store.transferTo(d.session_id)
        await refresh()
    } finally {
        transferring.value = null
    }
}

onMounted(() => {
    refresh()
})
</script>

<style lang="scss" scoped>
.connect-devices {
    width: 100%;
    padding: 0.5rem 0;
}

.devices-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;

    .desc {
        font-size: 0.9rem;
        opacity: 0.7;
    }

    .refresh-btn {
        flex-shrink: 0;
        padding: 0.4rem 1rem;
        border-radius: 2rem;
        background: rgba(255, 255, 255, 0.08);
    }
}

.empty {
    opacity: 0.6;
    padding: 1rem 0;
}

.device-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    &:last-child {
        border-bottom: none;
    }
}

.device-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    :deep(svg) {
        width: 1.4rem;
        height: 1.4rem;
    }
}

.device-info {
    flex: 1;
    min-width: 0;
}

.device-name {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.device-meta {
    font-size: 0.85rem;
    opacity: 0.6;
    margin-top: 0.15rem;
}

.badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.6rem;
    border-radius: 2rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    &.online {
        background: rgba(46, 204, 113, 0.15);
        color: #2ecc71;
    }

    &.stale {
        background: rgba(255, 255, 255, 0.08);
        opacity: 0.7;
    }

    &.this-device {
        background: rgba(88, 101, 242, 0.15);
        color: #8b9dff;
    }
}

.device-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;

    button {
        padding: 0.45rem 1rem;
        border-radius: 2rem;
        font-size: 0.85rem;
        font-weight: 600;
    }

    .transfer-btn {
        background: $accent;
        color: white;
    }

    .disconnect-btn {
        background: rgba(255, 255, 255, 0.08);
        opacity: 0.85;
    }
}

.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.confirm-popup {
    background: var(--bg, #1a1a1a);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1.75rem;
    max-width: 26rem;
    width: calc(100% - 3rem);
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
}

.confirm-title {
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
}

.confirm-text {
    opacity: 0.8;
    line-height: 1.5;
    margin-bottom: 1.5rem;
}

.confirm-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;

    button {
        padding: 0.7rem;
        border-radius: 2rem;
        font-weight: 600;
    }

    .cancel-btn {
        background: rgba(255, 255, 255, 0.08);
    }

    .confirm-btn {
        background: $red;
        color: white;
    }
}
</style>
