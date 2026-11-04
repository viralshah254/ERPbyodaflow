"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, Search, Sparkles, X } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GuideLearningSummary } from "./GuideLearningSummary";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { useFilteredTutorialChapters } from "@/lib/tutorial/filter-by-access";
import { askGaiaAboutGuide, searchTutorialArticles, tutorialArticles, tutorialGuideHref, TUTORIAL_REVISION, type TutorialArticle } from "@/lib/tutorial/knowledge";
import { toast } from "sonner";

const popular = ["production plan", "customer statement", "purchase order", "stock count", "credit note", "roles"];
function GuideCard({ article }: { article: TutorialArticle }) {
  return <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{article.chapterTitle}</span><Badge variant="outline" className="text-xs font-normal">Interactive help</Badge></div>
    <Link href={tutorialGuideHref(article)} className="mt-2 text-base font-semibold hover:text-primary hover:underline">{article.label}</Link>
    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{article.guideSummary}</p>
    <div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm"><Link href={`${article.href}?learn=1`}>Open and learn<ArrowRight className="ml-2 h-3.5 w-3.5" /></Link></Button><Button asChild size="sm" variant="outline"><Link href={tutorialGuideHref(article)}>Read guide<ArrowRight className="ml-2 h-3.5 w-3.5" /></Link></Button><Button size="sm" variant="ghost" onClick={() => askGaiaAboutGuide(article)} aria-label={`Ask Gaia about ${article.label}`}><Sparkles className="mr-1.5 h-3.5 w-3.5" />Ask Gaia</Button></div>
  </article>;
}

export function TutorialLibrary({ chapterId, guideId }: { chapterId?: string; guideId?: string }) {
  const chapters = useFilteredTutorialChapters(TUTORIAL_CHAPTERS);
  const [query, setQuery] = React.useState("");
  const [module, setModule] = React.useState(chapterId ?? "all");
  const [copied, setCopied] = React.useState(false);
  const [shown, setShown] = React.useState(24);
  React.useEffect(() => setShown(24), [query, module]);
  const articles = tutorialArticles(chapters);
  const chapter = chapters.find((item) => item.id === chapterId);
  const article = articles.find((item) => item.chapterId === chapterId && item.key === guideId);
  const scope = articles.filter((item) => module === "all" || item.chapterId === module);
  const results = searchTutorialArticles(scope, query, scope.length);
  const related = article ? searchTutorialArticles(articles.filter((item) => item.href !== article.href), article.label, 3) : [];
  async function copyGuide() {
    if (!article) return;
    try { await navigator.clipboard.writeText(new URL(tutorialGuideHref(article), window.location.origin).toString()); setCopied(true); }
    catch { toast.error("Could not copy the guide link. Copy the page address instead."); }
  }
  return <PageShell><PageHeader title={article?.label ?? (guideId ? "Guide unavailable" : chapter?.title ?? "ERP help centre")} description={article ? "Step-by-step guidance with links to the actual ERP screens." : "Find out how to do your work, follow a workflow, or ask Gaia to explain."} breadcrumbs={[{ label: "Help centre", href: "/tutorial" }, ...(chapterId ? [{ label: chapter?.title ?? "Module", href: `/tutorial/${chapterId}` }] : []), ...(article ? [{ label: article.label }] : [])]} sticky />
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 pb-12 sm:p-6">
      {guideId ? article ? <>
        <div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost" size="sm"><Link href={`/tutorial/${article.chapterId}`}><ArrowLeft className="mr-2 h-4 w-4" />{article.chapterTitle}</Link></Button><Badge variant="outline">{article.guideSteps?.length ?? 0} steps</Badge><span className="text-xs text-muted-foreground">{TUTORIAL_REVISION}</span></div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8"><p className="text-base leading-relaxed text-muted-foreground">{article.guideSummary}</p><h2 className="mb-5 mt-7 text-lg font-semibold">How to do it</h2><ol className="space-y-5">{article.guideSteps?.map((step, index) => <li key={index} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span><p className="pt-0.5 text-sm leading-relaxed">{step}</p></li>)}</ol>{Boolean(article.guideTips?.length) && <div className="mt-7 rounded-xl border bg-muted/30 p-4"><h2 className="mb-2 text-sm font-semibold">Before you continue</h2><ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">{article.guideTips!.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>}</article>
          <aside className="space-y-4 lg:sticky lg:top-24"><section className="space-y-3 rounded-2xl border bg-primary/5 p-5"><h2 className="font-semibold">Put the guide into practice</h2><Button asChild className="w-full"><Link href={article.href}>Open {article.label}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button variant="outline" className="w-full" onClick={() => askGaiaAboutGuide(article)}><Sparkles className="mr-2 h-4 w-4" />Explain with Gaia</Button><Button variant="ghost" className="w-full" onClick={() => void copyGuide()}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? "Guide link copied" : "Copy guide link"}</Button><p className="text-xs leading-relaxed text-muted-foreground">Guidance does not perform a transaction. Your role, branch and organisation settings control the available actions.</p></section>{article.recommendedNextStep && <section className="rounded-2xl border p-5"><h2 className="mb-2 text-sm font-semibold">Next step</h2><Link className="text-sm text-primary hover:underline" href={article.recommendedNextStep.href}>{article.recommendedNextStep.label} →</Link></section>}<Link href="/tutorial" className="block px-2 text-sm text-primary hover:underline">Search all help articles</Link></aside>
        </div>
        {related.length > 0 && <section><h2 className="mb-4 text-lg font-semibold">Related guides</h2><div className="grid gap-4 md:grid-cols-3">{related.map((item) => <GuideCard key={item.key} article={item} />)}</div></section>}
      </> : <section className="rounded-2xl border p-6"><h2 className="font-semibold">This guide is not available in your current workspace</h2><p className="mt-2 text-sm text-muted-foreground">It may belong to another module, template or role.</p><Button asChild variant="outline" className="mt-4"><Link href="/tutorial">Search available guides</Link></Button></section> : <>
        <GuideLearningSummary allowedHrefs={articles.map(item => item.href)} /><section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-8"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><BookOpen className="h-5 w-5" />Your ERP handbook</div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What would you like to do?</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Search a task, open its ERP screen and learn with the controls you actually use. Guides follow the modules enabled for your role.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input aria-label="Search ERP tutorials" className="h-11 bg-background pl-10 pr-10" placeholder="How do I print a customer statement?" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <Button aria-label="Clear tutorial search" size="icon" variant="ghost" className="absolute right-1 top-1 h-9 w-9" onClick={() => setQuery("")}><X className="h-4 w-4" /></Button>}</div><select aria-label="Filter tutorials by module" className="h-11 rounded-md border bg-background px-3 text-sm" value={module} onChange={(event) => setModule(event.target.value)}><option value="all">All available modules</option>{chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div className="mt-4 flex flex-wrap gap-2">{popular.map((term) => <Button key={term} variant="outline" size="sm" className="h-7 rounded-full bg-background/70 text-xs" onClick={() => { setQuery(term); setModule("all"); }}>{term}</Button>)}</div></section>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{query.trim() ? `Results for “${query}”` : module === "all" ? "Browse guides" : chapters.find((item) => item.id === module)?.title}</h2><p role="status" className="text-sm text-muted-foreground">{results.length} guides · {chapters.length} available modules</p></div>
        {!query.trim() && module === "all" && <nav aria-label="Tutorial modules" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{chapters.map((item) => <Link key={item.id} href={`/tutorial/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm font-medium hover:border-primary/40 hover:bg-muted/30"><span>{item.title}<span className="mt-1 block text-xs font-normal text-muted-foreground">{item.items.length} guides</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</nav>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-tutorial-hint="help-library-guides">{results.slice(0, shown).map((item) => <GuideCard key={`${item.chapterId}:${item.key}`} article={item} />)}</div>
        {shown < results.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setShown((value) => value + 24)}>Show more guides ({results.length - shown} remaining)</Button></div>}
        {!results.length && <div className="rounded-2xl border border-dashed p-8 text-center"><h2 className="font-medium">No matching guides in this scope</h2><p className="mt-2 text-sm text-muted-foreground">Try a shorter phrase such as “supplier statement”, “GRN” or “production”.</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setModule("all"); }}>Browse available guides</Button></div>}
      </>}
    </div>
  </PageShell>;
}
