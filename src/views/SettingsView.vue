<template>
  <div
    class="settingspage content-page"
    style="height: 100%; overflow: auto;"
  >
    <Content />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";

import useSettingsStore from "@/stores/settings";
import { getAllSettings, getTranscodePrefs } from "@/requests/settings";
import updatePageTitle from "@/utils/updatePageTitle";

import Content from "../components/SettingsView/Content.vue";
import { useT } from "@/i18n";

const { t } = useT();

const store = useSettingsStore();

onMounted(() => {
  updatePageTitle(t('Common.Settings'));
  getAllSettings().then(({ settings }) => {
    store.mapDbSettings(settings);
  });
  // Sync saved transcode preference from backend (without re-saving)
  getTranscodePrefs().then((prefs) => {
    if (prefs?.quality && prefs.quality !== store.streaming_quality) {
      store.$patch({ streaming_quality: prefs.quality });
    }
  }).catch(() => {});
});
</script>
