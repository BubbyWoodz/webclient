import { ref } from "vue";
import { defineStore } from "pinia";

import useQueue from "./queue";
import { audioSource } from "./player";
import { FromOptions } from "@/enums";
import useTracklist, { From } from "@/stores/queue/tracklist";

let enableCall = true;
let throttleTimeout: number = 1000;

function throttle(
  callback: CallableFunction,
  interval: number = throttleTimeout
) {
  return function (...args: any[]) {
    if (!enableCall) return;
    enableCall = false;

    // @ts-ignore
    callback.apply(this, args);
    setTimeout(() => (enableCall = true), interval);
  };
}

function getSource(source: From) {
  switch (source.type) {
    case FromOptions.album:
      return `al:${source.albumhash}`;
    case FromOptions.artist:
      return `ar:${source.artisthash}`;
    case FromOptions.folder:
      return `fo:${source.path}`;
    case FromOptions.playlist:
      return `pl:${source.id}`;
    case FromOptions.search:
      return `q:${source.query}`;
    case FromOptions.favorite:
      return `favorite`;
    case FromOptions.mix:
      return `mix:${source.mixid}.${source.sourcehash}`;
    default:
      return "";
  }
}

export function sendLogData(
  trackhash: string,
  duration: number,
  from: From,
  timestamp: number,
  retryCount: number = 0
) {
  if (window.Worker) {
    const worker = new Worker("/workers/logtrack.js");

    const seconds = Math.round(duration / 1000);
    const source = getSource(from);

    worker.postMessage({ trackhash, duration: seconds, source, timestamp });

    // Retry with backoff on failure (bubbywoodz fork: Feature 3 client contract)
    // The worker is fire-and-forget; we retry by re-sending if the page is
    // still open. True offline queue requires service worker (future).
    worker.onerror = () => {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          sendLogData(trackhash, duration, from, timestamp, retryCount + 1);
        }, delay);
      }
    };
  }
}

export function sendNowPlaying(
  trackhash: string,
  timestamp: number,
  position: number
) {
  // Fire-and-forget heartbeat; safe to drop on failure
  fetch("/logger/now-playing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackhash, timestamp, position }),
    credentials: "include",
  }).catch(() => {});
}

export function clearNowPlaying() {
  fetch("/logger/now-playing", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => {});
}

export default defineStore(
  "playTracker",
  () => {
    const duration = ref(0);
    const trackhash = ref("");
    const timestamp = ref(0);

    const key = ref(0);
    const prevKey = ref(0);

    // @ts-ignore
    const from = ref({
      type: null,
      path: "",
      name: "",
    } as From);

    let prev_date = 0;
    let can_submit = true;

    const queue = useQueue();

    // bubbywoodz fork (Feature 3): track playback start for timestamp semantics
    const playbackStart = ref(0);
    const thresholdSubmitted = ref(false);
    const nowPlayingInterval = ref<number | null>(null);

    function resetData() {
      from.value = useTracklist().from;
      duration.value = 0;
      trackhash.value = queue.currenttrack.trackhash;
      prev_date = Date.now();
      // Playback start = now (timestamp semantics: start of playback)
      playbackStart.value = Math.floor(Date.now() / 1000);
      timestamp.value = playbackStart.value;
      thresholdSubmitted.value = false;
    }

    function getThreshold(trackDurationSecs: number): number {
      // Last.fm rule: min(duration/2, 240), track must be > 30s
      if (trackDurationSecs <= 30) return Infinity;
      return Math.min(trackDurationSecs / 2, 240);
    }

    function checkThreshold() {
      // Submit at threshold, not at end (fixes force-quit/tab-close loss)
      if (thresholdSubmitted.value || !trackhash.value) return;

      const track = queue.currenttrack;
      const trackLen = track?.duration || 0;
      const threshold = getThreshold(trackLen);
      const listenedSecs = duration.value / 1000;

      if (listenedSecs >= threshold) {
        thresholdSubmitted.value = true;
        sendLogData(
          trackhash.value,
          duration.value,
          from.value,
          playbackStart.value
        );
      }
    }

    function startNowPlayingHeartbeat() {
      stopNowPlayingHeartbeat();
      // Heartbeat every 30s while playing
      nowPlayingInterval.value = window.setInterval(() => {
        if (trackhash.value && !audioSource.playingSource.paused) {
          sendNowPlaying(
            trackhash.value,
            playbackStart.value,
            Math.floor(duration.value / 1000)
          );
        }
      }, 30000);
    }

    function stopNowPlayingHeartbeat() {
      if (nowPlayingInterval.value) {
        clearInterval(nowPlayingInterval.value);
        nowPlayingInterval.value = null;
      }
      clearNowPlaying();
    }

    function updateDuration() {
      const now = Date.now();
      const diff = now - prev_date;

      if (diff > throttleTimeout * 1.75) {
        return (prev_date = now);
      }

      duration.value += diff;
      prev_date = now;
      timestamp.value = Math.floor(now / 1000);
    }

    function lockSubmit() {
      can_submit = false;

      setTimeout(() => {
        can_submit = true;
      }, 1000);
    }

    function submitData() {
      if (!can_submit) return;
      lockSubmit();
      // Use playback start timestamp (not "now at last timeupdate")
      // If already submitted at threshold, this is a no-op for counted plays
      // but still sends sub-threshold data for skip analytics
      if (!thresholdSubmitted.value) {
        sendLogData(
          trackhash.value,
          duration.value,
          from.value,
          playbackStart.value
        );
      }
      resetData();
      prevKey.value = key.value;
    }

    function reassignEventListener() {
      if (trackhash.value == "") {
        trackhash.value = queue.currenttrackhash;
        playbackStart.value = Math.floor(Date.now() / 1000);
      }

      startNowPlayingHeartbeat();

      audioSource.playingSource.addEventListener(
        "timeupdate",
        throttle(() => {
          if (audioSource.playingSource.paused) {
            prev_date = 0;
          }

          if (
            key.value !== prevKey.value &&
            trackhash.value !== "" &&
            duration.value > 1000 &&
            can_submit
          ) {
            submitData();
          }

          updateDuration();
          // Check if we've hit the play threshold
          checkThreshold();
        })
      );
    }

    function changeKey() {
      prevKey.value = key.value;
      key.value = Math.random();
    }

    return {
      trackhash,
      timestamp,
      duration,
      from,
      key,
      prevKey,
      submitData,
      reassignEventListener,
      changeKey,
      resetData,
    };
  },
  {
    persist: true,
  }
);
