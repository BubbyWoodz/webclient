<template>
    <div id="playlist-artwork-modal" class="playlist-modal">
        <label>{{ $t('Common.Image') }}</label>
        <input
            id="artwork-file-input"
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style="display: none"
            @change="handleUpload"
        />
        <div id="artwork-upload" class="boxed rounded-sm">
            <div
                class="clickable"
                tabindex="0"
                @click="selectFiles"
                @keydown.space.enter.stop="selectFiles"
            >
                <ImageIcon />
                {{ previewUrl ? $t('Common.Change') : $t('Common.upload') }}
            </div>
            <div
                id="artwork-preview"
                class="image"
                :style="{
                    backgroundImage: previewUrl ? `url(${previewUrl})` : `url(${currentImage})`,
                }"
                tabindex="0"
            >
                <div
                    v-if="playlist.has_image && !previewUrl"
                    class="delete-icon"
                    :title="$t('Common.Delete')"
                    @click.stop="removeArtwork"
                >
                    <DeleteIcon />
                </div>
            </div>
        </div>
        <div v-if="previewUrl" class="artwork-actions">
            <button class="secondary" @click="clearPreview">
                {{ $t('Common.Cancel') }}
            </button>
            <button :disabled="uploading" @click="confirmUpload">
                {{ uploading ? $t('Common.Saving') : $t('Common.Save') }}
            </button>
        </div>
        <div v-else-if="playlist.has_image" class="artwork-actions">
            <button class="danger" @click="removeArtwork">
                {{ $t('Common.Delete') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { deletePlaylistArtwork } from '@/requests/playlists'
import usePStore from '@/stores/pages/playlist'

import DeleteIcon from '@/assets/icons/delete.svg'
import ImageIcon from '@/assets/icons/image.svg'

import { useT } from '@/i18n.js'

const { t } = useT()
const pStore = usePStore()
const { info: playlist } = storeToRefs(pStore)

const emit = defineEmits<{
    (e: 'setTitle', title: string): void
    (e: 'hideModal'): void
}>()

emit('setTitle', t('Modal.PlaylistArtwork'))

const fileInputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)

const currentImage = playlist.value.image as string

function selectFiles() {
    fileInputRef.value?.click()
}

function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files[0]) {
        handleFile(input.files[0])
    }
}

function handleFile(file: File) {
    if (!file || !file.type.startsWith('image/')) {
        return
    }

    // free the previous object URL if any
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
    }

    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
}

function clearPreview() {
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = null
    selectedFile.value = null
    if (fileInputRef.value) {
        fileInputRef.value.value = ''
    }
}

async function confirmUpload() {
    if (!selectedFile.value) return

    uploading.value = true
    const ok = await pStore.uploadArtwork(selectedFile.value)
    uploading.value = false

    if (ok) {
        clearPreview()
        emit('hideModal')
    }
}

async function removeArtwork() {
    const res = await deletePlaylistArtwork(playlist.value.id)
    if (res) {
        const { duration } = playlist.value
        pStore.info = { ...res, duration } as typeof playlist.value
        pStore.createImageLink()
        pStore.extractColors()
        emit('hideModal')
    }
}
</script>

<style lang="scss">
#playlist-artwork-modal {
    #artwork-upload {
        width: 100%;
        display: grid;
        gap: $small;
        border: none;
        margin: $small 0 1rem 0;

        svg {
            height: 2rem;
        }

        #artwork-preview {
            width: 100%;
            aspect-ratio: 1;
            max-height: 16rem;
            border-radius: $small;
            background-size: cover;
            background-position: center;
            background-color: $gray4;
            position: relative;
        }

        .clickable {
            font-weight: 500;
            width: 100%;
            display: flex;
            gap: $smaller;
            place-items: center;
            place-content: center;
            border-radius: $small;
            border: dashed 1px $gray4;
            cursor: pointer;
            padding: $medium;

            svg {
                transform: scale(0.75);
                flex-shrink: 0;
            }
        }

        .delete-icon {
            position: absolute;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.521);
            border-radius: $small;
            transition: all 0.2s ease-out;
            display: flex;
            place-content: center;
            place-items: center;
            cursor: pointer;

            svg {
                transform: scale(1);
                color: rgb(255, 255, 255);
                transition: transform 0.2s ease-out;
            }

            &:hover {
                background-color: $red;

                svg {
                    transform: scale(1.25);
                    transform-origin: center;
                }
            }
        }
    }

    .artwork-actions {
        display: flex;
        gap: $small;
        justify-content: flex-end;
        margin-top: $small;

        button {
            padding: 0.6rem 1.2rem;
            border-radius: $small;
            border: none;
            cursor: pointer;
            font-weight: 500;

            &.secondary {
                background-color: $gray4;
            }

            &.danger {
                background-color: $red;
                color: white;
            }

            &:disabled {
                opacity: 0.6;
                cursor: default;
            }
        }
    }
}
</style>
