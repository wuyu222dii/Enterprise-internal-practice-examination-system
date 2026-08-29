const app = getApp()

Page({
  data: {
    employeeNo: '',
    password: '',
    error: '',
    loading: false,
  },

  onEmployeeNoInput(e) {
    this.setData({ employeeNo: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onLogin() {
    const { employeeNo, password } = this.data
    if (!employeeNo || !password) {
      this.setData({ error: '请输入员工号和密码' })
      return
    }
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/auth/login`,
      method: 'POST',
      data: { employeeNo, password },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.data) {
          const { token, session } = res.data.data
          app.setAuth(token, session)
          wx.redirectTo({ url: '/pages/home/home' })
        } else {
          const msg = res.data?.error?.message || '登录失败'
          this.setData({ error: msg })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误，请检查后端服务' })
      },
      complete: () => {
        this.setData({ loading: false })
      },
    })
  },
})
