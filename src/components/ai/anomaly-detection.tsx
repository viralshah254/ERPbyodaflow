"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import type { AnomalyDetection } from "@/types/erp";
import { getMockAnomalies } from "@/lib/mock/anomalies";

interface AnomalyDetectionProps {
  anomalies?: AnomalyDetection[];
  /** Map anomaly to investigate href (e.g. /analytics/inventory). */
  getInvestigateHref?: (a: AnomalyDetection) => string;
}

const getSeverityIcon = (severity: AnomalyDetection["severity"]) => {
  switch (severity) {
    case "CRITICAL":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "WARNING":
      return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    case "INFO":
      return <Info className="h-5 w-5 text-blue-600" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getSeverityBadge = (severity: AnomalyDetection["severity"]) => {
  const variants: Record<AnomalyDetection["severity"], "default" | "destructive" | "secondary"> = {
    CRITICAL: "destructive",
    WARNING: "default",
    INFO: "secondary",
  };
  return <Badge variant={variants[severity]}>{severity}</Badge>;
};

export function AnomalyDetection({ anomalies = getMockAnomalies(), getInvestigateHref }: AnomalyDetectionProps) {
  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Anomaly Detection
        </CardTitle>
        <CardDescription>
          AI-detected anomalies in your business data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {anomalies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No anomalies detected. Everything looks normal!
            </p>
          ) : (
            anomalies.map((anomaly) => {
              const href = getInvestigateHref?.(anomaly);
              return (
                <div
                  key={anomaly.anomalyId}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {getSeverityIcon(anomaly.severity)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{anomaly.title}</h4>
                        {getSeverityBadge(anomaly.severity)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {anomaly.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{anomaly.type}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(anomaly.detectedAt)}</span>
                      </div>
                    </div>
                  </div>
                  {href && (
                    <Button size="sm" variant="outline" className="shrink-0" asChild>
                      <Link href={href}>Investigate</Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

