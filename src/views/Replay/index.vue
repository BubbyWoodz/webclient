<template>
    <div class="replay-page content-page">
        <div class="replay-header">
            <div class="replay-title-section">
                <h1 class="replay-title">Replay</h1>
                <p class="replay-subtitle">{{ viewMode === 'month' ? monthLabel : `${selectedYear} Year in Review` }}</p>
            </div>
            <div class="replay-controls">
                <div class="view-toggle">
                    <button
                        :class="{ active: viewMode === 'month' }"
                        @click="viewMode = 'month'"
                    >Month</button>
                    <button
                        :class="{ active: viewMode === 'year' }"
                        @click="viewMode = 'year'"
                    >Year</button>
                </div>
                <select v-model="selectedYear" class="year-select" @change="loadData">
                    <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
                </select>
                <select
                    v-if="viewMode === 'month'"
                    v-model="selectedMonth"
                    class="month-select"
                    @change="loadData"
                >
                    <option v-for="m in availableMonths" :key="m" :value="m">
                        {{ monthName(m) }}
                    </option>
                </select>
            </div>
        </div>

        <div v-if="loading" class="replay-loading">
            <div class="spinner"></div>
            <p>Loading your Replay...</p>
        </div>

        <div v-else-if="error" class="replay-error">
            <p>{{ error }}</p>
            <button @click="loadData">Retry</button>
        </div>

        <div v-else-if="data" class="replay-content">
            <!-- Hero: Total minutes -->
            <section class="replay-hero">
                <div class="hero-minutes">
                    <span class="hero-number">{{ formatNumber(Math.round(data.total_minutes)) }}</span>
                    <span class="hero-label">minutes listened</span>
                </div>
                <div class="hero-stats">
                    <div class="hero-stat">
                        <span class="stat-number">{{ formatNumber(data.total_songs) }}</span>
                        <span class="stat-label">songs played</span>
                    </div>
                    <button
                        v-if="viewMode === 'year'"
                        class="playlist-btn"
                        @click="generatePlaylist"
                        :disabled="generatingPlaylist"
                    >
                        {{ generatingPlaylist ? 'Creating...' : `Create Top ${playlistLimit} Playlist` }}
                    </button>
                    <button
                        v-if="viewMode === 'year' && data"
                        class="highlights-btn"
                        @click="showReel = true"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" class="highlights-icon">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play Highlights
                    </button>
                </div>
            </section>

            <!-- Top Artists -->
            <section class="replay-section" v-if="data.top_artists?.length">
                <h2>Top Artists</h2>
                <div class="ranked-list">
                    <div
                        v-for="(artist, i) in data.top_artists.slice(0, 10)"
                        :key="artist.artisthash"
                        class="ranked-row"
                        @click="goToArtist(artist.artisthash)"
                    >
                        <span class="rank">{{ i + 1 }}</span>
                        <img
                            :src="paths.images.artist.small + artist.image"
                            class="row-art"
                            loading="lazy"
                        />
                        <div class="row-info">
                            <span class="row-name">{{ artist.name }}</span>
                            <span class="row-meta">{{ formatMinutes(artist.playduration) }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Top Songs -->
            <section class="replay-section" v-if="data.top_songs?.length">
                <h2>Top Songs</h2>
                <div class="ranked-list">
                    <div
                        v-for="(song, i) in data.top_songs.slice(0, 10)"
                        :key="song.trackhash"
                        class="ranked-row"
                    >
                        <span class="rank">{{ i + 1 }}</span>
                        <img
                            :src="paths.images.thumb.small + song.image"
                            class="row-art"
                            loading="lazy"
                        />
                        <div class="row-info">
                            <span class="row-name">{{ song.title }}</span>
                            <span class="row-meta">{{ song.playcount }} plays</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Top Albums -->
            <section class="replay-section" v-if="data.top_albums?.length">
                <h2>Top Albums</h2>
                <div class="album-grid">
                    <div
                        v-for="album in data.top_albums.slice(0, 6)"
                        :key="album.albumhash"
                        class="album-card"
                        @click="goToAlbum(album.albumhash)"
                    >
                        <img
                            :src="paths.images.thumb.large + album.image"
                            class="album-art"
                            loading="lazy"
                        />
                        <span class="album-name">{{ album.title }}</span>
                        <span class="album-meta">{{ album.playcount }} plays</span>
                    </div>
                </div>
            </section>

            <!-- Milestones -->
            <section class="replay-section" v-if="data.milestones?.length">
                <h2>Milestones</h2>
                <div class="milestone-timeline">
                    <div
                        v-for="(m, i) in data.milestones"
                        :key="i"
                        class="milestone-item"
                    >
                        <div class="milestone-dot"></div>
                        <div class="milestone-content">
                            <span class="milestone-label">{{ m.label }}</span>
                            <span class="milestone-date">{{ formatDate(m.timestamp) }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Yearly-only sections -->
            <template v-if="viewMode === 'year' && isYearly(data)">
                <!-- Top Genres -->
                <section class="replay-section" v-if="data.top_genres?.length">
                    <h2>Top Genres</h2>
                    <div class="genre-bars">
                        <div
                            v-for="g in data.top_genres.slice(0, 5)"
                            :key="g.name"
                            class="genre-bar-row"
                        >
                            <span class="genre-name">{{ g.name }}</span>
                            <div class="genre-bar-track">
                                <div
                                    class="genre-bar-fill"
                                    :style="{ width: genreBarWidth(g.playduration) + '%' }"
                                ></div>
                            </div>
                            <span class="genre-minutes">{{ formatMinutes(g.playduration) }}</span>
                        </div>
                    </div>
                </section>

                <!-- Artist Streaks -->
                <section class="replay-section" v-if="data.artist_streaks?.length">
                    <h2>Artist Streaks</h2>
                    <div class="streak-list">
                        <div
                            v-for="s in data.artist_streaks"
                            :key="s.artisthash"
                            class="streak-item"
                        >
                            <svg class="streak-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
                            </svg>
                            <div class="streak-info">
                                <span class="streak-name">{{ s.name }}</span>
                                <span class="streak-detail">
                                    #1 for {{ s.month_count }} straight months
                                    ({{ streakMonths(s.months) }})
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Monthly Number Ones -->
                <section class="replay-section" v-if="data.monthly_number_ones?.length">
                    <h2>Monthly Number Ones</h2>
                    <div class="month-strip">
                        <div
                            v-for="m in data.monthly_number_ones"
                            :key="m.month"
                            class="month-card"
                            @click="jumpToMonth(m.month)"
                        >
                            <span class="month-name">{{ monthName(m.month) }}</span>
                            <span class="month-top" v-if="m.top_artist">{{ m.top_artist.name }}</span>
                            <span class="month-top-song" v-if="m.top_song">{{ m.top_song.title }}</span>
                        </div>
                    </div>
                </section>

                <!-- Year over Year -->
                <section class="replay-section" v-if="data.year_over_year">
                    <h2>vs {{ selectedYear - 1 }}</h2>
                    <div class="yoy-grid">
                        <div class="yoy-card" v-if="data.year_over_year.top_artist">
                            <span class="yoy-label">Top Artist</span>
                            <span class="yoy-then">{{ data.year_over_year.top_artist.previous?.name || '—' }}</span>
                            <span class="yoy-arrow">→</span>
                            <span class="yoy-now">{{ data.year_over_year.top_artist.current?.name || '—' }}</span>
                        </div>
                        <div class="yoy-card" v-if="data.year_over_year.top_song">
                            <span class="yoy-label">Top Song</span>
                            <span class="yoy-then">{{ data.year_over_year.top_song.previous?.title || '—' }}</span>
                            <span class="yoy-arrow">→</span>
                            <span class="yoy-now">{{ data.year_over_year.top_song.current?.title || '—' }}</span>
                        </div>
                        <div class="yoy-card" v-if="data.year_over_year.total_minutes">
                            <span class="yoy-label">Minutes</span>
                            <span class="yoy-then">{{ formatNumber(Math.round(data.year_over_year.total_minutes.previous)) }}</span>
                            <span class="yoy-arrow">→</span>
                            <span class="yoy-now">{{ formatNumber(Math.round(data.year_over_year.total_minutes.current)) }}</span>
                            <span
                                class="yoy-delta"
                                :class="{ up: data.year_over_year.total_minutes.delta > 0, down: data.year_over_year.total_minutes.delta < 0 }"
                            >
                                {{ deltaLabel(data.year_over_year.total_minutes.delta) }}
                            </span>
                        </div>
                    </div>
                </section>
            </template>
        </div>

        <div v-else class="replay-empty">
            <p>No listening data for this period yet.</p>
            <p class="empty-hint">Play some music and check back soon.</p>
        </div>

        <HighlightReel
            v-if="showReel && yearlyData"
            :year="selectedYear"
            :data="yearlyData"
            @close="showReel = false"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Routes } from '@/router'
import { paths } from '@/config'

import {
    getReplayMonthly,
    getReplayYearly,
    getReplayMonths,
    createReplayPlaylist,
    type ReplayMonthly,
    type ReplayYearly,
} from '@/requests/replay'
import HighlightReel from './HighlightReel.vue'


const router = useRouter()

const viewMode = ref<'month' | 'year'>('month')
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const availableYears = ref<number[]>([])
const availableMonths = ref<number[]>([])
const data = ref<ReplayMonthly | ReplayYearly | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const generatingPlaylist = ref(false)
const playlistLimit = ref(100)
const showReel = ref(false)

const monthLabel = computed(() => {
    const d = new Date(selectedYear.value, selectedMonth.value - 1)
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

function isYearly(d: ReplayMonthly | ReplayYearly): d is ReplayYearly {
    return 'top_genres' in d
}

const yearlyData = computed<ReplayYearly | null>(() => {
    return data.value && isYearly(data.value) ? data.value : null
})

function monthName(m: number): string {
    return new Date(2000, m - 1).toLocaleDateString(undefined, { month: 'long' })
}

function formatNumber(n: number): string {
    return n.toLocaleString()
}

function formatMinutes(seconds: number): string {
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}h ${m}m` : `${h}h`
}

function formatDate(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

function genreBarWidth(playduration: number): number {
    const y = data.value as ReplayYearly
    if (!y?.top_genres?.length) return 0
    const max = y.top_genres[0].playduration
    return max ? Math.round((playduration / max) * 100) : 0
}

function streakMonths(months: number[]): string {
    return months.map(monthName).join(', ')
}

function deltaLabel(delta: number): string {
    const pct = Math.abs(Math.round(delta * 100))
    return delta > 0 ? `+${pct}%` : delta < 0 ? `-${pct}%` : '—'
}

async function loadData() {
    loading.value = true
    error.value = null
    try {
        if (viewMode.value === 'month') {
            data.value = await getReplayMonthly(selectedYear.value, selectedMonth.value)
        } else {
            data.value = await getReplayYearly(selectedYear.value)
        }
    } catch (e: any) {
        error.value = e?.response?.data?.msg || 'Failed to load Replay data.'
        data.value = null
    } finally {
        loading.value = false
    }
}

async function loadAvailablePeriods() {
    const now = new Date()
    const years: number[] = []
    for (let y = now.getFullYear(); y >= 2020; y--) years.push(y)
    availableYears.value = years

    try {
        availableMonths.value = await getReplayMonths(selectedYear.value)
        if (!availableMonths.value.includes(selectedMonth.value)) {
            selectedMonth.value = availableMonths.value[0] || now.getMonth() + 1
        }
    } catch {
        availableMonths.value = Array.from({ length: 12 }, (_, i) => i + 1)
    }
}

async function generatePlaylist() {
    generatingPlaylist.value = true
    try {
        const result = await createReplayPlaylist(selectedYear.value, playlistLimit.value)
        router.push({ name: Routes.playlist, params: { id: result.playlist_id } })
    } catch (e) {
        console.error('Failed to create playlist', e)
    } finally {
        generatingPlaylist.value = false
    }
}

function jumpToMonth(m: number) {
    selectedMonth.value = m
    viewMode.value = 'month'
    loadData()
}

function goToArtist(artisthash: string) {
    router.push({ name: Routes.artist, params: { artisthash } })
}

function goToAlbum(albumhash: string) {
    router.push({ name: Routes.album, params: { albumhash } })
}

onMounted(async () => {
    await loadAvailablePeriods()
    await loadData()
})
</script>

<style scoped>
.replay-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    overflow-y: auto;
}

.replay-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.replay-title {
    font-size: 3rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, var(--accent, #ff5e3a), var(--accent2, #ff2a68));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.replay-subtitle {
    font-size: 1.1rem;
    opacity: 0.7;
    margin: 0.25rem 0 0;
}

.replay-controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.view-toggle {
    display: flex;
    background: var(--bg-3, #1a1a2e);
    border-radius: 999px;
    padding: 4px;
}

.view-toggle button {
    border: none;
    background: transparent;
    color: inherit;
    padding: 0.5rem 1.25rem;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 600;
    opacity: 0.6;
}

.view-toggle button.active {
    background: var(--accent, #ff5e3a);
    color: #fff;
    opacity: 1;
}

.year-select,
.month-select {
    background: var(--bg-3, #1a1a2e);
    color: inherit;
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    cursor: pointer;
}

.replay-hero {
    background: linear-gradient(135deg, var(--bg-3, #1a1a2e), var(--bg-2, #16213e));
    border-radius: 24px;
    padding: 3rem;
    margin-bottom: 2.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.5rem;
    position: relative;
    overflow: hidden;
}

.hero-minutes {
    display: flex;
    flex-direction: column;
}

.hero-number {
    font-size: 5rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.02em;
}

.hero-label {
    font-size: 1.25rem;
    opacity: 0.7;
    margin-top: 0.5rem;
}

.hero-stats {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-end;
}

.hero-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.stat-number {
    font-size: 2rem;
    font-weight: 800;
}

.stat-label {
    opacity: 0.6;
}

.playlist-btn {
    background: var(--accent, #ff5e3a);
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1.5rem;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.95rem;
}

.playlist-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.highlights-btn {
    background: transparent;
    color: var(--accent, #ff5e3a);
    border: 2px solid var(--accent, #ff5e3a);
    border-radius: 999px;
    padding: 0.65rem 1.4rem;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.95rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.15s, color 0.15s;
}

.highlights-btn:hover {
    background: var(--accent, #ff5e3a);
    color: #fff;
}

.highlights-icon {
    width: 18px;
    height: 18px;
}

.replay-section {
    margin-bottom: 2.5rem;
}

.replay-section h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
}

.ranked-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.ranked-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s;
}

.ranked-row:hover {
    background: var(--bg-3, #1a1a2e);
}

.rank {
    font-size: 1.1rem;
    font-weight: 700;
    opacity: 0.4;
    min-width: 2rem;
    text-align: center;
}

.row-art {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
}

.row-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.row-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.row-meta {
    font-size: 0.85rem;
    opacity: 0.6;
}

.row-play {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0;
    padding: 0.5rem;
}

.ranked-row:hover .row-play {
    opacity: 0.7;
}

.album-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.25rem;
}

.album-card {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.album-art {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    object-fit: cover;
}

.album-name {
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.album-meta {
    font-size: 0.85rem;
    opacity: 0.6;
}

.milestone-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    padding-left: 1.5rem;
}

.milestone-timeline::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--border, #333);
}

.milestone-item {
    position: relative;
    padding: 0.75rem 0;
    display: flex;
    gap: 1rem;
    align-items: center;
}

.milestone-dot {
    position: absolute;
    left: -1.5rem;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent, #ff5e3a);
    border: 3px solid var(--bg, #0f0f1a);
}

.milestone-content {
    display: flex;
    flex-direction: column;
}

.milestone-label {
    font-weight: 600;
}

.milestone-date {
    font-size: 0.85rem;
    opacity: 0.6;
}

.genre-bars {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.genre-bar-row {
    display: grid;
    grid-template-columns: 140px 1fr 80px;
    gap: 1rem;
    align-items: center;
}

.genre-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.genre-bar-track {
    height: 10px;
    background: var(--bg-3, #1a1a2e);
    border-radius: 999px;
    overflow: hidden;
}

.genre-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent, #ff5e3a), var(--accent2, #ff2a68));
    border-radius: 999px;
    transition: width 0.5s ease;
}

.genre-minutes {
    text-align: right;
    font-size: 0.9rem;
    opacity: 0.7;
}

.streak-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.streak-item {
    display: flex;
    gap: 1rem;
    align-items: center;
    background: var(--bg-3, #1a1a2e);
    border-radius: 16px;
    padding: 1rem 1.25rem;
}

.streak-icon {
    width: 32px;
    height: 32px;
    color: var(--accent, #ff5e3a);
    flex-shrink: 0;
}

.streak-info {
    display: flex;
    flex-direction: column;
}

.streak-name {
    font-weight: 700;
    font-size: 1.05rem;
}

.streak-detail {
    opacity: 0.65;
    font-size: 0.9rem;
}

.month-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
}

.month-card {
    background: var(--bg-3, #1a1a2e);
    border-radius: 16px;
    padding: 1rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    transition: transform 0.15s;
}

.month-card:hover {
    transform: translateY(-2px);
}

.month-name {
    font-weight: 700;
    font-size: 0.95rem;
    opacity: 0.8;
}

.month-top {
    font-weight: 600;
}

.month-top-song {
    font-size: 0.85rem;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.yoy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
}

.yoy-card {
    background: var(--bg-3, #1a1a2e);
    border-radius: 16px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
    text-align: center;
}

.yoy-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
    font-weight: 700;
}

.yoy-then {
    opacity: 0.55;
    text-decoration: line-through;
}

.yoy-arrow {
    opacity: 0.4;
}

.yoy-now {
    font-weight: 700;
    font-size: 1.1rem;
}

.yoy-delta {
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
}

.yoy-delta.up {
    background: rgba(52, 199, 123, 0.15);
    color: #34c77b;
}

.yoy-delta.down {
    background: rgba(255, 69, 58, 0.15);
    color: #ff453a;
}

.replay-loading,
.replay-error,
.replay-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    gap: 1rem;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border, #333);
    border-top-color: var(--accent, #ff5e3a);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.empty-hint {
    opacity: 0.6;
}
</style>
