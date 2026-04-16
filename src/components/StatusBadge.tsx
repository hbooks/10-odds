import { cn } from "@/lib/utils";

type Status = "pending" | "won" | "lost" | "winning" | "losing";

const statusStyles: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground",
  won: "bg-success/15 text-success",
  lost: "bg-destructive/15 text-destructive",
  winning: "bg-success/15 text-success",
  losing: "bg-destructive/15 text-destructive",
};

const StatusBadge = ({ status }: { status: Status }) => (
  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize", statusStyles[status])}>
    {status}
  </span>
);

export default StatusBadge;
