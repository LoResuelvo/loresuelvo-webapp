import { cn } from "@/lib/utils";

export interface ConsumerMessagesViewProps {
  sidebar: React.ReactNode;
  chat: React.ReactNode;
  isChatActive: boolean;
  className?: string;
}

export default function ConsumerMessagesView({
  sidebar,
  chat,
  isChatActive,
  className,
}: ConsumerMessagesViewProps) {
  return (
    <main className={cn("flex-1 flex min-h-0", className)}>
      {sidebar}
      <div className={cn(isChatActive ? "flex" : "hidden md:flex", "flex-1 flex-col min-w-0")}>
        {chat}
      </div>
    </main>
  );
}

