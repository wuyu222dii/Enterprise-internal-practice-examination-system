const app = getApp()

Page({
  data: {
    displayName: '',
  },

  onShow() {
    const session = app.globalData.session || wx.getStorageSync('exam_session')
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({
      displayName: session?.displayName || session?.employeeNo || '员工',
    })
  },

  onLogout() {
    app.clearAuth()
    wx.redirectTo({ url: '/pages/login/login' })
  },
})
