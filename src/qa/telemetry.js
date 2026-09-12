// RC2-003. One rejection/resampling telemetry architecture, spanning every
// stage at which a candidate can be discarded.
//
// The RC1 analytics recorded two boundaries only — a finalisation throw and a
// pipeline verdict — so the reported 0.19% reject rate omitted every rejection
// below them. The odd-one-out ambiguity sweep alone discarded 135 of 1,256
// draws inside the sampler and none of it appeared anywhere.
//
// Stages, in the order a candidate passes through them:
//
//   proposal        a family sampler was asked for a candidate
//   family_sampler  the sampler discarded its own draw and tried again
//   distractor_filter a proposed distractor was impossible for the domain
//                   (negative, zero, over-precise) and was dropped
//   finalization    option construction failed (no provenance, not enough
//                   distinct distractors)
//   pipeline        the validation pipeline returned reason codes
//   diversity       the session rejected an otherwise valid question as a
//                   duplicate instance or a repeated reasoning pattern
//   exhaustion      the retry budget ran out and nothing was published
//
// Two different things are counted, and conflating them was the first mistake
// this file made:
//
//   DISPOSITION  how a proposal ended. Every proposal ends exactly once, so
//                  proposals = published + samplerFailures
//                            + finalizationFailures + pipelineRejectedCandidates
//
//   WORK         how much was discarded on the way. A sampler may resample
//                internally many times inside a single proposal, so
//                familyResamples is reported per proposal, not as a disposition.

import {REASON} from './reasons.js';

export class GenerationTelemetry {
  constructor() {
    this.events = [];
    this.counts = {
      proposals: 0,
      familyResamples: 0,
      samplerFailures: 0,
      finalizationFailures: 0,
      pipelineRejections: 0,
      pipelineRejectedCandidates: 0,
      diversityRejections: 0,
      sessionCandidates: 0,
      sessionDiscards: 0,
      delivered: 0,
      published: 0,
      exhaustions: 0,
      exhaustedProposals: 0
    };
    this.byReason = {};
    this.byStage = {};
    this.byTemplate = {};
  }

  /**
   * @param {object} e
   * @param {string} e.stage
   * @param {string} [e.reasonCode]
   * @param {string} [e.family]
   * @param {string} [e.templateId]
   * @param {number} [e.attempt]
   * @param {string} [e.seed]
   * @param {boolean} [e.publishedBoundaryReached] did the candidate reach the
   *        point where it could have been published?
   * @param {string} [e.detail] free-text diagnostic; never a control signal.
   */
  record(e) {
    const event = {
      stage: e.stage,
      reasonCode: e.reasonCode ?? null,
      family: e.family ?? null,
      templateId: e.templateId ?? null,
      attempt: e.attempt ?? null,
      seed: e.seed ?? null,
      publishedBoundaryReached: e.publishedBoundaryReached ?? false,
      detail: e.detail ?? null
    };
    this.events.push(event);
    this.byStage[event.stage] = (this.byStage[event.stage] || 0) + 1;
    if (event.reasonCode) this.byReason[event.reasonCode] = (this.byReason[event.reasonCode] || 0) + 1;
    if (event.templateId) {
      const t = this.byTemplate[event.templateId] ??= {proposals: 0, published: 0, rejected: 0};
      if (event.stage === 'proposal') t.proposals++;
      else if (event.stage === 'published') t.published++;
      else t.rejected++;
    }
    return event;
  }

  proposal(meta) { this.counts.proposals++; return this.record({...meta, stage: 'proposal'}); }
  /** Work inside a proposal: the sampler discarded its own draw and retried. */
  familyResample(meta) { this.counts.familyResamples++; return this.record({...meta, stage: 'family_sampler'}); }
  /** A disposition: the sampler gave up and threw, so the proposal ended here. */
  samplerFailure(meta) { this.counts.samplerFailures++; return this.record({...meta, stage: 'sampler_failure'}); }
  finalizationFailure(meta) { this.counts.finalizationFailures++; return this.record({...meta, stage: 'finalization'}); }
  /**
   * One event per reason code, but one candidate may carry several. The
   * reconciliation counts candidates; `pipelineRejections` counts reasons, and
   * conflating them was why the first run of this file did not balance.
   */
  pipelineRejection(meta) { this.counts.pipelineRejections++; return this.record({...meta, stage: 'pipeline', publishedBoundaryReached: true}); }
  pipelineRejectedCandidate() { this.counts.pipelineRejectedCandidates++; }
  diversityRejection(meta) { this.counts.diversityRejections++; return this.record({...meta, stage: 'diversity', publishedBoundaryReached: true}); }
  /**
   * RC2.1-1. A candidate the engine PUBLISHED that the session builder then
   * declined to deliver. This is a real cost — the work was done and thrown
   * away — and it is counted separately from engine-level sampler and
   * finalization cost so neither can hide inside the other.
   */
  sessionDiscard(meta) {
    this.counts.sessionDiscards++;
    return this.record({...meta, stage: 'session_discard', publishedBoundaryReached: true});
  }
  /**
   * A published candidate handed to the session builder. Counted where it is
   * received, so it is an independent witness to the two terms below rather
   * than their sum.
   */
  sessionCandidate() { this.counts.sessionCandidates++; }
  /** A published candidate that actually reached the learner. */
  deliveredToSession(meta) {
    this.counts.delivered++;
    return this.record({...meta, stage: 'delivered', publishedBoundaryReached: true});
  }
  /**
   * A session discard that was later withdrawn: the candidate hit a repetition
   * preference, was kept as the relaxed fallback, and ended up delivered after
   * all. Without this the same candidate would be counted as both discarded and
   * delivered, and the session identity would over-count by exactly the number
   * of relaxed fallbacks used.
   */
  withdrawSessionDiscard(event) {
    if (!event) return;
    this.counts.sessionDiscards--;
    this.byStage.session_discard--;
    if (event.reasonCode) this.byReason[event.reasonCode]--;
    if (event.templateId && this.byTemplate[event.templateId]) this.byTemplate[event.templateId].rejected--;
    const i = this.events.lastIndexOf(event);
    if (i >= 0) this.events.splice(i, 1);
  }
  published(meta) { this.counts.published++; return this.record({...meta, stage: 'published', publishedBoundaryReached: true}); }
  exhaustion(meta) {
    this.counts.exhaustions++;
    return this.record({...meta, stage: 'exhaustion', reasonCode: REASON.RETRY_EXHAUSTED});
  }

  /** Proposals that ended without a published question. */
  noteExhaustedProposals(n) { this.counts.exhaustedProposals += n; }

  /** Every total, plus the reconciliation the report must show. */
  snapshot() {
    const c = this.counts;
    // A proposal ends exactly one way.
    const accountedFor = c.published + c.samplerFailures + c.finalizationFailures
      + c.pipelineRejectedCandidates;
    return {
      ...c,
      reconciliation: {
        proposals: c.proposals,
        accountedFor,
        balanced: c.proposals === accountedFor,
        difference: c.proposals - accountedFor,
        breakdown: {
          published: c.published,
          samplerFailures: c.samplerFailures,
          finalizationFailures: c.finalizationFailures,
          pipelineRejectedCandidates: c.pipelineRejectedCandidates
        }
      },
      // RC2.1-1. The session-level identity, kept separate from the engine-level
      // one above. Engine cost is what it took to publish a candidate; session
      // cost is how many published candidates the session layer then refused.
      // Only sessions contribute here, so a run that never calls
      // generatePractice reports zeroes and still balances.
      // `sessionCandidates` is counted independently, at the moment the session
      // builder receives a published candidate — NOT derived from the two terms
      // it is checked against. An identity computed from its own operands proves
      // nothing; this one can fail, and it must be able to.
      sessionReconciliation: {
        publishedToSessions: c.sessionCandidates,
        delivered: c.delivered,
        sessionDiscards: c.sessionDiscards,
        accountedFor: c.delivered + c.sessionDiscards,
        balanced: c.sessionCandidates === c.delivered + c.sessionDiscards,
        difference: c.sessionCandidates - (c.delivered + c.sessionDiscards),
        note: 'published candidates offered to sessions = delivered + every recorded session-level discard'
      },
      // Work discarded inside proposals, which is not a disposition.
      internalResamplesPerProposal: c.proposals ? Number((c.familyResamples / c.proposals).toFixed(3)) : 0,
      byStage: {...this.byStage},
      byReason: {...this.byReason},
      byTemplate: Object.fromEntries(Object.entries(this.byTemplate).map(([k, v]) => [k, {...v}]))
    };
  }

  reset() {
    this.events = [];
    for (const k of Object.keys(this.counts)) this.counts[k] = 0;
    this.byReason = {}; this.byStage = {}; this.byTemplate = {};
  }
}
