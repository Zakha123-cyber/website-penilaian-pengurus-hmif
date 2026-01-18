import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader({ title = "Dashboard", activePeriod }: { title?: string; activePeriod?: string | null }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <h1 className="text-base font-semibold sm:text-lg">{title}</h1>
          {activePeriod && (
            <Badge variant="outline" className="text-xs font-medium">
              Periode aktif: {activePeriod}
            </Badge>
          )}
        </div>
        <div className="ml-auto" />
      </div>
    </header>
  );
}
