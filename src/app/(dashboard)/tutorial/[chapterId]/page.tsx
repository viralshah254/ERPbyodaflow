"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { Sparkles, ArrowRight, BookOpen, ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default function TutorialChapterPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const chapter = TUTORIAL_CHAPTERS.find((ch) => ch.id === chapterId);

  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const copilotEnabled = useCopilotFeatureEnabled();

  if (!chapter) notFound();

  const handleAskCopilot = (label: string, prompt: string) => {
    setContext({ page: label, route: `/tutorial/${chapterId}` });
    openDrawerWithPrompt(prompt);
  };

  return (
    <PageShell>
      <PageHeader
        title={chapter.title}
        description={chapter.description}
        breadcrumbs={[
          { label: "Tutorial", href: "/tutorial" },
          { label: chapter.title },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tutorial" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            All chapters
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              {chapter.title}
            </CardTitle>
            <CardDescription>{chapter.description}</CardDescription>
            {copilotEnabled ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => handleAskCopilot(chapter.title, chapter.copilotPrompt)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Ask Copilot about this section
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {chapter.items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={item.href}
                      className="text-primary hover:underline font-medium"
                    >
                      {item.label}
                    </Link>
                    {copilotEnabled ? (
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
                        title="Ask Copilot"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={item.href}>
                      Go to page <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
