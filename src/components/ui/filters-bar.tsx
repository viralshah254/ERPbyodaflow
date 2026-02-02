"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FiltersBarProps {
  searchPlaceholder?: string;
  /** Controlled search: when provided, search input is controlled by parent (e.g. for saved views). */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: Array<{
    id: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange?: (value: string) => void;
  }>;
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export function FiltersBar({
  searchPlaceholder = "Search...",
  searchValue: controlledValue,
  onSearchChange,
  filters = [],
  activeFiltersCount = 0,
  onClearFilters,
  className,
}: FiltersBarProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const isControlled = controlledValue !== undefined;
  const searchValue = isControlled ? controlledValue : internalValue;

  const handleSearchChange = (value: string) => {
    if (!isControlled) setInternalValue(value);
    onSearchChange?.(value);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 p-4 border-b bg-card",
        className
      )}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          className="pl-9"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => {
        // Radix Select does not allow SelectItem with an empty-string value.
        // We map any external empty-string option to an internal sentinel ("__ALL__")
        // while keeping the external API (filter.value / onChange) using "".
        const hasEmptyOption = filter.options.some((o) => o.value === "");
        const internalValue =
          filter.value === "" && hasEmptyOption
            ? "__ALL__"
            : filter.value;

        const mapToInternal = (value: string) =>
          value === "" && hasEmptyOption ? "__ALL__" : value;
        const mapToExternal = (value: string) =>
          value === "__ALL__" && hasEmptyOption ? "" : value;

        return (
          <Select
            key={filter.id}
            value={internalValue}
            onValueChange={(v) => filter.onChange?.(mapToExternal(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem
                  key={option.value === "" ? "__ALL__" : option.value}
                  value={mapToInternal(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {/* Active Filters Badge */}
      {activeFiltersCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          {activeFiltersCount} active
          <button
            onClick={onClearFilters}
            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
          >
            <Icons.X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* View Options */}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="icon">
          <Icons.List className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon">
          <Icons.Grid className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}





