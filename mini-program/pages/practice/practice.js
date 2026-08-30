const MODE_TITLE = {
  sequential: '顺序练习',
  random: '随机练习',
  targeted: '专项练习',
}

const COUNT_OPTIONS = [10, 20, 50]
const COUNT_LABELS = ['10题', '20题', '50题']

const app = getApp()

Page({
  data: {
    mode: 'targeted',
    modeTitle: '专项练习',
    banks: [],
    activeSession: null,
    selectedBankId: '',
    selectedBankName: '',
    questionCount: 10,
    countLabels: COUNT_LABELS,
    categories: [],
    categoryNames: ['全部分类'],
    selectedCategoryIndex: 0,
    selectedCategoryName: '全部分类',
    knowledgePoints: [],
    kpNames: ['全部知识点'],
    selectedKpIndex: 0,
    selectedKpName: '全部知识点',
    loading: false,
    starting: false,
    error: '',
  },

  onLoad(options) {
    const mode = options.mode && MODE_TITLE[options.mode] ? options.mode : 'targeted'
    this.setData({
      mode,
      modeTitle: MODE_TITLE[mode],
    })
    wx.setNavigationBarTitle({ title: MODE_TITLE[mode] })
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.fetchBanks(), this.fetchActiveSession()])
      .catch(() => {
        this.setData({ error: '加载失败' })
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
            const selectedBankId = this.data.selectedBankId || banks[0]?.id || ''
            const selected = banks.find((bank) => bank.id === selectedBankId) || banks[0]
            this.setData({
              banks,
              selectedBankId: selected?.id || '',
              selectedBankName: selected?.name || '',
            })
            if (this.data.mode === 'targeted' && selected?.id) {
              this.fetchTaxonomy(selected.id).then(resolve).catch(reject)
            } else {
              resolve()
            }
          } else {
            reject()
          }
        },
        fail: reject,
      })
    })
  },

  fetchTaxonomy(bankId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/practice/banks/${bankId}/taxonomy`,
        header: app.authHeader(),
        success: (res) => {
          if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
            const categories = res.data.data
            const categoryNames = ['全部分类'].concat(categories.map((item) => item.name))
            this.setData({
              categories,
              categoryNames,
              selectedCategoryIndex: 0,
              selectedCategoryName: '全部分类',
              knowledgePoints: [],
              kpNames: ['全部知识点'],
              selectedKpIndex: 0,
              selectedKpName: '全部知识点',
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
          if (res.statusCode === 200 && res.data?.data?.id) {
            this.setData({ activeSession: res.data.data })
          } else {
            this.setData({ activeSession: null })
          }
          resolve()
        },
        fail: reject,
      })
    })
  },

  onBankChange(e) {
    const idx = Number(e.detail.value)
    const bank = this.data.banks[idx]
    if (!bank) return
    this.setData({ selectedBankId: bank.id, selectedBankName: bank.name })
    if (this.data.mode === 'targeted') {
      this.fetchTaxonomy(bank.id)
    }
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value)
    const category = this.data.categories[idx - 1]
    const knowledgePoints = category?.knowledgePoints || []
    this.setData({
      selectedCategoryIndex: idx,
      selectedCategoryName: this.data.categoryNames[idx] || '全部分类',
      knowledgePoints,
      kpNames: ['全部知识点'].concat(knowledgePoints.map((item) => item.name)),
      selectedKpIndex: 0,
      selectedKpName: '全部知识点',
    })
  },

  onKpChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      selectedKpIndex: idx,
      selectedKpName: this.data.kpNames[idx] || '全部知识点',
    })
  },

  onCountChange(e) {
    this.setData({ questionCount: COUNT_OPTIONS[Number(e.detail.value)] || 10 })
  },

  onContinue() {
    const { activeSession } = this.data
    if (activeSession?.id) {
      wx.navigateTo({
        url: `/pages/practice-session/practice-session?id=${activeSession.id}`,
      })
    }
  },

  onStart() {
    const { selectedBankId, questionCount, mode, selectedCategoryIndex, selectedKpIndex, categories, knowledgePoints } = this.data
    if (!selectedBankId) {
      this.setData({ error: '请选择题库' })
      return
    }
    const payload = {
      questionBankId: selectedBankId,
      mode,
      questionCount,
    }
    if (mode === 'targeted') {
      const category = selectedCategoryIndex > 0 ? categories[selectedCategoryIndex - 1] : null
      const knowledgePoint = selectedKpIndex > 0 ? knowledgePoints[selectedKpIndex - 1] : null
      if (!category && !knowledgePoint) {
        this.setData({ error: '专项练习请选择分类或知识点' })
        return
      }
      payload.scope = {}
      if (category) payload.scope.categoryId = category.id
      if (knowledgePoint) payload.scope.knowledgePointId = knowledgePoint.id
    }
    this.setData({ starting: true, error: '' })
    wx.request({
      url: `${app.globalData.apiBase}/practice/sessions`,
      method: 'POST',
      header: {
        ...app.authHeader(),
        'Content-Type': 'application/json',
      },
      data: payload,
      success: (res) => {
        if ((res.statusCode === 201 || res.statusCode === 200) && res.data?.data?.id) {
          wx.navigateTo({
            url: `/pages/practice-session/practice-session?id=${res.data.data.id}`,
          })
        } else if (res.statusCode === 409) {
          this.setData({ error: '已有进行中的练习，请先继续或结束' })
          this.fetchActiveSession()
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
