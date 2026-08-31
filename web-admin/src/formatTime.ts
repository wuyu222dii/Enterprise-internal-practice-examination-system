const ENTERPRISE_TIMEZONE = 'Asia/Shanghai'

export function formatEnterpriseTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const text = date.toLocaleString('zh-CN', { timeZone: ENTERPRISE_TIMEZONE })
  return `${text}（企业时区 ${ENTERPRISE_TIMEZONE}）`
}
