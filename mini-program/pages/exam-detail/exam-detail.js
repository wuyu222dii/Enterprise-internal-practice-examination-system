const { lifecycleLabel, examStatusHint } = require('../../utils/examLabels')
const app = getApp()

Page({
  data: {
    examId: '',
    exam: null,
    lifecycleText: '',
    statusHint: '',
    loading: false,
    error: '',
  },

  onLoad(options) {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const examId = options.id
    if (!examId) {
      this.setData({ error: '缺少考试 ID' })
      return
    }
    this.setData({ examId })
    this.loadExam()
  },

  loadExam() {
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/exams/${this.data.examId}`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const exam = res.data.data
          this.setData({
            exam,
            lifecycleText: lifecycleLabel(exam.lifecycle),
            statusHint: examStatusHint(exam),
          })
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
})
