const TYPE_LABEL = {
  singleChoice: '单选',
  multipleChoice: '多选',
  trueFalse: '判断',
  essay: '解答题',
}

const COUNT_OPTIONS = [10, 20, 50]
const COUNT_LABELS = ['10题', '20题', '50题']

const app = getApp()

Page({
  data: {
    entries: [],
    loading: false,
    starting: false,
    error: '',
    page: 1,
    total: 0,
    questionCount: 10,
    countLabels: COUNT_LABELS,
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadWrongBook()
  },

  loadWrongBook() {
    this.setData({ loading: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/practice/wrong-book?page=1&pageSize=50`,
      header: app.authHeader(),
      success: (res) => {
        if (res.statusCode === 200 && res.data?.data) {
          const entries = (res.data.data.items || []).map((item) => ({
            ...item,
            typeLabel: TYPE_LABEL[item.type] || item.type || '题目',
          }))
          this.setData({
            entries,
            total: res.data.data.total || 0,
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

  onCountChange(e) {
    this.setData({ questionCount: COUNT_OPTIONS[Number(e.detail.value)] || 10 })
  },

  onStart(e) {
    const bankId = e.currentTarget.dataset.bankId || this.data.entries[0]?.questionBankId
    if (!bankId) {
      this.setData({ error: '无法确定题库，请从有题干的错题开练' })
      return
    }
    this.setData({ starting: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: {
        questionBankId: bankId,
        mode: 'wrongBook',
        questionCount: this.data.questionCount,
      },
      success: (res) => {
        if ((res.statusCode === 201 || res.statusCode === 200) && res.data?.data?.id) {
          wx.navigateTo({
            url: `/pages/practice-session/practice-session?id=${res.data.data.id}`,
          })
        } else if (res.statusCode === 409) {
          this.setData({ error: '已有进行中的练习，请先继续或结束' })
        } else {
          this.setData({ error: res.data?.error?.message || '开始练习失败' })
        }
      },
      fail: () => {
        this.setData({ error: '网络错误' })
      },
      complete: () => {
        this.setData({ starting: false })
      },
    })
  },
})
