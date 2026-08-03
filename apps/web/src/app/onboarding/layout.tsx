import type { ReactNode } from "react";
import { GradientMesh } from "@/components/brand/gradient-mesh";
import { StepHeader } from "@/components/onboarding/step-header";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <GradientMesh />
      <StepHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10 sm:py-14">
        {children}
      </main>
    </div>
  );
}
