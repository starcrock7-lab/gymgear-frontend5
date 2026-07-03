import type { Metadata } from "next";
import QuizFlow from "@/components/quiz/QuizFlow";

export const metadata: Metadata = {
  title: "Build Your Kit",
  description:
    "Answer 5 quick questions about your goal, budget, and space. Our AI assembles three personalized gym equipment kits from 250+ real products.",
  robots: { index: false, follow: true },
};

export default function QuizPage() {
  return <QuizFlow />;
}
