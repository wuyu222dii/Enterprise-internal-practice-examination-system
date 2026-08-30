const app = getApp()

Page({
  data: {
    tab: 'practice',
    practiceRecords: [],
    mockRecords: [],
    loading: false,
    error: '',
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadRecords()
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ tab })
  },

  loadRecords() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.fetchPracticeRecords(), this.fetchMockRecords()])
      .catch(() => {
        this.setData({ error: '加载失败' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  fetchPracticeRecords() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/practice/records?page=1&pageSize=20`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data) {
            this.setData({ practiceRecords: res.data.data.items || [] })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  fetchMockRecords() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/mock/records?page=1&pageSize=20`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data) {
            this.setData({ mockRecords: res.data.data.items || [] })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },
})
