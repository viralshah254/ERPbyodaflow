"use client";
import { useParams } from "next/navigation";
import { TutorialLibrary } from "@/components/tutorial/TutorialLibrary";
export default function TutorialGuidePage() { const params = useParams<{ chapterId: string; guideId: string }>(); return <TutorialLibrary key={`${params.chapterId}:${params.guideId}`} chapterId={params.chapterId} guideId={params.guideId} />; }
