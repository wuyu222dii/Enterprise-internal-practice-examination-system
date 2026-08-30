const app = getApp()

Page({
  data: {
    displayName: '',
    employeeNo: '',
    miniProgramBound: false,
    forceChange: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    bindPhone: '',
    bindCode: '',
    bindToken: '',
    bindStep: 'idle',
    loading: false,
    bindLoading: false,
    error: '',
    success: '',
  },

  onLoad(options) {
    this.setData({ forceChange: options.forceChange === '1' })
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.refreshSession()
  },

  refreshSession() {
    wx.request({
      url: `${app.globalData.apiBase}/auth/session`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data?.session) {
          const session = res.data.data.session
          app.setAuth(app.globalData.token, session)
          this.setData({
            displayName: session.displayName || session.employeeNo || '',
            employeeNo: session.employeeNo || '',
            miniProgramBound: !!session.miniProgramBound,
          })
        }
      },
    })
  },

  onCurrentPasswordInput(e) {
    this.setData({ currentPassword: e.detail.value })
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  onBindPhoneInput(e) {
    this.setData({ bindPhone: e.detail.value })
  },

  onBindCodeInput(e) {
    this.setData({ bindCode: e.detail.value })
  },

  onChangePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.data
    if (!currentPassword || !newPassword) {
      this.setData({ error: '请填写当前密码和新密码' })
      return
    }
    if (newPassword.length < 8) {
      this.setData({ error: '新密码长度至少 8 位' })
      return
    }
    if (newPassword !== confirmPassword) {
      this.setData({ error: '两次输入的新密码不一致' })
      return
    }
    this.setData({ loading: true, error: '', success: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/change-password`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: { currentPassword, newPassword },
      success: (res) => {
        if (res.statusCode === 200) {
          const wasForceChange = this.data.forceChange
          this.setData({
            success: '密码修改成功',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            forceChange: false,
          })
          this.refreshSession()
          if (wasForceChange) {
            wx.redirectTo({ url: '/pages/home/home' })
          }
        } else {
          this.setData({ error: res.data?.error?.message || '修改失败' })
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

  onSendBindSms() {
    const { bindPhone } = this.data
    if (!bindPhone) {
      this.setData({ error: '请输入手机号' })
      return
    }
    this.setData({ bindLoading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/sms/send`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone: bindPhone, purpose: 'bindMiniProgram' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ bindStep: 'verify', success: '验证码已发送' })
        } else {
          this.setData({ error: res.data?.error?.message || '发送失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误' })
      },
      complete: () => {
        this.setData({ bindLoading: false })
      },
    })
  },

  onVerifyBindSms() {
    const { bindPhone, bindCode } = this.data
    if (!bindCode) {
      this.setData({ error: '请输入验证码' })
      return
    }
    this.setData({ bindLoading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/sms/verify`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone: bindPhone, code: bindCode, purpose: 'bindMiniProgram' },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data?.verificationToken) {
          this.setData({
            bindToken: res.data.data.verificationToken,
            bindStep: 'ready',
            success: '验证成功，请点击完成绑定',
          })
        } else {
          this.setData({ error: res.data?.error?.message || '验证失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误' })
      },
      complete: () => {
        this.setData({ bindLoading: false })
      },
    })
  },

  onBindMiniProgram() {
    const { bindToken } = this.data
    if (!bindToken) {
      this.setData({ error: '请先完成短信验证' })
      return
    }
    this.setData({ bindLoading: true, error: '' })
    const openId = `mp-dev-${this.data.employeeNo}`
    wx.request({
      url: `${app.globalData.apiBase}/auth/mini-program/bind`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: { verificationToken: bindToken, miniProgramOpenId: openId },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            success: '微信绑定成功',
            bindStep: 'idle',
            bindPhone: '',
            bindCode: '',
            bindToken: '',
          })
          this.refreshSession()
        } else {
          this.setData({ error: res.data?.error?.message || '绑定失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误' })
      },
      complete: () => {
        this.setData({ bindLoading: false })
      },
    })
  },
})
