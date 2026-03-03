<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChatSession } from '@/types/chat'

const props = defineProps<{
  sessions: ChatSession[]
  currentSessionId: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'create', title: string): void
  (e: 'delete', id: string): void
  (e: 'close'): void
}>()

const creating = ref(false)
const title = ref('')
const canCreate = computed(() => title.value.trim().length > 0)

function startCreate() {
  creating.value = true
  title.value = ''
}

function submitCreate() {
  const t = title.value.trim()
  if (!t) return
  emit('create', t)
  creating.value = false
  title.value = ''
}

function cancelCreate() {
  creating.value = false
  title.value = ''
}
</script>

<template>
  <aside class="sidebar">
    <header class="sidebar__header">
      <div class="sidebar__title">Chats</div>

      <div class="sidebar__actions">
        <button class="iconBtn" type="button" title="新建会话" @click="startCreate">＋</button>
        <button class="iconBtn sidebar__close" type="button" title="关闭" @click="emit('close')">✕</button>
      </div>
    </header>

    <div v-if="creating" class="create">
      <input
        class="create__input"
        v-model="title"
        placeholder="输入会话名称"
        @keydown.enter.prevent="submitCreate"
      />
      <button class="create__btn" type="button" :disabled="!canCreate" @click="submitCreate">
        创建
      </button>
      <button class="create__btn ghost" type="button" @click="cancelCreate">取消</button>
    </div>

    <main class="sidebar__body">
      <button
        v-for="s in props.sessions"
        :key="s.id"
        type="button"
        class="row"
        :class="{ active: s.id === props.currentSessionId }"
        @click="emit('select', s.id)"
      >
        <div class="row__text">
          <div class="row__title">{{ s.title }}</div>
          <div class="row__meta">{{ new Date(s.updatedAt).toLocaleString() }}</div>
        </div>

        <button
          class="row__del"
          type="button"
          title="删除"
          :disabled="props.sessions.length <= 1"
          @click.stop="emit('delete', s.id)"
        >
          🗑
        </button>
      </button>
    </main>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(250, 250, 250, 0.98);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar__header {
  height: 52px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.sidebar__actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.create {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.create__input {
  flex: 1;
  height: 32px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0 10px;
  outline: none;
  font-size: 13px;
}
.create__btn {
  height: 32px;
  padding: 0 10px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: rgba(20, 20, 20, 0.9);
  color: white;
  font-size: 13px;
}
.create__btn.ghost {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.75);
}
.create__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sidebar__body {
  padding: 10px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  text-align: left;
}
.row.active {
  background: rgba(20, 20, 20, 0.08);
  border-color: rgba(0, 0, 0, 0.08);
}
.row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.row__title {
  font-size: 13px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.55);
}

.row__del {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
}
.row__del:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Desktop: always show sidebar close button? hide it; App controls layout */
@media (min-width: 900px) {
  .sidebar__close {
    display: none;
  }
}
</style>

