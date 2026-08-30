const app = getApp()

Page({
  data: {
    banks: [],
    activeSession: null,
    selectedBankId: '',
    selectedBankName: '',
    questionCount: 10,
    loading: false,
    starting: false,
    error: '',
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.fetchBanks(), this.fetchActiveSession()])
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
        url: `${app.globalData.apiBase}/practice/banks`,
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

  fetchActiveSession() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/practice/sessions/active`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data?.id) {
            this.setData({ activeSession: res.data.data })
          } else {
            this.setData({ activeSession: null })
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

  onContinue() {
    const { activeSession } = this.data
    if (activeSession?.id) {
      wx.navigateTo({
        url: `/pages/practice-session/practice-session?id=${activeSession.id}`,
      })
    }
  },

  onStart() {
    const { selectedBankId, questionCount } = this.data
    if (!selectedBankId) {
      this.setData({ error: '请选择题库' })
      return
    }
    this.setData({ starting: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: {
        questionBankId: selectedBankId,
        mode: 'random',
        questionCount,
      },
      success: (res) => {
        if ((res.statusCode === 201 || res.statusCode === 200) && res.data?.data?.id) {
          wx.navigateTo({
            url: `/pages/practice-session/practice-session?id=${res.data.data.id}`,
          })
        } else if (res.statusCode === 409) {
          this.setData({ error: '已有进行中的练习，请先继续或结束' })
          this.fetchActiveSession()
        } else {
          this.setData({ error: res.data?.error?.message || '开始练习失败' })
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
