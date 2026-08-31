const ENTERPRISE_TIMEZONE = 'Asia/Shanghai'

function formatEnterpriseTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const text = date.toLocaleString('zh-CN', { timeZone: ENTERPRISE_TIMEZONE })
  return `${text}（企业时区 ${ENTERPRISE_TIMEZONE}）`
}

module.exports = {
  ENTERPRISE_TIMEZONE,
  formatEnterpriseTime,
}
