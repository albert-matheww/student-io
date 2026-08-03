"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { GradientMesh } from "@/components/brand/gradient-mesh";
import { OAuthButtons } from "@/components/onboarding/oauth-buttons";
import { HeroPreviewCard } from "@/components/marketing/hero-preview-card";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function WelcomePage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <GradientMesh />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Log in</Link>
          </Button>
          <Button asChild className="shadow-soft">
            <Link href="/onboarding/profile">
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 pt-10 pb-24 sm:pt-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.09)}
          className="flex max-w-2xl flex-col items-center text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground glass"
          >
            <Sparkles className="size-3.5 text-brand-amber" />
            Your entire semester, one AI-guided course
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-balance font-serif text-5xl font-medium tracking-tight text-foreground sm:text-6xl"
          >
            Learn Smarter.
            <br />
            <span className="bg-gradient-to-r from-brand-indigo to-brand-electric bg-clip-text text-transparent">
              Remember Forever.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-lg text-balance text-lg leading-relaxed text-muted-foreground"
          >
            Upload your syllabus, lectures, and notes once. Student.io builds a
            personalized course — notes, diagrams, flashcards, quizzes, and an
            AI tutor that never lets you forget.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center gap-4">
            <Button size="lg" asChild className="h-12 px-8 text-base shadow-float">
              <Link href="/onboarding/profile">
                Get Started — it&apos;s free
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px w-10 bg-border" />
              or continue with
              <span className="h-px w-10 bg-border" />
            </div>

            <OAuthButtons />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 w-full"
        >
          <HeroPreviewCard />
        </motion.div>
      </main>
    </div>
  );
}
