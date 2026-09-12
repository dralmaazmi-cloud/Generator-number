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
