"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { useFilteredTutorialChapters } from "@/lib/tutorial/filter-by-access";
import { useCopilotStore } from "@/stores/copilot-store";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";
import { Sparkles, ArrowRight, BookOpen, Zap, ChevronRight, Search, Clock } from "lucide-react";

const QUICK_START_WORKFLOWS = [
  {
    id: "first-sales-order",
    title: "Create your first sales order",
    description: "Set up products and customers, then create a sales order.",
    steps: [
      { label: "Add products", href: "/master/products" },
      { label: "Add customers", href: "/master/parties" },
      { label: "Create sales order", href: "/docs/sales-order/new" },
    ],
    copilotPrompt: "Walk me through creating my first sales order. What do I need to set up first?",
  },
  {
    id: "first-purchase-order",
    title: "Create your first purchase order",
    description: "Set up suppliers and products, then create a PO.",
    steps: [
      { label: "Add suppliers", href: "/master/parties" },
      { label: "Add products", href: "/master/products" },
      { label: "Create purchase order", href: "/docs/purchase-order/new" },
    ],
    copilotPrompt: "Walk me through creating my first purchase order. What do I need to set up first?",
  },
];

export default function TutorialPage() {
  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const visitedPages = useTutorialProgressStore((s) => s.visitedPages);
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleAskCopilot = (chapterTitle: string, prompt: string) => {
    setContext({ page: chapterTitle, route: "/tutorial" });
    openDrawerWithPrompt(prompt);
  };

  const filteredChapters = useFilteredTutorialChapters(TUTORIAL_CHAPTERS);
  const exploredChapters = filteredChapters.filter((ch) =>
    ch.items.some((item) => {
      const path = item.href.replace(/\/$/, "") || "/";
      return visitedPages[path];
    })
  );
  const totalChapters = filteredChapters.filter((ch) => ch.id !== "help").length;
  const exploredCount = exploredChapters.length;
  const recommendedNext = filteredChapters.find(
    (ch) => ch.id !== "help" && !exploredChapters.some((e) => e.id === ch.id)
  );

  const searchLower = searchQuery.trim().toLowerCase();
  const chaptersToShow = searchLower
    ? filteredChapters.filter(
        (ch) =>
          ch.title.toLowerCase().includes(searchLower) ||
          ch.items.some((it) => it.label.toLowerCase().includes(searchLower))
      )
    : filteredChapters;

  const recentlyVisitedPaths = Object.keys(visitedPages)
    .filter((p) => visitedPages[p])
    .slice(-10)
    .reverse();
  const recentlyVisitedItems = recentlyVisitedPaths.flatMap((path) => {
    for (const ch of filteredChapters) {
      const item = ch.items.find((it) => (it.href.replace(/\/$/, "") || "/") === path);
      if (item) return [{ chapter: ch, item }];
    }
    return [];
  }).slice(0, 6);

  return (
    <PageShell>
      <PageHeader
        title="Product Tutorial"
        description="Learn the ERP by module. Open any screen or ask Copilot for help on a topic."
        breadcrumbs={[{ label: "Tutorial" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Use the links below to jump to a screen, or click &quot;Ask Copilot&quot; to get an explanation and next steps. You can also use the help strip on any page to open the tutorial for that section.
          </p>
          <div className="text-sm text-muted-foreground">
            You&apos;ve explored <span className="font-medium text-foreground">{exploredCount}</span> of{" "}
            <span className="font-medium text-foreground">{totalChapters}</span> modules
          </div>
        </div>

        {recentlyVisitedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recently visited
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentlyVisitedItems.map(({ chapter, item }) => (
                <Button key={item.key} variant="outline" size="sm" asChild>
                  <Link href={item.href}>
                    {item.label} <ArrowRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        {recommendedNext && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommended next</CardTitle>
              <CardDescription>
                Continue learning with {recommendedNext.title}
              </CardDescription>
              <Button variant="outline" size="sm" className="w-fit mt-1" asChild>
                <Link href={`/tutorial/${recommendedNext.id}`}>
                  Open {recommendedNext.title} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
          </Card>
        )}

        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick start workflows
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_START_WORKFLOWS.map((wf) => (
              <Card key={wf.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{wf.title}</CardTitle>
                  <CardDescription className="text-xs">{wf.description}</CardDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {wf.steps.map((step, i) => (
                      <Button key={i} variant="outline" size="sm" asChild>
                        <Link href={step.href}>
                          {step.label} <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Link>
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        setContext({ page: wf.title, route: "/tutorial" });
                        openDrawerWithPrompt(wf.copilotPrompt);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Ask Copilot
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">All modules</h3>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <div className="grid gap-4">
          {chaptersToShow.map((chapter) => (
            <Card key={chapter.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    {chapter.title}
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tutorial/${chapter.id}`}>
                      Open chapter <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <CardDescription>{chapter.description}</CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit mt-1"
                  onClick={() => handleAskCopilot(chapter.title, chapter.copilotPrompt)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ask Copilot about this section
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {chapter.items.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          href={item.href}
                          className="text-primary hover:underline truncate"
                        >
                          {item.label}
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 shrink-0"
                          onClick={() =>
                            handleAskCopilot(
                              item.label,
                              item.copilotPrompt ?? chapter.copilotPrompt
                            )
                          }
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={item.href}>Go to page</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
