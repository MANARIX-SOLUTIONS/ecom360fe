import { Skeleton } from 'antd'

/**
 * 360 PME – Loading skeleton for cards/tables.
 * Use for loading state before data.
 */
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Skeleton
      active
      paragraph={{ rows }}
      title={{ width: '40%' }}
    />
  )
}

export function CardSkeleton() {
  return (
    <Skeleton.Node active style={{ width: '100%', height: 120 }}>
      <span />
    </Skeleton.Node>
  )
}
