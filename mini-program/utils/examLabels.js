const LIFECYCLE_LABEL = {
  draft: '草稿',
  notStarted: '未开始',
  openForAttempt: '开放开卷',
  closing: '收尾中',
  ended: '已结束',
  cancelled: '已取消',
}

function lifecycleLabel(lifecycle) {
  return LIFECYCLE_LABEL[lifecycle] || lifecycle || '—'
}

function examStatusLine(exam) {
  const parts = [lifecycleLabel(exam?.lifecycle)]
  if (exam?.runStatus === 'paused') parts.push('已暂停')
  if (exam?.resultLocked) parts.push('结果锁定')
  return parts.join(' · ')
}

function examStatusHint(exam) {
  if (exam?.resultLocked) {
    return '结果锁定，异常处理中，请等待企业通知'
  }
  if (exam?.lifecycle === 'closing') {
    return '考试正在收尾，正在确认平台运行状态'
  }
  if (exam?.lifecycle === 'cancelled') {
    return exam.employeeVisibleReason || '本场考试已取消'
  }
  if (exam?.runStatus === 'paused') {
    return '考试已暂停，请等待管理员确认后再作答'
  }
  return ''
}

module.exports = {
  lifecycleLabel,
  examStatusLine,
  examStatusHint,
}
