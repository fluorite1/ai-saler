<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

// 禁止 HTML，避免 XSS
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  // markdown-it中的highlight参数，是专门控制代码文本的渲染
  highlight(code, lang): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
      } catch {
        // ignore
      }
    }
    // highlight返回的应该是解析好的html，md不会再做处理，没识别到语言就纯转义，避免XSS。hljs.highlight中也包含转移。
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
  },
})

const props = defineProps<{
  content: string
}>()

const rendered = computed(() => md.render(props.content ?? ''))
</script>

<template>
  <!-- v-html渲染 markdown-it 产出的 HTML -->
  <div class="md" v-html="rendered" />
</template>

<style scoped>
.md {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.84);

  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}
/* 这里的的deep不是伪类选择器，是深度选择器。scope下，当前组件元素和样式选择会添加作用域属性，v-html直接插入的元素不会加作用域属性。要选中需要加deep解除样式添加作用域属性 */
.md :deep(p) {
  overflow-wrap: anywhere;
  word-break: break-word;
  margin: 0 0 10px;
  white-space: normal;
  overflow-wrap: anywhere;
}
.md :deep(ul),
.md :deep(ol) {
  margin: 0 0 10px;
  padding-left: 18px;
}
.md :deep(li) {
  margin: 4px 0;
}

.md :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.md :deep(pre.hljs) {
  padding: 10px 12px;
  border-radius: 12px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.06);
  overflow: auto;
  white-space: pre; /* 保持代码格式 */
}

.md :deep(code) {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
