const app = getApp()

Page({
  data: {
    tasks: [],
    loading: false,
    error: '',
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadTasks()
  },

  loadTasks() {
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/exams/tasks`,
      header: { Authorization: `Bearer ${app.globalData.token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const tasks = res.data.data.map((t) => ({
            ...t,
            id: t.id || t.examId,
          }))
          this.setData({ tasks })
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
