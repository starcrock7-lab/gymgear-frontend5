import type { Metadata } from "next";
import QuizFlow from "@/components/quiz/QuizFlow";

export const metadata: Metadata = {
  title: "Build Your Kit",
  description:
    "Answer a few quick questions about your goal, budget and space, and get three personalized home gym kits from real products.",
  robots: { index: false, follow: true },
};

export default function QuizPage() {
  return <QuizFlow />;
}
