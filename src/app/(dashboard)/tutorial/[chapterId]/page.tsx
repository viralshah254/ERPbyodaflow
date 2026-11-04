"use client";
import { useParams } from "next/navigation";
import { TutorialLibrary } from "@/components/tutorial/TutorialLibrary";
export default function TutorialChapterPage() { const params = useParams<{ chapterId: string }>(); return <TutorialLibrary key={params.chapterId} chapterId={params.chapterId} />; }
