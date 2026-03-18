<script setup lang="ts">
import { ref } from 'vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import { useChatStore } from '@/stores/chat'
import { useChatStream } from '@/composables/useChatStream'
import SessionSidebar from '@/components/SessionSidebar.vue'

const chat = useChatStore()
const { send, stop, retry, resume, isLoading } = useChatStream()

function handleSend(text: string) {
  send(text)
}

function handleRetry() {
  retry()
}

function handleResume() {
  resume()
}

const settingsOpen = ref(false)
function openSettings() {
  settingsOpen.value = true
}

function closeSettings() {
  settingsOpen.value = false
}

async function handleSwitchSession(index: number) {
  stop()
  await chat.switchSession(index)
}

async function handleCreateSession(title: string) {
  stop()
  await chat.createSession(title)
}

async function handleDeleteSession(id: string) {
  if (id === chat.currentId) stop()
  await chat.deleteSession(id)
}
</script>

<template>
  <div class="app">
    <div class="shell">
      <div class="layout">
        <div class="sidebar">
          <SessionSidebar
            :sessions="chat.sessions"
            :current-session-id="chat.currentId"
            @select="handleSwitchSession"
            @create="handleCreateSession"
            @delete="handleDeleteSession"
          />
        </div>

        <div class="main">
          <ChatWindow
            :sessionId="chat.currentId"
            :messages="chat.currentMessages"
            :sessionName="chat.currentSession.title"
            :isLoading="isLoading"
            @send="handleSend"
            @retry="handleRetry"
            @resume="handleResume"
            @stop="stop"
            @open-settings="openSettings"
          />
        </div>
      </div>

      <div v-if="settingsOpen" class="settingsOverlay">
        <div class="settingsOverlay__backdrop" @click="closeSettings" />
        <div class="settingsOverlay__panel">
          <SettingsPanel @back="closeSettings" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
}

.shell {
  position: relative;
  height: 100vh;
  width: min(980px, 100vw);
  background: rgba(255, 255, 255, 0.96);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.layout {
  height: 100%;
  display: flex;
}

.sidebar {
  width: 280px;
  flex: 0 0 auto;
}

.main {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.settingsOverlay {
  position: absolute;
  inset: 0;
  z-index: 10000;
}

.settingsOverlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
}

.settingsOverlay__panel {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.98);
}
</style>
