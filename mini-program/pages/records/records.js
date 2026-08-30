const app = getApp()

Page({
  data: {
    tab: 'practice',
    practiceRecords: [],
    mockRecords: [],
    examRecords: [],
    loading: false,
    error: '',
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadRecords()
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ tab })
  },

  loadRecords() {
    this.setData({ loading: true, error: '' })
    Promise.all([
      this.fetchPracticeRecords(),
      this.fetchMockRecords(),
      this.fetchExamRecords(),
    ])
      .catch(() => {
        this.setData({ error: '加载失败' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  fetchPracticeRecords() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/practice/records?page=1&pageSize=20`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data) {
            this.setData({ practiceRecords: res.data.data.items || [] })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  fetchMockRecords() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/mock/records?page=1&pageSize=20`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data) {
            this.setData({ mockRecords: res.data.data.items || [] })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  fetchExamRecords() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/exams/records?page=1&pageSize=20`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && res.data?.data) {
            const { lifecycleLabel } = require('../../utils/examLabels')
            const examRecords = (res.data.data.items || []).map((item) => {
              const locked = item.resultLocked || item.resultState === 'locked'
              const closing = item.resultState === 'closing' || item.lifecycle === 'closing'
              const cancelled = item.resultState === 'cancelled' || item.lifecycle === 'cancelled'
              let fact = '已提交作答'
              if (item.attemptStatus === 'inProgress') fact = '作答进行中'
              if (item.attemptStatus === 'voided') fact = '该次作答已作废'
              let notice = ''
              if (locked) notice = '结果锁定，异常处理中，请等待企业通知'
              else if (closing) notice = '考试正在收尾，成绩暂不披露'
              else if (cancelled) notice = item.employeeVisibleReason || '本场考试已取消'
              return {
                ...item,
                lifecycleLabel: lifecycleLabel(item.lifecycle),
                fact,
                notice,
              }
            })
            this.setData({ examRecords })
            resolve()
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  onOpenPracticeReview(e) {
    const id = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status
    if (!id || status !== 'finished') return
    wx.navigateTo({ url: `/pages/review/review?kind=practice&id=${id}` })
  },

  onOpenMockReview(e) {
    const id = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status
    if (!id) return
    if (status === 'completed' || status === 'terminated') {
      wx.navigateTo({ url: `/pages/review/review?kind=mock&id=${id}` })
    }
  },
})
