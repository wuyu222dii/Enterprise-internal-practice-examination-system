const app = getApp()

Page({
  data: {
    view: 'login',
    employeeNo: '',
    password: '',
    phone: '',
    code: '',
    resetToken: '',
    newPassword: '',
    forgotStep: 'idle',
    error: '',
    success: '',
    loading: false,
  },

  onEmployeeNoInput(e) {
    this.setData({ employeeNo: e.detail.value.trim() })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
  },

  onShowForgot() {
    this.setData({ view: 'forgot', error: '', success: '', forgotStep: 'idle' })
  },

  onShowLogin() {
    this.setData({
      view: 'login',
      error: '',
      success: '',
      forgotStep: 'idle',
      code: '',
      resetToken: '',
      newPassword: '',
    })
  },

  onLogin() {
    const { employeeNo, password } = this.data
    if (!employeeNo || !password) {
      this.setData({ error: '请输入工号和密码' })
      return
    }
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/login`,
      method: 'POST',
      data: { employeeNo, password, clientType: 'miniProgram' },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.data) {
          const { token, session } = res.data.data
          app.setAuth(token, session)
          if (session.mustChangePassword) {
            wx.reLaunch({ url: '/pages/account/account?forceChange=1' })
          } else if (!session.miniProgramBound) {
            wx.reLaunch({ url: '/pages/account/account?forceBind=1' })
          } else {
            wx.reLaunch({ url: '/pages/home/home' })
          }
        } else {
          this.setData({ error: '工号或密码错误' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误，请检查后端服务与合法域名设置' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },

  onSendResetSms() {
    const { phone } = this.data
    if (!phone) {
      this.setData({ error: '请输入预留手机号' })
      return
    }
    this.setData({ loading: true, error: '', success: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/sms/send`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone, purpose: 'resetPassword' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ forgotStep: 'verify', success: '验证码已发送' })
        } else {
          this.setData({ error: res.data?.error?.message || '发送失败，请稍后重试' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误，请检查后端服务与合法域名设置' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },

  onVerifyResetSms() {
    const { phone, code } = this.data
    if (!code) {
      this.setData({ error: '请输入验证码' })
      return
    }
    this.setData({ loading: true, error: '', success: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/sms/verify`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone, code, purpose: 'resetPassword' },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data?.verificationToken) {
          this.setData({
            resetToken: res.data.data.verificationToken,
            forgotStep: 'reset',
            success: '验证成功，请设置新密码',
          })
        } else {
          this.setData({ error: '验证码无效，请重新输入' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误，请检查后端服务与合法域名设置' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },

  onResetPassword() {
    const { employeeNo, resetToken, newPassword } = this.data
    if (!employeeNo) {
      this.setData({ error: '请输入工号' })
      return
    }
    if (!newPassword || newPassword.length < 8) {
      this.setData({ error: '新密码长度至少 8 位' })
      return
    }
    this.setData({ loading: true, error: '', success: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/password-reset`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { employeeNo, verificationToken: resetToken, newPassword },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            view: 'login',
            password: '',
            newPassword: '',
            code: '',
            resetToken: '',
            forgotStep: 'idle',
            success: '',
            error: '',
          })
          wx.showToast({ title: '密码已重置', icon: 'success' })
        } else {
          this.setData({ error: res.data?.error?.message || '重置失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误，请检查后端服务与合法域名设置' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },
})
