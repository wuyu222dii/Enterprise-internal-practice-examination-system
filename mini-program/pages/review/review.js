const app = getApp()

Page({
  data: {
    kind: '',
    id: '',
    title: '复盘',
    subtitle: '',
    scoreText: '',
    abandoned: false,
    items: [],
    loading: true,
    error: '',
  },

  onLoad(options) {
    if (!app.requireAccess()) {
      return
    }
    const kind = options.kind === 'mock' ? 'mock' : options.kind === 'exam' ? 'exam' : 'practice'
    const id = options.id || ''
    if (!id) {
      this.setData({ error: '缺少复盘 ID', loading: false })
      return
    }
    const titles = { mock: '模拟复盘', exam: '正式考试复盘', practice: '练习复盘' }
    this.setData({
      kind,
      id,
      title: titles[kind] || '复盘',
    })
    if (kind === 'mock') {
      this.loadMock()
    } else if (kind === 'exam') {
      this.loadExam()
    } else {
      this.loadPractice()
    }
  },

  loadPractice() {
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions/${this.data.id}/review`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const data = res.data.data
          const items = (data.items || []).map((item, index) => ({
            ...item,
            order: item.order || index + 1,
            userAnswerText: (item.userAnswer || []).join(', ') || '未作答',
            standardAnswerText: (item.standardAnswer || []).join(', '),
          }))
          this.setData({
            items,
            subtitle: `共 ${data.questionCount || items.length} 题`,
          })
        } else {
          this.setData({ error: res.data?.error?.message || '加载复盘失败' })
        }
      },
      fail: () => this.setData({ error: '网络错误' }),
      complete: () => this.setData({ loading: false }),
    })
  },

  loadMock() {
    wx.request({
      url: `${app.globalData.apiBase}/mock/attempts/${this.data.id}/result`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const data = res.data.data
          if (data.abandoned) {
            this.setData({
              abandoned: true,
              subtitle: '本次模拟已放弃，不生成成绩',
              items: [],
            })
            return
          }
          const items = (data.items || []).map((item, index) => ({
            ...item,
            order: item.order || index + 1,
            userAnswerText: (item.userAnswer || []).join(', ') || '未作答',
            standardAnswerText: (item.standardAnswer || []).join(', '),
          }))
          const scoreText =
            data.totalScore != null && data.maxScore != null
              ? `得分 ${data.totalScore} / ${data.maxScore}`
              : ''
          this.setData({
            items,
            scoreText,
            subtitle: `共 ${items.length} 题`,
          })
        } else {
          this.setData({ error: res.data?.error?.message || '加载复盘失败' })
        }
      },
      fail: () => this.setData({ error: '网络错误' }),
      complete: () => this.setData({ loading: false }),
    })
  },

  loadExam() {
    wx.request({
      url: `${app.globalData.apiBase}/attempts/${this.data.id}/result`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const data = res.data.data
          const visibility = data.visibility || {}
          if (!visibility.summaryVisible) {
            this.setData({
              subtitle: data.neutralMessage || data.cancelNotice || '成绩尚未公开',
              scoreText: '',
              items: [],
            })
            return
          }
          let scoreText = data.totalScore != null ? `官方成绩 ${data.totalScore}/${data.maxScore}` : ''
          if (visibility.passConclusionVisible && data.passed != null) {
            scoreText += data.passed ? ' · 通过' : ' · 未通过'
          }
          const items = visibility.perItemReviewAllowed
            ? (data.items || []).map((item, index) => ({
                ...item,
                order: item.order || index + 1,
                userAnswerText: (item.userAnswer || []).join(', ') || '未作答',
                standardAnswerText: (item.standardAnswer || []).join(', '),
              }))
            : []
          this.setData({
            items,
            scoreText,
            subtitle: items.length ? `共 ${items.length} 题` : '已公开官方汇总',
          })
        } else {
          this.setData({ error: res.data?.error?.message || '加载复盘失败' })
        }
      },
      fail: () => this.setData({ error: '网络错误' }),
      complete: () => this.setData({ loading: false }),
    })
  },

  onBack() {
    if (this.data.kind === 'mock') {
      wx.navigateBack({ delta: 2 })
    } else {
      wx.switchTab({ url: '/pages/home/home' })
    }
  },
})
