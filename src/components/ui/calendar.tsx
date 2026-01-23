import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-6 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-6 sm:space-x-8 sm:space-y-0",
        month: "space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300",
        caption: "flex justify-between items-center pt-2 pb-4 px-2 border-b border-border/50",
        caption_label: "text-base font-semibold text-foreground tracking-tight",
        nav: "space-x-2 flex items-center justify-between absolute top-4 left-0 right-0 px-4 w-auto",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 transition-all duration-200 hover:bg-primary/10 hover:scale-110 active:scale-95"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse space-y-2 mt-6",
        head_row: "flex gap-2",
        head_cell: "text-xs font-semibold text-muted-foreground uppercase tracking-widest rounded-lg w-10 h-10 flex items-center justify-center bg-muted/50",
        row: "flex w-full gap-2 mt-2",
        cell: cn(
          "relative h-10 w-10 p-0 flex items-center justify-center",
          "transition-all duration-200 [&:has([aria-selected])]:rounded-xl",
          "[&:has([aria-selected].day-range-end)]:rounded-r-xl",
          "[&:has([aria-selected].day-outside)]:bg-accent/40",
          "[&:has([aria-selected])]:bg-gradient-to-br [&:has([aria-selected])]:from-primary/20 [&:has([aria-selected])]:to-primary/10",
          "first:[&:has([aria-selected])]:rounded-l-xl",
          "last:[&:has([aria-selected])]:rounded-r-xl",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "relative h-10 w-10 p-0 font-medium text-sm transition-all duration-200",
          "hover:bg-primary/10 hover:scale-105 hover:shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1",
          "aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
          "hover:from-primary hover:to-primary/70 hover:shadow-lg hover:shadow-primary/20",
          "focus:from-primary focus:to-primary/70",
          "animate-in scale-in-95 duration-200"
        ),
        day_today: cn(
          "font-bold ring-2 ring-warning/50 text-warning-foreground",
          "animate-pulse [animation-duration:2s]"
        ),
        day_outside: "text-muted-foreground/40 opacity-50 hover:opacity-70 transition-opacity aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-40",
        day_disabled: "text-muted-foreground/30 cursor-not-allowed opacity-40",
        day_range_middle: "aria-selected:bg-primary/20 aria-selected:text-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => (
          <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:scale-125" />
        ),
        IconRight: ({ ..._props }) => (
          <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:scale-125" />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
