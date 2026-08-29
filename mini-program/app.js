const API_BASE = 'http://localhost:8088/api/v1'

App({
  globalData: {
    apiBase: API_BASE,
    token: '',
    session: null,
  },

  onLaunch() {
    const token = wx.getStorageSync('exam_token')
    const session = wx.getStorageSync('exam_session')
    if (token) {
      this.globalData.token = token
      this.globalData.session = session
    }
  },

  setAuth(token, session) {
    this.globalData.token = token
    this.globalData.session = session
    wx.setStorageSync('exam_token', token)
    wx.setStorageSync('exam_session', session)
  },

  clearAuth() {
    this.globalData.token = ''
    this.globalData.session = null
    wx.removeStorageSync('exam_token')
    wx.removeStorageSync('exam_session')
  },
})
