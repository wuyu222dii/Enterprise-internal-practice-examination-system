export function isSupportedExamBrowser(): boolean {
  const ua = navigator.userAgent
  if (/OPR\//.test(ua) || /Opera/.test(ua)) {
    return false
  }
  return /Edg\//.test(ua) || /Chrome\//.test(ua)
}

export function isSupportedExamViewport(): boolean {
  return window.innerWidth >= 1280 && window.innerHeight >= 720
}

export function examCompatibility(): { ok: boolean; message: string } {
  const browserOk = isSupportedExamBrowser()
  const viewportOk = isSupportedExamViewport()
  if (browserOk && viewportOk) {
    return { ok: true, message: '' }
  }
  const parts: string[] = []
  if (!browserOk) {
    parts.push('请使用桌面 Chrome 或 Edge 最近两个主版本')
  }
  if (!viewportOk) {
    parts.push('最低有效视口为 1280 × 720')
  }
  return {
    ok: false,
    message: parts.join('；') + '。不满足时不能新开卷，已开始的考试可继续作答。',
  }
}
