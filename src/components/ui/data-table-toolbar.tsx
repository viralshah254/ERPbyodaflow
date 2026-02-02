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
import { FiltersBar } from "@/components/ui/filters-bar";
import { FilterChips, type FilterChip } from "@/components/ui/filter-chips";
import { SavedViewsDropdown, type SavedView } from "@/components/ui/saved-views-dropdown";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export interface DataTableToolbarFilter {
  id: string;
  label: string;
  options: { label: string; value: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: DataTableToolbarFilter[];
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  /** Chips built from current filter state (e.g. status: Approved) */
  filterChips?: FilterChip[];
  onRemoveFilterChip?: (id: string) => void;
  savedViews?: SavedView[];
  currentViewId?: string | null;
  onSelectView?: (id: string) => void;
  onSaveCurrentView?: () => void;
  onDeleteView?: (id: string) => void;
  onExport?: () => void;
  bulkActions?: React.ReactNode;
  /** Extra actions (e.g. Add, Import) */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function DataTableToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  activeFiltersCount = 0,
  onClearFilters,
  filterChips = [],
  onRemoveFilterChip,
  savedViews = [],
  currentViewId,
  onSelectView,
  onSaveCurrentView,
  onDeleteView,
  onExport,
  bulkActions,
  actions,
  className,
  children,
}: DataTableToolbarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <FiltersBar
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          filters={filters.map((f) => ({
            id: f.id,
            label: f.label,
            options: f.options,
            value: f.value,
            onChange: f.onChange,
          }))}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={onClearFilters}
        />
        <SavedViewsDropdown
          views={savedViews}
          currentViewId={currentViewId}
          onSelectView={onSelectView}
          onSaveCurrent={onSaveCurrentView}
          onDeleteView={onDeleteView}
        />
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Icons.Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        )}
        {actions}
      </div>
      {(filterChips.length > 0 || bulkActions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterChips
            chips={filterChips}
            onRemove={onRemoveFilterChip ?? (() => {})}
            onClearAll={onClearFilters}
          />
          {bulkActions}
        </div>
      )}
      {children}
    </div>
  );
}
