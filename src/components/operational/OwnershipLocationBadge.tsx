"use client";

import { Badge } from "@/components/ui/badge";

export interface OwnershipLocationBadgeProps {
  owner: string;
  location: string;
}

export function OwnershipLocationBadge({ owner, location }: OwnershipLocationBadgeProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{owner}</Badge>
      <Badge variant="outline">{location}</Badge>
    </div>
  );
}

