<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    isLoading?: boolean
  }>(),
  { isLoading: false },
)

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'stop'): void
}>()

const text = ref('')

function send() {
  const t = text.value.trim()
  if (!t) return
  emit('send', t)
  text.value = ''
}

function handlePrimaryAction() {
  if (props.isLoading) {
    emit('stop')
    return
  }
  send()
}
</script>

<template>
  <div class="box">
    <input
      class="input"
      v-model="text"
      placeholder="输入消息"
      @keydown.enter.prevent="handlePrimaryAction"
    />
    <button class="btn" type="button" @click="handlePrimaryAction">
      {{ props.isLoading ? '中断' : '发送' }}
    </button>
  </div>
</template>

<style scoped>
.box {
  display: flex;
  gap: 8px;
}
.input {
  flex: 1;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0 10px;
  outline: none;
  height: 36px;
}
.btn {
  width: 64px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: rgba(20, 20, 20, 0.9);
  color: white;
  height: 36px;
}
</style>
