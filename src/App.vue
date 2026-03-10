<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import { useChatStore } from '@/stores/chat'
import { useChatStream } from '@/composables/useChatStream'
import SessionSidebar from '@/components/SessionSidebar.vue'

const chat = useChatStore()

// 消息发送
const { send, stop, retry, isLoading } = useChatStream()
function handleSend(text: string) {
  send(text)
}
function handleRetry(id: string) {
  retry(id)
}

// sidebar（移动端抽屉；桌面端固定）
const sidebarOpen = ref(true)
onMounted(() => {
  // 小屏默认关闭
  sidebarOpen.value = window.matchMedia?.('(min-width: 900px)')?.matches ?? true
})
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
function closeSidebar() {
  sidebarOpen.value = false
}

// settings overlay
const settingsOpen = ref(false)
function openSettings() {
  stop()
  settingsOpen.value = true
}
function closeSettings() {
  settingsOpen.value = false
}

// 会话操作
function handleSwitchSession(index: number) {
  stop()
  chat.switchSession(index)
  closeSidebar()
}
function handleCreateSession(title: string) {
  stop()
  chat.createSession(title)
  closeSidebar()
}
function handleDeleteSession(id: string) {
  if (id === chat.currentId) stop()
  chat.deleteSession(id)
}
</script>

<template>
  <div class="app">
    <div class="shell">
      <div class="layout">
        <!-- desktop fixed sidebar -->
        <div class="sidebar sidebar--desktop">
          <SessionSidebar
            :sessions="chat.sessions"
            :current-session-id="chat.currentId"
            @select="handleSwitchSession"
            @create="handleCreateSession"
            @delete="handleDeleteSession"
            @close="closeSidebar"
          />
        </div>
        <div class="sidebarDrawer" :class="{ open: sidebarOpen }">
          <div class="sidebarDrawer__backdrop" @click="closeSidebar" />
          <div class="sidebarDrawer__panel">
            <SessionSidebar
              :sessions="chat.sessions"
              :current-session-id="chat.currentId"
            @select="handleSwitchSession"
              @create="handleCreateSession"
              @delete="handleDeleteSession"
              @close="closeSidebar"
            />
          </div>
        </div>

        <div class="main">
          <ChatWindow
            :messages="chat.currentMessages"
            :sessionName="chat.currentSession.title"
            :isLoading="isLoading"
            @send="handleSend"
            @retry="handleRetry"
            @stop="stop"
            @toggle-sidebar="toggleSidebar"
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
  height: 100vh;
  width: min(980px, 100vw);
  background: rgba(255, 255, 255, 0.96);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
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

/* Mobile drawer */
.sidebarDrawer {
  display: none;
}

.settingsOverlay {
  position: fixed;
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

@media (max-width: 899px) {
  .sidebar--desktop {
    display: none;
  }

  .sidebarDrawer {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
  }
  .sidebarDrawer__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    opacity: 0;
    transition: opacity 180ms ease;
  }
  .sidebarDrawer__panel {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: min(86vw, 320px);
    transform: translateX(-100%);
    transition: transform 200ms ease;
    background: rgba(250, 250, 250, 0.98);
  }

  .sidebarDrawer.open {
    pointer-events: auto;
  }
  .sidebarDrawer.open .sidebarDrawer__backdrop {
    opacity: 1;
  }
  .sidebarDrawer.open .sidebarDrawer__panel {
    transform: translateX(0);
  }
}
</style>

