"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertCircle, TrendingUp, Zap } from "lucide-react";
import type { AISuggestion } from "@/types/erp";

interface SuggestionsProps {
  suggestions?: AISuggestion[];
}

const mockSuggestions: AISuggestion[] = [
  {
    suggestionId: "1",
    type: "OPTIMIZATION",
    title: "Reorder Point Alert",
    description: "Widget B is below reorder level. Consider placing a purchase order.",
    priority: "HIGH",
    actionUrl: "/inventory/stock",
    createdAt: new Date(),
  },
  {
    suggestionId: "2",
    type: "INSIGHT",
    title: "Sales Trend",
    description: "Sales have increased 20% this month compared to last month.",
    priority: "MEDIUM",
    createdAt: new Date(),
  },
  {
    suggestionId: "3",
    type: "ACTION",
    title: "Approve Pending Orders",
    description: "You have 3 purchase orders waiting for approval.",
    priority: "MEDIUM",
    actionUrl: "/purchasing/orders",
    createdAt: new Date(),
  },
];

const getIcon = (type: AISuggestion["type"]) => {
  switch (type) {
    case "OPTIMIZATION":
      return <TrendingUp className="h-4 w-4" />;
    case "INSIGHT":
      return <Lightbulb className="h-4 w-4" />;
    case "ACTION":
      return <Zap className="h-4 w-4" />;
    case "ALERT":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Lightbulb className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: AISuggestion["priority"]) => {
  switch (priority) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "default";
    case "LOW":
      return "secondary";
    default:
      return "secondary";
  }
};

export function Suggestions({ suggestions = mockSuggestions }: SuggestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Suggestions
        </CardTitle>
        <CardDescription>
          Personalized recommendations for your business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.suggestionId}
              className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="mt-0.5">{getIcon(suggestion.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{suggestion.title}</h4>
                  <Badge variant={getPriorityColor(suggestion.priority) as any} className="text-xs">
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {suggestion.description}
                </p>
                {suggestion.actionUrl && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      window.location.href = suggestion.actionUrl!;
                    }}
                  >
                    View Details →
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

