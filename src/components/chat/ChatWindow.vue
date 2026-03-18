<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, defineAsyncComponent } from 'vue'
import ChatBox from './ChatBox.vue'
import type { ChatMessage } from '@/types/chat'

// import MessageList from './MessageList.vue'
const AsyncMessageList = defineAsyncComponent({
  loader: () => import('./MessageList.vue'),
})

type Props = {
  sessionId: string
  messages: ChatMessage[]
  sessionName: string
  isLoading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'retry'): void
  (e: 'resume'): void
  (e: 'stop'): void
  (e: 'openSettings'): void
}>()

// 自动滚动
type MessageListExpose = {
  isNearBottom: (thresholdPx?: number) => boolean
  scrollToBottom: () => Promise<void>
}
const messageListRef = ref<MessageListExpose | null>(null)
let pendingScroll = Promise.resolve()

function queueScroll(task: () => Promise<void>) {
  pendingScroll = pendingScroll
    .then(task)
    .catch((err) => {
      console.error('[ChatWindow scroll]', err)
    })
}

async function scrollToBottom() {
  await nextTick()
  await messageListRef.value?.scrollToBottom()
}

function scheduleScroll(force = false) {
  queueScroll(async () => {
    await nextTick()
    if (force || (messageListRef.value?.isNearBottom(200) ?? true)) {
      await scrollToBottom()
    }
  })
}

const lastMessageKey = computed(() => {
  const last = props.messages[props.messages.length - 1]
  return `${last?.id ?? ''}:${last?.content.length ?? 0}:${last?.status ?? ''}`
})

watch(
  [() => props.sessionId, () => props.messages.length],
  ([sessionId, messageCount], [prevSessionId, prevMessageCount]) => {
    if (sessionId !== prevSessionId || messageCount > prevMessageCount) {
      scheduleScroll(true)
    }
  },
  { flush: 'post' },
)

watch(
  lastMessageKey,
  (next, prev) => {
    if (!prev) return
    const nextId = next.split(':', 1)[0]
    const prevId = prev.split(':', 1)[0]
    if (nextId && nextId === prevId) {
      scheduleScroll()
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  scheduleScroll(true)
})
</script>

<template>
  <div class="chat">
    <header class="chat__header">
      <div class="chat__headerCenter">
        <div class="chat__title">
          {{ sessionName }}
        </div>
      </div>

      <div class="chat__headerRight">
        <button class="iconBtn" type="button" @click="emit('openSettings')">⚙</button>
      </div>
    </header>

    <main class="chat__body">
      <!-- <MessageList ref="messageListRef" :messages="messages" @retry="() => emit('retry')" @resume="() => emit('resume')" /> -->
      <Suspense>
        <template #default>
          <AsyncMessageList
            ref="messageListRef"
            :messages="messages"
            @retry="() => emit('retry')"
            @resume="() => emit('resume')"
          />
        </template>

        <template #fallback>
          <div class="fallback">加载消息列表中…</div>
        </template>
      </Suspense>
    </main>

    <footer class="chat__footer">
      <ChatBox
        :isLoading="props.isLoading ?? false"
        @send="(t) => emit('send', t)"
        @stop="emit('stop')"
      />
    </footer>
  </div>
</template>

<style scoped>
.chat {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat__header {
  height: 44px;
  padding: 0 10px;
  display: grid;
  grid-template-columns: 1fr 88px;
  align-items: center;

  /* header 和 main 的分隔线 */
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.chat__headerCenter,
.chat__headerRight {
  display: flex;
  align-items: center;
}

.chat__headerCenter {
  justify-content: flex-start;
  min-width: 0;
}

.chat__headerRight {
  justify-content: flex-end;
  gap: 6px;
}

.chat__title {
  font-size: 14px;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat__body {
  flex: 1;
  min-height: 0; /* 让 overflow 生效，避免把 footer 顶出去 */
  padding: 12px;
  overflow: hidden;
}

.chat__footer {
  height: 56px;
  padding: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex: 0 0 auto;
}
</style>
