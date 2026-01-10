import { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MobileCardProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

// Base mobile card
export const MobileCard = ({ children, className, onClick, hoverable = true }: MobileCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl border border-border/50 p-4 transition-all duration-200",
        "shadow-sm",
        hoverable && onClick && "active:scale-[0.98] cursor-pointer hover:bg-accent/50",
        className
      )}
    >
      {children}
    </div>
  );
};

// Feed item card (like Facebook posts)
interface FeedItemCardProps {
  avatar?: string;
  avatarFallback?: string;
  avatarColor?: string;
  name: string;
  subtitle?: string;
  timestamp: string;
  content?: ReactNode;
  status?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  onClick?: () => void;
  actionIcon?: ReactNode;
  meta?: ReactNode;
}

export const FeedItemCard = ({
  avatar,
  avatarFallback = "?",
  avatarColor = "bg-primary",
  name,
  subtitle,
  timestamp,
  content,
  status,
  onClick,
  actionIcon,
  meta,
}: FeedItemCardProps) => {
  return (
    <MobileCard onClick={onClick} className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className={cn("text-white text-sm font-medium", avatarColor)}>
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{name}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {status && (
                <Badge variant={status.variant || "secondary"} className="text-[10px] px-2 py-0.5">
                  {status.label}
                </Badge>
              )}
              {actionIcon || <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          
          <p className="text-[11px] text-muted-foreground mt-1">{timestamp}</p>
        </div>
      </div>
      
      {content && <div className="text-sm text-muted-foreground">{content}</div>}
      {meta && <div className="pt-2 border-t border-border/50">{meta}</div>}
    </MobileCard>
  );
};

// Stats card for mobile
interface MobileStatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const MobileStatCard = ({
  icon,
  label,
  value,
  trend,
  className,
  onClick,
}: MobileStatCardProps) => {
  return (
    <MobileCard onClick={onClick} className={cn("flex items-center gap-4", className)}>
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold">{value}</p>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-500" : "text-destructive"
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </MobileCard>
  );
};

// Quick action button for mobile
interface MobileQuickActionProps {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

export const MobileQuickAction = ({
  icon,
  label,
  description,
  onClick,
  variant = "default",
}: MobileQuickActionProps) => {
  const variantStyles = {
    default: "bg-card hover:bg-accent/50",
    primary: "bg-primary/10 text-primary hover:bg-primary/20",
    success: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border/50 transition-all duration-200",
        "active:scale-95 touch-manipulation min-h-[100px]",
        variantStyles[variant]
      )}
    >
      <div className="h-10 w-10 rounded-xl bg-current/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
};

// Section header for mobile
interface MobileSectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const MobileSectionHeader = ({ title, action }: MobileSectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-primary font-medium active:opacity-70"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
