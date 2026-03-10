<script setup lang="ts">
import type { ChatMessage } from '@/types/chat'
import MarkdownView from './MarkdownView.vue'

defineEmits<{
  (e: 'retry', id: string): void
}>()

const props = defineProps<{
  message: ChatMessage
  isLatest?: boolean
}>()
</script>

<template>
  <div class="item" :class="props.message.role">
    <div class="bubble">
      <template v-if="props.message.role === 'assistant'">
        <MarkdownView :content="props.message.content" />

        <div v-if="props.isLatest && props.message.status === 'error'" class="errorBar">
          <span class="errorText">生成失败：{{ props.message.error ?? 'unknown error' }}</span>
          <button class="retryBtn" type="button" @click="$emit('retry', props.message.id)">
            重试
          </button>
        </div>

        <div v-else-if="props.isLatest && props.message.status === 'interrupted'" class="continueBar">
          <span class="continueText">已中断，可继续生成</span>
          <button class="retryBtn" type="button" @click="$emit('retry', props.message.id)">继续</button>
        </div>
      </template>

      <template v-else>
        <pre class="text">{{ props.message.content }}</pre>
      </template>
    </div>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  width: 100%;
}

.item.user {
  justify-content: flex-end;
}

.item.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 14px;

  min-width: 0;

  overflow-wrap: anywhere;
  word-break: break-word;
}

.item.user .bubble {
  background: rgba(20, 20, 20, 0.9);
  color: white;
}

.item.assistant .bubble {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.84);
}

.text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.errorBar {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 0, 0, 0.06);
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.errorText {
  font-size: 12px;
  color: rgba(180, 0, 0, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.retryBtn {
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: rgba(20, 20, 20, 0.9);
  color: white;
  font-size: 12px;
  flex: 0 0 auto;
}

.continueBar {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.continueText {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
</style>
