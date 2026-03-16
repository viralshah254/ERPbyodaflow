"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { useCopilotStore } from "@/stores/copilot-store";
import { Sparkles, ArrowRight, BookOpen } from "lucide-react";

export default function TutorialPage() {
  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const handleAskCopilot = (chapterTitle: string, prompt: string) => {
    setContext({ page: chapterTitle, route: "/tutorial" });
    openDrawerWithPrompt(prompt);
  };

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
        <p className="text-sm text-muted-foreground">
          Use the links below to jump to a screen, or click &quot;Ask Copilot&quot; to get an explanation and next steps. You can also use the help strip on any page to open the tutorial for that section.
        </p>
        <div className="grid gap-4">
          {TUTORIAL_CHAPTERS.map((chapter) => (
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
