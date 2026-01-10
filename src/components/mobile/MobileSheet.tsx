import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "bottom" | "right" | "left" | "top";
  className?: string;
}

// Full-screen mobile sheet/modal
export const MobileSheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "bottom",
  className,
}: MobileSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "md:hidden w-full h-[95vh] rounded-t-3xl p-0 flex flex-col",
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        {(title || description) && (
          <SheetHeader className="px-4 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                {title && <SheetTitle className="text-lg">{title}</SheetTitle>}
                {description && (
                  <SheetDescription className="text-sm mt-1">
                    {description}
                  </SheetDescription>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="px-4 py-4 border-t border-border/50 bg-background"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// Confirmation sheet for delete/actions
interface MobileConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export const MobileConfirmSheet = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  loading = false,
}: MobileConfirmSheetProps) => {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            variant={variant === "destructive" ? "destructive" : "default"}
            className="w-full h-12 text-base rounded-xl"
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full h-12 text-base rounded-xl"
          >
            {cancelLabel}
          </Button>
        </div>
      }
    >
      <div className="py-4 text-center">
        <p className="text-muted-foreground">{description}</p>
      </div>
    </MobileSheet>
  );
};

// Detail view sheet
interface MobileDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export const MobileDetailSheet = ({
  open,
  onOpenChange,
  title,
  children,
  actions,
}: MobileDetailSheetProps) => {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={actions}
    >
      {children}
    </MobileSheet>
  );
};
