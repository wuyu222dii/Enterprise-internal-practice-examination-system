const app = getApp()

Page({
  data: {
    entries: [],
    loading: false,
    error: '',
    page: 1,
    total: 0,
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadWrongBook()
  },

  loadWrongBook() {
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/practice/wrong-book?page=1&pageSize=50`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          this.setData({
            entries: res.data.data.items || [],
            total: res.data.data.total || 0,
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
})
