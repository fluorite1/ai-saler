import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './index.css'

import { useChatStore } from '@/stores/chat'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const chat = useChatStore()
chat.initFromStorage()

window.addEventListener('beforeunload', () => {
  chat.flushStorage()
})

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue errorHandler]', info, err)
}

app.config.warnHandler = (msg, instance, trace) => {
  console.warn('[Vue warnHandler]', msg, trace)
}

app.mount('#app')

