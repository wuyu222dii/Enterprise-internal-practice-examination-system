const { examDomain } = require('../../utils/examLabels')
const app = getApp()

Page({
  data: {
    tasks: [],
    loading: false,
    error: '',
  },

  onShow() {
    if (!app.requireAccess()) {
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
            domain: examDomain(t),
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

  onTaskTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/exam-detail/exam-detail?id=${id}` })
    }
  },
})
