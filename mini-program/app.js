const { apiBase } = require('./config.js')

App({
  globalData: {
    apiBase,
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

  authHeader() {
    return { Authorization: `Bearer ${this.globalData.token}` }
  },

  newIdempotencyKey() {
    return `mp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  },

  requireAccess(options) {
    const allowUnbound = !!(options && options.allowUnbound)
    if (!this.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return false
    }
    const session = this.globalData.session || wx.getStorageSync('exam_session') || {}
    if (session.mustChangePassword) {
      wx.reLaunch({ url: '/pages/account/account?forceChange=1' })
      return false
    }
    if (!allowUnbound && !session.miniProgramBound) {
      wx.reLaunch({ url: '/pages/account/account?forceBind=1' })
      return false
    }
    return true
  },
})
