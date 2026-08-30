const app = getApp()

Page({
  data: {
    displayName: '',
    employeeNo: '',
    taskCount: 0,
    loading: false,
  },

  onShow() {
    const session = app.globalData.session || wx.getStorageSync('exam_session')
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (session?.mustChangePassword) {
      wx.redirectTo({ url: '/pages/account/account?forceChange=1' })
      return
    }
    this.setData({
      displayName: session?.displayName || session?.employeeNo || '员工',
      employeeNo: session?.employeeNo || '',
    })
    this.loadTaskCount()
  },

  loadTaskCount() {
    this.setData({ loading: true })
    wx.request({
      url: `${app.globalData.apiBase}/exams/tasks`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
          this.setData({ taskCount: res.data.data.length })
        }
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },

  onLogout() {
    app.clearAuth()
    wx.redirectTo({ url: '/pages/login/login' })
  },
})
