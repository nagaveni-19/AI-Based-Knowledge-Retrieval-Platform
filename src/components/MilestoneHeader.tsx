import { Link } from "@tanstack/react-router";
import { BarChart3, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/analytics" as const, label: "Analytics", icon: BarChart3 },
  { to: "/testing" as const, label: "Testing & optimization", icon: ClipboardCheck },
  { to: "/report" as const, label: "Project report", icon: FileText },
];

export function MilestoneHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="border-b border-border pb-7">
      <p className="text-xs font-medium uppercase text-primary">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Milestone 4 sections">
        {links.map((item) => (
          <Button key={item.to} asChild variant="outline" size="sm">
            <Link to={item.to} activeProps={{ className: "border-primary bg-primary/10 text-primary" }}>
              <item.icon className="size-4" /> {item.label}
            </Link>
          </Button>
        ))}
      </nav>
    </header>
  );
}