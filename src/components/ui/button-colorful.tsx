import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ButtonColorfulProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

/* Brand take on the 21st.dev colorful button: ember gradient glow that
   sharpens on hover behind a navy core. */
export function ButtonColorful({
  className,
  label = "Explore",
  ...props
}: ButtonColorfulProps) {
  return (
    <Button
      className={cn(
        "relative h-10 overflow-hidden px-4",
        "bg-navy-deep",
        "transition-all duration-200",
        "group",
        className,
      )}
      {...props}
    >
      {/* Gradient glow effect */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-accent via-[#ff7a4d] to-accent-deep",
          "opacity-40 group-hover:opacity-90",
          "blur transition-opacity duration-500",
        )}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        <span className="text-white">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-white/90 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Button>
  );
}
