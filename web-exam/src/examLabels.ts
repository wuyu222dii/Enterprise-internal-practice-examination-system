export const LIFECYCLE_LABEL: Record<string, string> = {
  draft: '草稿',
  notStarted: '未开始',
  openForAttempt: '开放开卷',
  closing: '收尾中',
  ended: '已结束',
  cancelled: '已取消',
}

export function lifecycleLabel(lifecycle?: string | null): string {
  if (!lifecycle) return '—'
  return LIFECYCLE_LABEL[lifecycle] ?? lifecycle
}

export function startFailureCopy(code?: string): { title: string; body: string } | null {
  switch (code) {
    case 'ATT_NOT_STARTED':
      return { title: '考试尚未开始', body: '开考时间未到，请在开放时间后再进入。' }
    case 'ATT_NOT_ASSIGNED':
      return { title: '不在应考名单', body: '您不在本场应考范围，如有疑问请联系管理员。' }
    case 'ATT_NO_REMAINING_OPPORTUNITY':
      return { title: '次数已用尽', body: '本场考试次数已用完，无法再次开卷。' }
    case 'ATT_EXAM_PAUSED':
      return { title: '考试已暂停', body: '平台运行异常处理中，请等待管理员确认后再开卷。' }
    case 'ATT_WINDOW_CLOSED':
      return { title: '当前不可开卷', body: '考试正在收尾、已结束或已取消，无法新开卷。' }
    default:
      return null
  }
}
