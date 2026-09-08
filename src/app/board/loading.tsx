export default function BoardLoading() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]" aria-busy="true" aria-label="Loading the board">
      <section>
        <div className="skeleton mb-3 h-9 w-2/3 rounded" />
        <div className="skeleton mb-8 h-5 w-1/2 rounded" />
        <ul className="divide-y divide-hairline border-y border-hairline">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <div>
                <div className="skeleton mb-2 h-3 w-40 rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="skeleton h-3 w-14 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <aside><div className="skeleton h-40 rounded-md" /></aside>
    </div>
  );
}
