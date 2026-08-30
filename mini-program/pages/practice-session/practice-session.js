const app = getApp()

Page({
  data: {
    sessionId: '',
    session: null,
    currentIndex: 0,
    currentItem: null,
    selectedKeys: [],
    feedback: null,
    loading: false,
    submitting: false,
    error: '',
    finished: false,
  },

  onLoad(options) {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const sessionId = options.id
    if (!sessionId) {
      this.setData({ error: '缺少练习会话 ID' })
      return
    }
    this.setData({ sessionId })
    this.loadSession()
  },

  loadSession() {
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions/${this.data.sessionId}`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const session = res.data.data
          const index = session.currentIndex || 0
          this.setData({
            session,
            currentIndex: index,
            currentItem: session.items?.[index] || null,
            finished: session.status === 'finished',
          })
        } else {
          this.setData({ error: res.data?.error?.message || '加载失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },

  isMultiple(type) {
    return type === 'multipleChoice'
  },

  onSelectOption(e) {
    const key = e.currentTarget.dataset.key
    const type = this.data.currentItem?.type
    if (this.isMultiple(type)) {
      const set = new Set(this.data.selectedKeys)
      if (set.has(key)) {
        set.delete(key)
      } else {
        set.add(key)
      }
      this.setData({ selectedKeys: [...set] })
    } else {
      this.setData({ selectedKeys: [key] })
    }
  },

  onSubmitAnswer() {
    const { currentItem, selectedKeys, sessionId, submitting, feedback } = this.data
    if (submitting || feedback || !currentItem) return
    if (selectedKeys.length === 0) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions/${sessionId}/answers`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: {
        questionVersionId: currentItem.questionVersionId,
        answer: selectedKeys.sort(),
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const fb = res.data.data
          if (Array.isArray(fb.standardAnswer)) {
            fb.standardAnswerText = fb.standardAnswer.join(', ')
          }
          this.setData({ feedback: fb })
        } else {
          wx.showToast({ title: res.data?.error?.message || '提交失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
      complete: () => {
        this.setData({ submitting: false })
      },
    })
  },

  onNext() {
    const { session, currentIndex } = this.data
    const items = session?.items || []
    const nextIndex = currentIndex + 1
    if (nextIndex >= items.length) {
      this.onFinish()
      return
    }
    this.setData({
      currentIndex: nextIndex,
      currentItem: items[nextIndex],
      selectedKeys: [],
      feedback: null,
    })
  },

  onFinish() {
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions/${this.data.sessionId}/finish`,
      method: 'POST',
      header: app.authHeader(),
      success: () => {
        this.setData({ finished: true })
        wx.showToast({ title: '练习已完成', icon: 'success' })
      },
    })
  },

  onBackHome() {
    wx.navigateBack({ delta: 2 })
  },
})
