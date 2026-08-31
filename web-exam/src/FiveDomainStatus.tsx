import { lifecycleLabel } from './examLabels'

interface DomainInput {
  lifecycle?: string | null
  runStatus?: string | null
  remainingAttempts?: number | null
  usedAttempts?: number | null
  resultState?: string | null
  resultLocked?: boolean | null
  participationLabel?: string | null
}

const RESULT_LABEL: Record<string, string> = {
  available: '可披露',
  closing: '收尾观察',
  locked: '结果锁定',
  cancelled: '已取消',
}

export function FiveDomainStatus(props: DomainInput) {
  const run = props.runStatus === 'paused' ? '暂停' : '正常'
  const result = props.resultLocked
    ? '结果锁定'
    : RESULT_LABEL[props.resultState ?? ''] ?? (props.resultState || '—')
  const attempt =
    props.remainingAttempts != null
      ? `剩余 ${props.remainingAttempts} 次`
      : props.usedAttempts != null
        ? `已用 ${props.usedAttempts} 次`
        : '—'
  return (
    <dl className="domain-status">
      <div>
        <dt>生命周期</dt>
        <dd>{lifecycleLabel(props.lifecycle)}</dd>
      </div>
      <div>
        <dt>运行</dt>
        <dd>{run}</dd>
      </div>
      <div>
        <dt>参与</dt>
        <dd>{props.participationLabel || '—'}</dd>
      </div>
      <div>
        <dt>尝试</dt>
        <dd>{attempt}</dd>
      </div>
      <div>
        <dt>结果</dt>
        <dd>{result}</dd>
      </div>
    </dl>
  )
}
