<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { ChatMessage } from '@/types/chat'
import MessageItem from './MessageItem.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'

const props = defineProps<{ messages: ChatMessage[] }>()
const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'resume'): void
}>()

type DynamicScrollerExpose = {
  $el?: HTMLElement
  scrollToItem?: (index: number) => void
}
const scrollerRef = ref<DynamicScrollerExpose | null>(null)

function getScrollerElement() {
  return scrollerRef.value?.$el ?? null
}

function waitForPaint() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

function isNearBottom(thresholdPx = 160) {
  const el = getScrollerElement()
  if (!el) return true
  const distance = el.scrollHeight - (el.scrollTop + el.clientHeight)
  return distance <= thresholdPx
}

async function scrollToBottom() {
  if (props.messages.length === 0) return
  await nextTick()
  await waitForPaint()

  scrollerRef.value?.scrollToItem?.(props.messages.length - 1)

  await nextTick()
  await waitForPaint()

  const el = getScrollerElement()
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

defineExpose({
  isNearBottom,
  scrollToBottom,
})
</script>

<template>
  <div class="list">
    <DynamicScroller
      ref="scrollerRef"
      class="scroller"
      :items="messages"
      :min-item-size="44"
      key-field="id"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :size-dependencies="[item.content, item.status, item.error]"
          :data-index="index"
        >
          <MessageItem
            :message="item"
            :is-latest="index === messages.length - 1"
            @retry="() => emit('retry')"
            @resume="() => emit('resume')"
          />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
  </div>
</template>

<style scoped>
.list {
  height: 100%;
}

.scroller {
  height: 100%;
}
</style>
