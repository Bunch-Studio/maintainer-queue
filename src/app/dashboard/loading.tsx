export default function DashboardLoading() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading your dashboard">
      <div className="flex items-end justify-between border-b border-hairline pb-6">
        <div>
          <div className="skeleton mb-2 h-3 w-20 rounded" />
          <div className="skeleton h-8 w-40 rounded" />
        </div>
        <div className="skeleton h-8 w-56 rounded" />
      </div>
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-12 rounded" />
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-10 rounded" />
          <div className="skeleton h-36 rounded" />
        </div>
        <div className="space-y-6">
          <div className="skeleton h-56 rounded-md" />
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-12 rounded" />
        </div>
      </div>
    </div>
  );
}
