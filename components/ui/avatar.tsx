import * as React from "react";
import { User } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative select-none border border-slate-200/50 shadow-sm",
  {
    variants: {
      size: {
        xs: "w-9 h-9",
        sm: "w-10 h-10",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-20 h-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const iconSizeMap: Record<string, string> = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
};

const textSizeMap: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt: string;
  initials?: string;
  imgTestId?: string;
  fallbackTestId?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = "md", initials, imgTestId, fallbackTestId, ...props }, ref) => {
    const sizeKey = size ?? "md";

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            data-testid={imgTestId}
          />
        ) : initials ? (
          <span className={cn("font-bold text-slate-600", textSizeMap[sizeKey])} data-testid={fallbackTestId}>
            {initials}
          </span>
        ) : (
          <User className={cn("text-slate-400", iconSizeMap[sizeKey])} data-testid={fallbackTestId} />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };
