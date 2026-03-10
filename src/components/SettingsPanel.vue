<script setup lang="ts">
const emit = defineEmits<{
  (e: 'back'): void
}>()
</script>

<template>
  <div class="panel">
    <header class="panel__header">
      <button class="iconBtn" type="button" @click="emit('back')">←</button>
      <div class="panel__title">设置</div>
      <div style="width: 30px" />
    </header>

    <main class="panel__body">
      <p class="text">这里是设置界面占位。</p>
      <p class="text">后续可以放：模型选择、system prompt、温度、快捷指令、语音开关等。</p>
    </main>
  </div>
</template>

<style scoped>
.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel__header {
  height: 44px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.panel__title {
  font-size: 14px;
  font-weight: 600;
}

.panel__body {
  padding: 12px;
  overflow: auto;
}
.text {
  margin: 0 0 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.72);
  line-height: 1.5;
}
</style>
