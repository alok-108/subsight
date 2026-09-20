'use client';

import React from 'react';
import { Card } from '@/components/Card';
import {
  FileText,
  Filter,
  Building2,
  GitBranch,
  Repeat,
  CreditCard,
  LineChart,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const PIPELINE_NODES = [
  {
    icon: FileText,
    title: 'Transaction Data',
    caption: 'Parses statement CSV or PDF tables, normalizes dates, signs, and debits.',
  },
  {
    icon: Filter,
    title: 'Data Cleaning',
    caption: 'Discards unparseable entries, scrubs noise tokens, and dedupes identical transactions.',
  },
  {
    icon: Building2,
    title: 'Merchant Normalization',
    caption: 'Strips city suffixes, matches regex aliases, and maps raw descriptors to canonical brands.',
  },
  {
    icon: GitBranch,
    title: 'Pattern Analysis',
    caption: 'Groups by merchant and clusters amounts using adaptive tolerance (max 20, 5% median).',
  },
  {
    icon: Repeat,
    title: 'Recurring Payment Detection',
    caption: 'Measures delta regularity across weekly, monthly, quarterly, and annual horizons.',
  },
  {
    icon: CreditCard,
    title: 'Subscription Identification',
    caption: 'Synthesizes composite confidence scores (0.0–1.0) and assigns quality bands.',
  },
  {
    icon: LineChart,
    title: 'Financial Insights',
    caption: 'Generates annual burdens, monthly equivalents, and surfaces review candidates.',
  },
];

const SIGNALS = [
  {
    name: 'Merchant Regularity',
    weight: '10%',
    desc: 'Ratio of transaction tokens mapping cleanly to known canonical entities versus raw strings.',
  },
  {
    name: 'Amount Consistency',
    weight: '25%',
    desc: 'Variance across payments in the cluster, with automated price-revision merge for stepped jumps ≤ 25%.',
  },
  {
    name: 'Interval Regularity',
    weight: '35%',
    desc: 'Standard deviation of day deltas relative to the median interval, tolerating single skipped months.',
  },
  {
    name: 'Occurrence Count',
    weight: '20%',
    desc: 'Progressive confidence scaling with observation history (reaches full score at ≥ 6 payments).',
  },
  {
    name: 'Recency Horizon',
    weight: '10%',
    desc: 'Validates that the last payment occurred within 1.6× of the expected cadence before decaying.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
          <Zap className="h-3.5 w-3.5" />
          Algorithmic Architecture
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
          How SUBSIGHT Works
        </h1>
        <p className="text-sm text-muted">
          A completely deterministic, local heuristic engine engineered to uncover recurring commitments without cloud models or bank scraping.
        </p>
      </div>

      {/* Core Equation Rendered as Styled Blocks */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-purple-50/60 via-surface to-surface dark:from-purple-950/20 border-purple-100 dark:border-purple-900/60">
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            The Core Heuristic Equation
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-ink">
          <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-xs">
            Similar Merchant
          </div>
          <span className="text-purple-600 font-bold text-base">+</span>
          <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-xs">
            Similar Amount
          </div>
          <span className="text-purple-600 font-bold text-base">+</span>
          <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-xs">
            Regular Time Interval
          </div>
          <span className="text-purple-600 font-bold text-base">+</span>
          <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-xs">
            Multiple Transactions
          </div>
          <span className="text-purple-600 font-bold text-base">=</span>
          <div className="rounded-xl bg-purple-600 text-white px-4 py-2.5 shadow-md">
            Potential Recurring Payment
          </div>
        </div>
      </Card>

      {/* Vertical Flow Diagram */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-ink">End-to-End Processing Flow</h2>
          <p className="text-xs text-muted mt-1">
            Every step performs deterministic transformations and logs measurable telemetry.
          </p>
        </div>

        <div className="relative pl-6 sm:pl-8 border-l-2 border-purple-200 dark:border-purple-900 space-y-8 max-w-2xl mx-auto">
          {PIPELINE_NODES.map((node, idx) => {
            const Icon = node.icon;
            return (
              <div key={idx} className="relative group">
                {/* Node indicator */}
                <div className="absolute -left-[35px] sm:-left-[43px] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface border-2 border-purple-600 text-purple-600 shadow-sm transition-transform group-hover:scale-110">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="subsight-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink text-sm sm:text-base">{node.title}</h3>
                    <span className="text-[11px] font-mono text-muted">Step {idx + 1}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted leading-relaxed">{node.caption}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signal Weights Breakdown */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink">Detection Signals & Weighting Model</h2>
          <p className="text-xs text-muted mt-1">
            Confidence (0.0 to 1.0) is a weighted linear composite of five deterministic vectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SIGNALS.map((sig, idx) => (
            <div key={idx} className="rounded-xl border border-line bg-canvas p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-ink text-sm">{sig.name}</h4>
                <span className="rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-xs font-bold dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Weight: {sig.weight}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{sig.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Confidence Bands & Probabilistic Caveat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="subsight-card p-5 border-purple-200 dark:border-purple-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-purple-700 dark:text-purple-300">High Confidence</span>
            <span className="text-xs font-bold text-ink">≥ 80%</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Clean intervals, tight amount spread, multiple occurrences, and verified canonical matching.
          </p>
        </div>

        <div className="subsight-card p-5 border-purple-100 dark:border-purple-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-purple-600 dark:text-purple-400">Medium Confidence</span>
            <span className="text-xs font-bold text-ink">62% – 79%</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Consistent cadence with minor amount jitter or fewer recorded historical occurrences.
          </p>
        </div>

        <div className="subsight-card p-5 border-amber-200 dark:border-amber-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-amber-600">Low Confidence</span>
            <span className="text-xs font-bold text-ink">45% – 61%</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Possible recurring payment with higher interval irregularity. Surfaced with a review badge.
          </p>
        </div>
      </div>

      {/* Probabilistic Disclaimer Notice */}
      <div className="rounded-2xl border border-line bg-surface p-6 flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs text-muted space-y-2 leading-relaxed">
          <h4 className="font-bold text-sm text-ink">Probabilistic Nature of Detection</h4>
          <p>
            Detection is probabilistic. Raw statement narration varies widely across banks, merchants, and aggregators. SUBSIGHT never asserts that a detected charge is definitively an intentional subscription or that you have forgotten it.
          </p>
          <p>
            Low-confidence and long-tenure results are always surfaced for your review. You maintain full control to confirm, ignore, or mark any detected candidate as &ldquo;Not a subscription&rdquo; at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
