const { examDomain, examStatusHint } = require('../../utils/examLabels')
const { formatEnterpriseTime } = require('../../utils/formatTime')
const app = getApp()

Page({
  data: {
    examId: '',
    exam: null,
    domain: null,
    statusHint: '',
    cancelled: false,
    openStartText: '',
    stopAttemptText: '',
    loading: false,
    error: '',
  },

  onLoad(options) {
    if (!app.requireAccess()) {
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
          const cancelled = exam.lifecycle === 'cancelled'
          this.setData({
            exam,
            cancelled,
            domain: examDomain(exam),
            statusHint: examStatusHint(exam),
            openStartText: formatEnterpriseTime(exam.openStartAt),
            stopAttemptText: formatEnterpriseTime(exam.stopAttemptAt),
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

  onCopyCode() {
    const code = this.data.exam && this.data.exam.examCode
    if (!code) return
    wx.setClipboardData({
      data: String(code),
      success: () => wx.showToast({ title: '考试码已复制', icon: 'none' }),
    })
  },

  onCopyPortal() {
    const url = this.data.exam && this.data.exam.portalUrl
    if (!url) return
    wx.setClipboardData({
      data: String(url),
      success: () => wx.showToast({ title: '电脑端地址已复制', icon: 'none' }),
    })
  },
})
