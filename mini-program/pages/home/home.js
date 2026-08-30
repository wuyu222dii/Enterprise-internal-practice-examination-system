const MODE_LABEL = {
  sequential: '顺序练习',
  random: '随机练习',
  wrongBook: '错题练习',
}

const app = getApp()

Page({
  data: {
    displayName: '员工',
    employeeNo: '',
    banks: [],
    bankId: '',
    bankName: '',
    activeSession: null,
    modeLabel: '练习',
    loading: false,
    starting: false,
    error: '',
  },

  onShow() {
    const session = app.globalData.session || wx.getStorageSync('exam_session')
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (session?.mustChangePassword) {
      wx.reLaunch({ url: '/pages/account/account?forceChange=1' })
      return
    }
    this.setData({
      displayName: session?.displayName || session?.employeeNo || '员工',
      employeeNo: session?.employeeNo || '',
    })
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.fetchBanks(), this.fetchActiveSession()])
      .catch(() => {
        this.setData({ error: '加载失败，请稍后重试' })
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
              bankId: banks[0]?.id || '',
              bankName: banks[0]?.name || '',
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
          const session = res.statusCode === 200 && res.data?.data?.id ? res.data.data : null
          this.setData({
            activeSession: session,
            modeLabel: MODE_LABEL[session?.mode] || '练习',
          })
          resolve()
        },
        fail: reject,
      })
    })
  },

  onContinue() {
    const { activeSession } = this.data
    if (activeSession?.id) {
      wx.navigateTo({
        url: `/pages/practice-session/practice-session?id=${activeSession.id}`,
      })
    }
  },

  onOpenConfig() {
    wx.navigateTo({ url: '/pages/practice/practice?mode=topic' })
  },

  onWrongBook() {
    if (this.data.activeSession) {
      this.setData({ error: '已有进行中的练习，请先继续或结束' })
      return
    }
    wx.navigateTo({ url: '/pages/wrong-book/wrong-book' })
  },

  onStartMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (this.data.activeSession) {
      this.setData({ error: '已有进行中的练习，请先继续或结束' })
      return
    }
    const { bankId } = this.data
    if (!bankId) {
      this.setData({ error: '暂无开放练习的题库' })
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
        questionBankId: bankId,
        mode,
        questionCount: 10,
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
