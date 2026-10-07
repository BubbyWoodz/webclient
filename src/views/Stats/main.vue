<template>
    <div class="content-page" style="height: 100%; overflow: auto">
        <Charts />
        <br><br>
        <GenericHeader>
            <template #name>{{ $t('Views.Stats.Title')}}</template>
            <template #description>{{$t('Views.Stats.Description')}}</template>
            <template #right>
                <button
                    v-if="yearlyData"
                    class="highlights-btn"
                    @click="showReel = true"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" class="highlights-icon">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    Play Highlights
                </button>
            </template>
        </GenericHeader>
        <Stats />
        <HighlightReel
            v-if="showReel && yearlyData"
            :year="currentYear"
            :data="yearlyData"
            @close="showReel = false"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Charts from '@/components/Stats/Charts.vue'
import GenericHeader from '@/components/shared/GenericHeader.vue'
import Stats from '@/components/Stats/Stats.vue'
import HighlightReel from '@/components/Stats/HighlightReel.vue'
import { getReplayYearly, type ReplayYearly } from '@/requests/replay'

const showReel = ref(false)
const yearlyData = ref<ReplayYearly | null>(null)
const currentYear = new Date().getFullYear()

onMounted(async () => {
    try {
        yearlyData.value = await getReplayYearly(currentYear)
    } catch {
        // Replay backend not available; highlights button stays hidden
    }
})
</script>

<style scoped>
.highlights-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-weight: 600;
}
.highlights-icon {
    width: 1.1rem;
    height: 1.1rem;
}
</style>
