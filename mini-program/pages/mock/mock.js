const app = getApp()

Page({
  data: {
    banks: [],
    activeAttempt: null,
    selectedBankId: '',
    selectedBankName: '',
    questionCount: 10,
    durationMinutes: 30,
    loading: false,
    starting: false,
    error: '',
  },

  onShow() {
    if (!app.requireAccess()) {
      return
    }
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.fetchBanks(), this.fetchActiveAttempt()])
      .catch(() => {
        this.setData({ error: '加载失败' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  fetchBanks() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/mock/banks`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
            const banks = res.data.data
            this.setData({
              banks,
              selectedBankId: banks[0]?.id || '',
              selectedBankName: banks[0]?.name || '',
            })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  fetchActiveAttempt() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/mock/attempts/active`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data?.id) {
            this.setData({ activeAttempt: res.data.data })
          } else {
            this.setData({ activeAttempt: null })
          }
          resolve()
        },
        fail: reject,
      })
    })
  },

  onBankChange(e) {
    const idx = Number(e.detail.value)
    const bank = this.data.banks[idx]
    if (bank) {
      this.setData({ selectedBankId: bank.id, selectedBankName: bank.name })
    }
  },

  onCountChange(e) {
    const counts = [10, 20, 50]
    this.setData({ questionCount: counts[Number(e.detail.value)] || 10 })
  },

  onDurationChange(e) {
    const durations = [30, 60, 90]
    this.setData({ durationMinutes: durations[Number(e.detail.value)] || 30 })
  },

  onContinue() {
    const { activeAttempt } = this.data
    if (activeAttempt?.id) {
      wx.navigateTo({
        url: `/pages/mock-exam/mock-exam?id=${activeAttempt.id}`,
      })
    }
  },

  onStart() {
    const { selectedBankId, questionCount, durationMinutes } = this.data
    if (!selectedBankId) {
      this.setData({ error: '请选择题库' })
      return
    }
    this.setData({ starting: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/mock/attempts`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
        'Idempotency-Key': app.newIdempotencyKey(),
      },
      data: {
        questionBankId: selectedBankId,
        questionCount,
        durationMinutes,
      },
      success: (res) => {
        if ((res.statusCode === 201 || res.statusCode === 200) && res.data?.data?.attemptId) {
          wx.navigateTo({
            url: `/pages/mock-exam/mock-exam?id=${res.data.data.attemptId}`,
          })
        } else if (res.statusCode === 409) {
          this.setData({ error: '已有进行中的模拟，请先继续或放弃' })
          this.fetchActiveAttempt()
        } else {
          this.setData({ error: res.data?.error?.message || '开始模拟失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误' })
      },
      complete: () => {
        this.setData({ starting: false })
      },
    })
  },
})
