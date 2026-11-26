import { Skeleton as AntSkeleton } from "antd";

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return <AntSkeleton active title={false} paragraph={{ rows }} />;
}

export function SkeletonRows({ count = 5, rows }: { count?: number; rows?: number }) {
  const total = rows ?? count;
  return (
    <div aria-busy="true">
      {Array.from({ length: total }, (_, index) => (
        <AntSkeleton.Input key={index} active block style={{ height: 36, marginBottom: 8 }} />
      ))}
    </div>
  );
}

export function SkeletonKpi() {
  return <AntSkeleton.Input active block style={{ height: 112, borderRadius: 10 }} />;
}
