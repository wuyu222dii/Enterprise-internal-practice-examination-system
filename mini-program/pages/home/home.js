const MODE_LABEL = {
  sequential: '顺序练习',
  random: '随机练习',
  targeted: '专项练习',
  wrongBook: '错题练习',
}

const app = getApp()

Page({
  data: {
    displayName: '员工',
    employeeNo: '',
    banks: [],
    bankId: '',
    bankName: '',
    activeSession: null,
    modeLabel: '练习',
    examTodos: [],
    activeMock: null,
    loading: false,
    error: '',
  },

  onShow() {
    if (!app.requireAccess()) {
      return
    }
    const session = app.globalData.session || wx.getStorageSync('exam_session')
    this.setData({
      displayName: session?.displayName || session?.employeeNo || '员工',
      employeeNo: session?.employeeNo || '',
    })
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.fetchBanks(), this.fetchActiveSession(), this.fetchActiveMock(), this.fetchExamTodos()])
      .catch(() => {
        this.setData({ error: '加载失败，请稍后重试' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  fetchBanks() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/practice/banks`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
            const banks = res.data.data
            this.setData({
              banks,
              bankId: banks[0]?.id || '',
              bankName: banks[0]?.name || '',
            })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  fetchActiveSession() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/practice/sessions/active`,
        header: app.authHeader(),
        success: (res) => {
          const session = res.statusCode === 200 && res.data?.data?.id ? res.data.data : null
          this.setData({
            activeSession: session,
            modeLabel: MODE_LABEL[session?.mode] || '练习',
          })
          resolve()
        },
        fail: reject,
      })
    })
  },

  onContinue() {
    const { activeSession } = this.data
    if (activeSession?.id) {
      wx.navigateTo({
        url: `/pages/practice-session/practice-session?id=${activeSession.id}`,
      })
    }
  },

  guardActive() {
    if (this.data.activeSession) {
      this.setData({ error: '已有进行中的练习，请先继续或结束' })
      return true
    }
    return false
  },

  onOpenConfig() {
    if (this.guardActive()) return
    wx.navigateTo({ url: '/pages/practice/practice?mode=targeted' })
  },

  onWrongBook() {
    if (this.guardActive()) return
    wx.navigateTo({ url: '/pages/wrong-book/wrong-book' })
  },

  onStartMode(e) {
    if (this.guardActive()) return
    const mode = e.currentTarget.dataset.mode
    wx.navigateTo({ url: `/pages/practice/practice?mode=${mode}` })
  },

  fetchActiveMock() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/mock/attempts/active`,
        header: app.authHeader(),
        success: (res) => {
          const attempt = res.statusCode === 200 && res.data?.data?.id ? res.data.data : null
          this.setData({ activeMock: attempt })
          resolve()
        },
        fail: reject,
      })
    })
  },

  onContinueMock() {
    const { activeMock } = this.data
    if (activeMock?.id) {
      wx.navigateTo({
        url: `/pages/mock-exam/mock-exam?id=${activeMock.id}`,
      })
    }
  },

  fetchExamTodos() {
    const { examDomain } = require('../../utils/examLabels')
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/exams/tasks`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
            const examTodos = res.data.data.map((item) => ({
              ...item,
              domain: examDomain(item),
            }))
            this.setData({ examTodos })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  onOpenExamTodo(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/exam-detail/exam-detail?id=${id}` })
    }
  },
})
