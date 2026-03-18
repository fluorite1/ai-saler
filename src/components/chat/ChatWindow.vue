<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, defineAsyncComponent } from 'vue'
import ChatBox from './ChatBox.vue'
import type { ChatMessage } from '@/types/chat'
import { throttle } from '@/utils/throttle'

// import MessageList from './MessageList.vue'
const AsyncMessageList = defineAsyncComponent({
  loader: () => import('./MessageList.vue'),
})

type Props = {
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
  (e: 'toggleSidebar'): void
  (e: 'openSettings'): void
}>()

// 自动滚动
type MessageListExpose = {
  isNearBottom: (thresholdPx?: number) => boolean
  scrollToBottom: () => Promise<void>
}
const messageListRef = ref<MessageListExpose | null>(null)

async function scrollToBottom() {
  await nextTick()
  await messageListRef.value?.scrollToBottom()
}

const tryFollowScroll = throttle(async () => {
  const isNear = messageListRef.value?.isNearBottom(200) ?? true
  if (isNear) {
    await scrollToBottom()
  }
}, 200)
const streamKey = computed(() => {
  const last = props.messages[props.messages.length - 1]
  if (!last) return ''
  // 访问 content.length 会追踪 content 属性的变化
  // 即使 messages 数组引用不变，只要 last.content 变化，computed 会重新计算
  return `${last.id}:${last.content.length}`
})
watch(
  streamKey,
  () => {
    // 只有最后一条消息是流式状态时才跟随滚动
    // const last = props.messages[props.messages.length - 1]
    // if (last?.status === 'streaming') {
    // }
    tryFollowScroll()
  },
  { flush: 'post' },
)
onMounted(() => tryFollowScroll())
</script>

<template>
  <div class="chat">
    <header class="chat__header">
      <div class="chat__headerLeft">
        <button class="iconBtn" type="button" @click="emit('toggleSidebar')">≡</button>
      </div>

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
  grid-template-columns: 44px 1fr 88px; /* 左按钮 / 标题 / 右按钮 */
  align-items: center;

  /* header 和 main 的分隔线 */
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.chat__headerLeft,
.chat__headerCenter,
.chat__headerRight {
  display: flex;
  align-items: center;
}

.chat__headerLeft {
  justify-content: flex-start;
}

.chat__headerCenter {
  justify-content: center;
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
  overflow: auto;
}

.chat__footer {
  height: 56px;
  padding: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex: 0 0 auto;
}
</style>
