import Header from "@/components/Header";
import { AuthSession } from "@/lib/auth/types";


export default function ConsumerHome({ session }: { session: AuthSession | null }) {
  return (
    <div className="min-h-screen bg-brand-neutral flex flex-col font-sans text-brand-primary">
      <Header user={session?.user} />
      <main className="flex-1 w-full" />
    </div>
  )
}