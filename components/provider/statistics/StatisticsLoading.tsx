export function StatisticsLoading({ message, pending = true }: { readonly message: string; readonly pending?: boolean }) {
  return <p role="status" className="text-sm text-slate-600">{pending ? message : ""}</p>;
}
