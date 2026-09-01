export const PASSWORD_POLICY_HINT =
  '8–64 位，须包含大写、小写、数字、特殊符号四类中的至少三类，且不得包含工号或手机号'

export function validatePasswordPolicy(
  password: string,
  employeeNo?: string | null,
  phone?: string | null,
): string | null {
  if (!password || password.length < 8 || password.length > 64) {
    return PASSWORD_POLICY_HINT
  }
  let classes = 0
  if (/[A-Z]/.test(password)) classes += 1
  if (/[a-z]/.test(password)) classes += 1
  if (/\d/.test(password)) classes += 1
  if (/[^A-Za-z0-9]/.test(password)) classes += 1
  if (classes < 3) {
    return PASSWORD_POLICY_HINT
  }
  const lower = password.toLowerCase()
  if (employeeNo && employeeNo.trim() && lower.includes(employeeNo.trim().toLowerCase())) {
    return '密码不得包含工号'
  }
  if (phone && phone.trim() && password.includes(phone.trim())) {
    return '密码不得包含手机号'
  }
  return null
}
