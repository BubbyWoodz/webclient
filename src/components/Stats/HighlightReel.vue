<template>
    <div
        class="highlight-reel"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointermove="onPointerMove"
        @pointercancel="onPointerUp"
    >
        <!-- Blurred artwork backdrop -->
        <div
            v-if="currentCard.artworkUrl"
            class="reel-backdrop"
            :style="{ backgroundImage: `url(${currentCard.artworkUrl})` }"
        ></div>
        <div class="reel-backdrop-tint"></div>

        <!-- Progress segments -->
        <div class="reel-progress">
            <div
                v-for="(card, i) in cards"
                :key="card.id"
                class="progress-segment"
            >
                <div
                    class="progress-fill"
                    :style="{ width: segmentProgress(i) + '%' }"
                ></div>
            </div>
        </div>

        <!-- Top bar -->
        <div class="reel-topbar">
            <span class="reel-title">Replay {{ year }}</span>
            <div class="reel-top-actions">
                <button
                    class="reel-icon-btn"
                    :title="muted ? 'Unmute' : 'Mute'"
                    @click.stop="toggleMute"
                >
                    <VolumeOffIcon v-if="muted" />
                    <VolumeIcon v-else />
                </button>
                <button
                    class="reel-icon-btn"
                    title="Share this card"
                    @click.stop="shareCard"
                    :disabled="sharing"
                >
                    <ShareIcon />
                </button>
                <button
                    class="reel-icon-btn"
                    title="Close"
                    @click.stop="close"
                >
                    <CloseIcon />
                </button>
            </div>
        </div>

        <!-- Card content -->
        <div class="reel-stage">
            <Transition :name="transitionName" mode="out-in">
                <div :key="currentIndex" class="reel-card">
                    <!-- Artwork card -->
                    <template v-if="currentCard.artworkUrl">
                        <img
                            :src="currentCard.artworkUrl"
                            class="card-artwork"
                            alt=""
                            draggable="false"
                        />
                    </template>
                    <!-- Genre card visual -->
                    <template v-else-if="currentCard.kind === 'genre'">
                        <div class="card-genre-visual">
                            <MusicNoteIcon />
                        </div>
                    </template>
                    <!-- Milestone visual -->
                    <template v-else-if="currentCard.kind === 'milestone'">
                        <div class="card-genre-visual">
                            <TrophyIcon />
                        </div>
                    </template>

                    <div class="card-eyebrow">{{ currentCard.eyebrow }}</div>
                    <div class="card-headline">{{ currentCard.headline }}</div>
                    <div class="card-subline">{{ currentCard.subline }}</div>
                    <div v-if="currentCard.detail" class="card-detail">
                        {{ currentCard.detail }}
                    </div>
                </div>
            </Transition>
        </div>

        <!-- Bottom hint -->
        <div class="reel-hint">
            <span>Tap sides to navigate</span>
        </div>

        <!-- Share toast -->
        <Transition name="fade">
            <div v-if="shareToast" class="share-toast">
                {{ shareToast }}
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { paths, getBaseUrl } from '@/config'
import type { ReplayYearly } from '@/requests/replay'
import { generateShareCard, downloadShareCard, type ShareCardData } from './shareCard'

import CloseIcon from '@/assets/icons/close.svg'
import ShareIcon from '@/assets/icons/share.svg'
import VolumeIcon from '@/assets/icons/volume-full.svg'
import VolumeOffIcon from '@/assets/icons/volume-mute.svg'
import MusicNoteIcon from '@/assets/icons/music-note.svg'
import TrophyIcon from '@/assets/icons/trophy.svg'

interface ReelCard {
    id: string
    kind: ShareCardData['kind']
    eyebrow: string
    headline: string
    subline: string
    detail?: string
    artworkUrl?: string
    shareData: ShareCardData
}

const props = defineProps<{
    year: number
    data: ReplayYearly
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const CARD_DURATION = 6000 // ms per card

const currentIndex = ref(0)
const paused = ref(false)
const muted = ref(true)
const sharing = ref(false)
const shareToast = ref<string | null>(null)
const direction = ref<1 | -1>(1)

// ---- Audio (dedicated element, separate from main player) ----
let audio: HTMLAudioElement | null = null

function streamUrl(trackhash: string, filepath: string): string {
    return (
        getBaseUrl() +
        `${paths.api.files}/${trackhash}/legacy?filepath=${encodeURIComponent(filepath)}`
    )
}

function setupAudio() {
    const topSong = props.data.top_songs?.[0] as any
    if (!topSong?.trackhash || !topSong?.filepath) return
    audio = new Audio()
    audio.src = streamUrl(topSong.trackhash, topSong.filepath)
    audio.volume = 0.35
    audio.loop = true
    audio.muted = true
    // Attempt autoplay — the "Play Highlights" click is a user gesture,
    // but if the browser blocks it we stay muted with a visible toggle.
    audio.play().then(
        () => {
            if (audio) {
                audio.muted = false
                muted.value = false
            }
        },
        () => {
            /* stay muted, user can unmute */
        }
    )
}

function toggleMute() {
    if (!audio) return
    muted.value = !muted.value
    audio.muted = muted.value
    if (!muted.value) {
        audio.play().catch(() => {
            muted.value = true
            if (audio) audio.muted = true
        })
    }
}

function teardownAudio() {
    if (audio) {
        audio.pause()
        audio.src = ''
        audio = null
    }
}

// ---- Card construction ----
function formatMinutes(seconds: number): string {
    const mins = Math.round(seconds / 60)
    return mins.toLocaleString()
}

const cards = computed<ReelCard[]>(() => {
    const d = props.data
    const y = props.year
    const list: ReelCard[] = []

    const mkShare = (
        kind: ShareCardData['kind'],
        headline: string,
        subline: string,
        detail?: string,
        artworkUrl?: string
    ): ShareCardData => ({ kind, year: y, headline, subline, detail, artworkUrl })

    // Intro
    list.push({
        id: 'intro',
        kind: 'intro',
        eyebrow: 'Reverb',
        headline: `${y}`,
        subline: 'Your year in music',
        detail: 'Tap to relive it',
        shareData: mkShare('intro', `${y}`, 'My year in music', 'Reverb Replay'),
    })

    // Total minutes
    const mins = formatMinutes(d.total_minutes)
    list.push({
        id: 'minutes',
        kind: 'minutes',
        eyebrow: 'Total time',
        headline: mins,
        subline: 'minutes listened',
        detail: `${(d.total_songs ?? 0).toLocaleString()} songs played`,
        shareData: mkShare('minutes', mins, 'minutes listened', `${(d.total_songs ?? 0).toLocaleString()} songs played`),
    })

    // Top artist
    const artist = d.top_artists?.[0] as any
    if (artist) {
        const artUrl = artist.image ? paths.images.artist.small + artist.image : undefined
        list.push({
            id: 'artist',
            kind: 'artist',
            eyebrow: 'Top artist',
            headline: artist.name,
            subline: `${formatMinutes(artist.playduration ?? 0)} minutes`,
            detail: artist.playcount ? `${artist.playcount.toLocaleString()} plays` : undefined,
            artworkUrl: artUrl,
            shareData: mkShare('artist', artist.name, 'My top artist', `${formatMinutes(artist.playduration ?? 0)} minutes listened`, artUrl),
        })
    }

    // Top song
    const song = d.top_songs?.[0] as any
    if (song) {
        const artUrl = song.image ? paths.images.thumb.large + song.image : undefined
        list.push({
            id: 'song',
            kind: 'song',
            eyebrow: 'Top song',
            headline: song.title,
            subline: `${(song.playcount ?? 0).toLocaleString()} plays`,
            detail: song.artists?.map((a: any) => a.name).join(', '),
            artworkUrl: artUrl,
            shareData: mkShare('song', song.title, 'My top song', `${(song.playcount ?? 0).toLocaleString()} plays`, artUrl),
        })
    }

    // Top album
    const album = d.top_albums?.[0] as any
    if (album) {
        const artUrl = album.image ? paths.images.thumb.large + album.image : undefined
        list.push({
            id: 'album',
            kind: 'album',
            eyebrow: 'Top album',
            headline: album.title,
            subline: `${(album.playcount ?? 0).toLocaleString()} plays`,
            detail: album.albumartists?.map((a: any) => a.name).join(', '),
            artworkUrl: artUrl,
            shareData: mkShare('album', album.title, 'My top album', `${(album.playcount ?? 0).toLocaleString()} plays`, artUrl),
        })
    }

    // Top genre
    const genre = d.top_genres?.[0]
    if (genre) {
        list.push({
            id: 'genre',
            kind: 'genre',
            eyebrow: 'Top genre',
            headline: genre.name,
            subline: `${formatMinutes(genre.playduration ?? 0)} minutes`,
            detail: genre.playcount ? `${genre.playcount.toLocaleString()} plays` : undefined,
            shareData: mkShare('genre', genre.name, 'My top genre', `${formatMinutes(genre.playduration ?? 0)} minutes`),
        })
    }

    // Biggest milestone
    const milestone = d.milestones?.[d.milestones.length - 1]
    if (milestone) {
        const dateStr = milestone.timestamp
            ? new Date(milestone.timestamp * 1000).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
              })
            : undefined
        list.push({
            id: 'milestone',
            kind: 'milestone',
            eyebrow: 'Milestone',
            headline: milestone.label,
            subline: dateStr ?? 'This year',
            shareData: mkShare('milestone', milestone.label, 'Milestone unlocked', dateStr),
        })
    }

    // Artist streak
    const streak = d.artist_streaks?.[0]
    if (streak && streak.month_count > 1) {
        list.push({
            id: 'streak',
            kind: 'streak',
            eyebrow: 'Loyal fan',
            headline: streak.name,
            subline: `#1 for ${streak.month_count} straight months`,
            shareData: mkShare('streak', streak.name, 'Loyal fan', `#1 for ${streak.month_count} straight months`),
        })
    }

    // Year over year
    const yoy = d.year_over_year as any
    if (yoy?.total_minutes) {
        const prev = Math.round(yoy.total_minutes.previous ?? 0)
        const curr = Math.round(yoy.total_minutes.current ?? 0)
        const delta = curr - prev
        const pct = prev ? Math.round((delta / prev) * 100) : 0
        const trend = delta > 0 ? `+${pct}%` : delta < 0 ? `${pct}%` : 'even'
        list.push({
            id: 'yoy',
            kind: 'yoy',
            eyebrow: `vs ${y - 1}`,
            headline: curr.toLocaleString(),
            subline: 'minutes this year',
            detail: `${trend} vs last year`,
            shareData: mkShare('yoy', curr.toLocaleString(), 'minutes this year', `${trend} vs ${y - 1}`),
        })
    }

    // Outro
    list.push({
        id: 'outro',
        kind: 'outro',
        eyebrow: 'Reverb Replay',
        headline: 'Thanks for listening',
        subline: `${y} in review`,
        detail: 'See you next year',
        shareData: mkShare('outro', `${y}`, 'My year in music', 'Reverb Replay'),
    })

    return list
})

const currentCard = computed(() => cards.value[currentIndex.value])

const transitionName = computed(() =>
    direction.value === 1 ? 'card-next' : 'card-prev'
)

// ---- Timer / progress ----
let rafId = 0
let cardStart = 0
let elapsedBeforePause = 0
const progress = ref(0) // 0-100 for current card

function tick(now: number) {
    if (!paused.value) {
        const elapsed = elapsedBeforePause + (now - cardStart)
        progress.value = Math.min(100, (elapsed / CARD_DURATION) * 100)
        if (progress.value >= 100) {
            next()
            return
        }
    }
    rafId = requestAnimationFrame(tick)
}

function startTimer() {
    cancelAnimationFrame(rafId)
    cardStart = performance.now()
    elapsedBeforePause = 0
    progress.value = 0
    rafId = requestAnimationFrame(tick)
}

function pauseTimer() {
    if (paused.value) return
    paused.value = true
    elapsedBeforePause += performance.now() - cardStart
}

function resumeTimer() {
    if (!paused.value) return
    paused.value = false
    cardStart = performance.now()
    rafId = requestAnimationFrame(tick)
}

function segmentProgress(i: number): number {
    if (i < currentIndex.value) return 100
    if (i > currentIndex.value) return 0
    return progress.value
}

function goTo(index: number) {
    const n = cards.value.length
    const clamped = Math.max(0, Math.min(n - 1, index))
    direction.value = clamped >= currentIndex.value ? 1 : -1
    currentIndex.value = clamped
    startTimer()
}

function next() {
    if (currentIndex.value >= cards.value.length - 1) {
        close()
        return
    }
    goTo(currentIndex.value + 1)
}

function prev() {
    goTo(currentIndex.value - 1)
}

// ---- Tap / swipe handling ----
let pointerDownTime = 0
let pointerDownX = 0
let pointerDownY = 0
let isHolding = false

function onPointerDown(e: PointerEvent) {
    pointerDownTime = performance.now()
    pointerDownX = e.clientX
    pointerDownY = e.clientY
    isHolding = false
    // Pause after a short delay so quick taps don't flicker
    setTimeout(() => {
        if (pointerDownTime > 0 && performance.now() - pointerDownTime > 200) {
            isHolding = true
            pauseTimer()
        }
    }, 200)
}

function onPointerMove(e: PointerEvent) {
    if (pointerDownTime === 0) return
    const dx = e.clientX - pointerDownX
    // Horizontal swipe: navigate on release
    if (Math.abs(dx) > 60) {
        isHolding = true // treat as gesture, not tap
    }
}

function onPointerUp(e: PointerEvent) {
    if (pointerDownTime === 0) return
    const duration = performance.now() - pointerDownTime
    const dx = e.clientX - pointerDownX
    const wasHolding = isHolding
    pointerDownTime = 0
    isHolding = false

    if (wasHolding && paused.value) {
        resumeTimer()
    }

    // Swipe
    if (Math.abs(dx) > 60) {
        if (dx < 0) next()
        else prev()
        return
    }

    // Quick tap (not a hold): navigate by tap zone
    if (duration < 300 && !wasHolding) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const x = e.clientX - rect.left
        if (x < rect.width * 0.3) prev()
        else next()
    }
}

// ---- Keyboard ----
function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowRight') next()
    else if (e.key === 'ArrowLeft') prev()
    else if (e.key === ' ') {
        e.preventDefault()
        paused.value ? resumeTimer() : pauseTimer()
    }
}

// ---- Share ----
async function shareCard() {
    if (sharing.value) return
    sharing.value = true
    pauseTimer()
    try {
        const blob = await generateShareCard(currentCard.value.shareData)
        const safeName = currentCard.value.headline.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
        downloadShareCard(blob, `reverb-replay-${props.year}-${safeName}.png`)
        showToast('Card saved')
    } catch {
        showToast('Could not create card')
    } finally {
        sharing.value = false
        resumeTimer()
    }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
    shareToast.value = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
        shareToast.value = null
    }, 2200)
}

function close() {
    teardownAudio()
    emit('close')
}

onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
    setupAudio()
    startTimer()
})

onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    cancelAnimationFrame(rafId)
    teardownAudio()
    if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped lang="scss">
.highlight-reel {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #0a0a0a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: pan-y;
    cursor: pointer;
}

.reel-backdrop {
    position: absolute;
    inset: -40px;
    background-size: cover;
    background-position: center;
    filter: blur(60px) brightness(0.5) saturate(1.2);
    transform: scale(1.1);
    transition: background-image 0.5s ease;
}

.reel-backdrop-tint {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.55) 0%,
        rgba(0, 0, 0, 0.25) 30%,
        rgba(0, 0, 0, 0.45) 70%,
        rgba(0, 0, 0, 0.75) 100%
    );
}

.reel-progress {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 6px;
    padding: 14px 16px 0;
}

.progress-segment {
    flex: 1;
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.25);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 999px;
    background: #fff;
    width: 0%;
}

.reel-topbar {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
}

.reel-title {
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: 0.02em;
    color: #fff;
}

.reel-top-actions {
    display: flex;
    gap: 4px;
}

.reel-icon-btn {
    background: rgba(0, 0, 0, 0.35);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: #fff;
    backdrop-filter: blur(8px);
    transition: background 0.15s;

    &:hover {
        background: rgba(0, 0, 0, 0.55);
    }

    &:disabled {
        opacity: 0.5;
    }

    :deep(svg) {
        width: 20px;
        height: 20px;
        fill: currentColor;
    }
}

.reel-stage {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    min-height: 0;
}

.reel-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 640px;
    width: 100%;
}

.card-artwork {
    width: min(52vw, 300px);
    aspect-ratio: 1;
    border-radius: 20px;
    object-fit: cover;
    margin-bottom: 2rem;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}

.card-genre-visual,
.card-genre-visual {
    width: min(40vw, 200px);
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    margin-bottom: 2rem;
    background: linear-gradient(135deg, #f7635c, #a02a25);
    box-shadow: 0 24px 80px rgba(247, 99, 92, 0.3);

    :deep(svg) {
        width: 44%;
        height: 44%;
        fill: #fff;
    }
}

.card-eyebrow {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f7635c;
    margin-bottom: 0.75rem;
}

.card-headline {
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #fff;
    margin-bottom: 0.75rem;
    overflow-wrap: break-word;
}

.card-subline {
    font-size: clamp(1.1rem, 3.5vw, 1.5rem);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
}

.card-detail {
    margin-top: 0.5rem;
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.55);
}

.reel-hint {
    position: relative;
    z-index: 2;
    text-align: center;
    padding-bottom: 1.75rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
}

.share-toast {
    position: absolute;
    z-index: 3;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #fff;
    padding: 0.7rem 1.4rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.9rem;
    backdrop-filter: blur(8px);
}

// Card transitions
.card-next-enter-active,
.card-next-leave-active,
.card-prev-enter-active,
.card-prev-leave-active {
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.card-next-enter-from {
    opacity: 0;
    transform: translateX(60px) scale(0.96);
}

.card-next-leave-to {
    opacity: 0;
    transform: translateX(-60px) scale(0.96);
}

.card-prev-enter-from {
    opacity: 0;
    transform: translateX(-60px) scale(0.96);
}

.card-prev-leave-to {
    opacity: 0;
    transform: translateX(60px) scale(0.96);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

@media (max-width: 640px) {
    .card-artwork {
        width: min(64vw, 260px);
    }

    .reel-stage {
        padding: 1.25rem;
    }
}
</style>
