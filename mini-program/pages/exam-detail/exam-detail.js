const app = getApp()

Page({
  data: {
    examId: '',
    exam: null,
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
          this.setData({ exam: res.data.data })
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

  lifecycleLabel(lifecycle) {
    const map = {
      draft: '草稿',
      notStarted: '未开始',
      openForAttempt: '可开考',
      closing: '即将结束',
      ended: '已结束',
      cancelled: '已取消',
    }
    return map[lifecycle] || lifecycle || '—'
  },
})
