import * as React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  initials?: string;
  imgTestId?: string;
  fallbackTestId?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = "md", initials, imgTestId, fallbackTestId, ...props }, ref) => {
    let sizeClasses = "w-12 h-12";
    let iconSize = "w-6 h-6";
    let textClass = "text-sm";

    switch (size) {
      case "xs":
        sizeClasses = "w-9 h-9";
        iconSize = "w-4 h-4";
        textClass = "text-xs";
        break;
      case "sm":
        sizeClasses = "w-10 h-10";
        iconSize = "w-5 h-5";
        textClass = "text-sm";
        break;
      case "md":
        sizeClasses = "w-12 h-12";
        iconSize = "w-6 h-6";
        textClass = "text-base";
        break;
      case "lg":
        sizeClasses = "w-16 h-16";
        iconSize = "w-8 h-8";
        textClass = "text-lg";
        break;
      case "xl":
        sizeClasses = "w-20 h-20";
        iconSize = "w-10 h-10";
        textClass = "text-xl";
        break;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative select-none border border-slate-200/50 shadow-sm",
          sizeClasses,
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            data-testid={imgTestId}
          />
        ) : initials ? (
          <span className={cn("font-bold text-slate-600", textClass)} data-testid={fallbackTestId}>
            {initials}
          </span>
        ) : (
          <User className={cn("text-slate-400", iconSize)} data-testid={fallbackTestId} />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar };
