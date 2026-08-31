const LIFECYCLE_LABEL = {
  draft: '草稿',
  notStarted: '未开始',
  openForAttempt: '开放开卷',
  closing: '收尾中',
  ended: '已结束',
  cancelled: '已取消',
}

const RESULT_LABEL = {
  available: '可披露',
  closing: '收尾观察',
  locked: '结果锁定',
  cancelled: '已取消',
}

function lifecycleLabel(lifecycle) {
  return LIFECYCLE_LABEL[lifecycle] || lifecycle || '—'
}

function examDomain(exam) {
  const run = exam?.runStatus === 'paused' ? '暂停' : '正常'
  const participation = exam?.participationLabel || exam?.participationStatus || '—'
  const attempt = exam?.remainingAttempts != null ? `剩余 ${exam.remainingAttempts} 次` : '—'
  const result = exam?.resultLocked
    ? '结果锁定'
    : (RESULT_LABEL[exam?.resultState] || exam?.resultState || '—')
  return {
    lifecycle: lifecycleLabel(exam?.lifecycle),
    run,
    participation,
    attempt,
    result,
  }
}

function examStatusLine(exam) {
  const domain = examDomain(exam)
  return [domain.lifecycle, domain.run, domain.participation, domain.attempt, domain.result].join(' · ')
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
  examDomain,
  examStatusLine,
  examStatusHint,
}
