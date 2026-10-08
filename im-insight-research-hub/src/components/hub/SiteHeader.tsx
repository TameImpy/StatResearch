import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import logos from "@/assets/im-logos.png.asset.json";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="bg-im-banner text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="text-2xl font-semibold uppercase tracking-wider">Research Hub</span>
          <img src={logos.url} alt="IM Insight | Immediate, a Burda company" className="h-12 w-auto" />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-im-banner font-display text-lg font-bold text-primary-foreground">
            IM
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-2xl font-semibold">IM Insight</span>
            <span className="mt-1 hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              Research Hub · weekly insights archive
            </span>
          </span>
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to="/upload">
            <Upload /> Add this week's slide
          </Link>
        </Button>
      </div>
    </header>
  );
}
