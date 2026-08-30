const app = getApp()

Page({
  data: {
    attemptId: '',
    paper: null,
    currentIndex: 0,
    currentItem: null,
    selectedKeys: [],
    displayOptions: [],
    isEssay: false,
    essayText: '',
    answerVersions: {},
    remainingSeconds: 0,
    loading: false,
    submitting: false,
    submitted: false,
    result: null,
    error: '',
  },

  timer: null,
  saveTimer: null,

  onLoad(options) {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const attemptId = options.id
    if (!attemptId) {
      this.setData({ error: '缺少模拟 ID' })
      return
    }
    this.setData({ attemptId })
    this.loadPaper()
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
  },

  loadPaper() {
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/mock/attempts/${this.data.attemptId}/paper`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data?.items) {
          const paper = res.data.data
          const currentItem = paper.items[0] || null
          this.setData({
            paper,
            currentItem,
            isEssay: currentItem?.type === 'essay',
            essayText: '',
            displayOptions: this.buildOptions(currentItem, []),
          })
          this.loadTiming()
        } else {
          this.setData({ error: res.data?.error?.message || '加载试卷失败' })
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

  loadTiming() {
    wx.request({
      url: `${app.globalData.apiBase}/mock/attempts/${this.data.attemptId}`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data?.timing) {
          this.setData({ remainingSeconds: res.data.data.timing.remainingSeconds || 0 })
          this.startTimer()
        }
      },
    })
  },

  startTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => {
      const sec = this.data.remainingSeconds - 1
      if (sec <= 0) {
        clearInterval(this.timer)
        this.onSubmitExam()
        return
      }
      this.setData({ remainingSeconds: sec })
    }, 1000)
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  },

  isMultiple(type) {
    return type === 'multipleChoice'
  },

  isEssay(type) {
    return type === 'essay'
  },

  optionKey(opt) {
    return opt.key || opt.label || opt.id
  },

  buildOptions(item, selectedKeys) {
    const selected = new Set(selectedKeys || [])
    return (item?.options || []).map((opt) => {
      const key = this.optionKey(opt)
      const isSelected = selected.has(key)
      return { ...opt, key, selected: isSelected, state: isSelected ? 'selected' : '' }
    })
  },

  applySelection(selectedKeys) {
    this.setData({
      selectedKeys,
      displayOptions: this.buildOptions(this.data.currentItem, selectedKeys),
    })
  },

  onEssayInput(e) {
    const text = e.detail.value || ''
    this.setData({
      essayText: text,
      selectedKeys: text.trim() ? [text] : [],
    })
    this.scheduleSave()
  },

  onSelectOption(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    const type = this.data.currentItem?.type
    let next = [key]
    if (this.isMultiple(type)) {
      const set = new Set(this.data.selectedKeys)
      if (set.has(key)) set.delete(key)
      else set.add(key)
      next = [...set]
    }
    this.applySelection(next)
    this.scheduleSave()
  },

  scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveCurrentAnswer()
    }, 600)
  },

  saveCurrentAnswer(callback) {
    const { currentItem, selectedKeys, attemptId, answerVersions } = this.data
    if (!currentItem || selectedKeys.length === 0) {
      if (callback) callback()
      return
    }
    const version = (answerVersions[currentItem.itemId] || 0) + 1
    wx.request({
      url: `${app.globalData.apiBase}/mock/attempts/${attemptId}/answers/${currentItem.itemId}`,
      method: 'PUT',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: {
        answer: this.isEssay(currentItem.type) ? selectedKeys : [...selectedKeys].sort(),
        answerVersion: version,
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const answerVersions = { ...this.data.answerVersions }
          answerVersions[currentItem.itemId] = version
          this.setData({ answerVersions })
        }
        if (callback) callback()
      },
      fail: () => {
        if (callback) callback()
      },
    })
  },

  onPrev() {
    if (this.data.currentIndex <= 0) return
    this.saveCurrentAnswer(() => {
      const idx = this.data.currentIndex - 1
      const item = this.data.paper.items[idx]
      this.setData({
        currentIndex: idx,
        currentItem: item,
        selectedKeys: [],
        isEssay: item?.type === 'essay',
        essayText: '',
        displayOptions: this.buildOptions(item, []),
      })
    })
  },

  onNext() {
    const items = this.data.paper?.items || []
    if (this.data.currentIndex >= items.length - 1) return
    this.saveCurrentAnswer(() => {
      const idx = this.data.currentIndex + 1
      const item = items[idx]
      this.setData({
        currentIndex: idx,
        currentItem: item,
        selectedKeys: [],
        isEssay: item?.type === 'essay',
        essayText: '',
        displayOptions: this.buildOptions(item, []),
      })
    })
  },

  onSubmitExam() {
    if (this.data.submitting || this.data.submitted) return
    wx.showModal({
      title: '交卷确认',
      content: '确定提交模拟考试吗？',
      success: (res) => {
        if (res.confirm) {
          this.doSubmit()
        }
      },
    })
  },

  doSubmit() {
    this.setData({ submitting: true })
    this.saveCurrentAnswer(() => {
      wx.request({
        url: `${app.globalData.apiBase}/mock/attempts/${this.data.attemptId}/submit`,
        method: 'POST',
        header: {
          ...app.authHeader(),
          'Idempotency-Key': app.newIdempotencyKey(),
        },
        success: () => {
          this.setData({ submitted: true })
          if (this.timer) clearInterval(this.timer)
          this.loadResult()
        },
        fail: () => {
          wx.showToast({ title: '交卷失败', icon: 'none' })
        },
        complete: () => {
          this.setData({ submitting: false })
        },
      })
    })
  },

  loadResult() {
    wx.request({
      url: `${app.globalData.apiBase}/mock/attempts/${this.data.attemptId}/result`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          this.setData({ result: res.data.data })
        }
      },
    })
  },

  onBackHome() {
    wx.navigateBack({ delta: 2 })
  },
})
