import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('App', () => {
  it('mounts renders properly', () => {
    setActivePinia(createPinia())
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('输入消息')
  })
})
