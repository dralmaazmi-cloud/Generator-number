import {SeededRNG, makeSeed} from './rng.js';
import {FAMILY_REGISTRY, FAMILY_MAP, FAMILY_ALIASES} from './registry.js';
import {finalizeQuestion, validateQuestion, questionSignature, buildBalancedLetterSchedule, LETTERS} from './utils.js';

import {generateSequences} from './families/sequences.js';
import {generateRatios} from './families/ratios.js';
import {generatePercentages} from './families/percentages.js';
import {generateAverages} from './families/averages.js';
import {generateAges} from './families/ages.js';
import {generateSpeed} from './families/speed.js';
import {generateWorkTime} from './families/work_time.js';
import {generateMachines} from './families/machines.js';
import {generateDirectProportion} from './families/direct_proportion.js';
import {generateFractions} from './families/fractions.js';
import {generateUnitRate} from './families/unit_rate.js';
import {generateCombinedRate} from './families/combined_rate.js';
import {generateRelational} from './families/relational.js';
import {generateCalendar} from './families/calendar.js';
import {generateOddOneOut} from './families/odd_one_out.js';
import {generateProfitLoss} from './families/profit_loss.js';

export const ENGINE_VERSION = '1.2.0';

const GENERATORS = {
  sequences: generateSequences,
  ratios: generateRatios,
  percentages: generatePercentages,
  averages: generateAverages,
  ages: generateAges,
  speed: generateSpeed,
  work_time: generateWorkTime,
  machines: generateMachines,
  direct_proportion: generateDirectProportion,
  fractions: generateFractions,
  unit_rate: generateUnitRate,
  combined_rate: generateCombinedRate,
  relational: generateRelational,
  calendar: generateCalendar,
  odd_one_out: generateOddOneOut,
  profit_loss: generateProfitLoss
};

const MIXED_DIFFICULTY_WEIGHTS = [
  {value:'easy', weight:0.25},
  {value:'medium', weight:0.60},
  {value:'hard', weight:0.15}
];

export class NumericalQuestionGeneratorEngine {
  constructor(config = {}) {
    this.version = ENGINE_VERSION;
    this.config = {
      maxGenerationAttempts: config.maxGenerationAttempts ?? 50,
      defaultDifficulty: config.defaultDifficulty ?? 'mixed',
      defaultCount: config.defaultCount ?? 10,
      targetTimeSeconds: config.targetTimeSeconds ?? {easy:35, medium:55, hard:80}
    };
  }

  listFamilies() {
    return FAMILY_REGISTRY.map(x => ({...x}));
  }

  listDifficulties() {
    return [
      {id:'easy', ar:'سهل'},
      {id:'medium', ar:'متوسط'},
      {id:'hard', ar:'صعب'},
      {id:'mixed', ar:'مختلط'},
      {id:'adaptive', ar:'تكيفي'}
    ];
  }

  normalizeFamily(input = 'random') {
    const key = FAMILY_ALIASES[input] || FAMILY_ALIASES[String(input).trim()] || input;
    if (key === 'random') return 'random';
    if (!FAMILY_MAP[key]) throw new Error(`Unknown family: ${input}`);
    return key;
  }

  resolveDifficulty(input, rng, adaptiveStats = null) {
    const d = input || this.config.defaultDifficulty;
    if (['easy','medium','hard'].includes(d)) return d;
    if (d === 'mixed') return rng.weightedPick(MIXED_DIFFICULTY_WEIGHTS);
    if (d === 'adaptive') return this.recommendDifficulty(adaptiveStats || {});
    throw new Error(`Unknown difficulty: ${d}`);
  }

  recommendDifficulty(stats = {}) {
    const attempts = Number(stats.attempts ?? stats.count ?? 0);
    const accuracy = Number(stats.accuracy ?? (attempts ? (stats.correct ?? 0) / attempts : 0.7));
    const streak = Number(stats.correctStreak ?? 0);
    const avgTime = Number(stats.avgTimeSeconds ?? 60);
    const current = stats.currentDifficulty || 'medium';

    if (attempts < 3) return current === 'hard' ? 'medium' : current;
    if ((accuracy >= 0.85 && streak >= 2 && avgTime <= 70) || accuracy >= 0.92) return 'hard';
    if (accuracy < 0.55 || (stats.wrongStreak ?? 0) >= 2) return 'easy';
    return 'medium';
  }

  deriveAdaptiveStats(history = []) {
    const recent = history.slice(-8);
    const attempts = recent.length;
    const correct = recent.filter(x => x.correct === true).length;
    const accuracy = attempts ? correct / attempts : 0.7;
    const timed = recent.map(x => Number(x.timeSeconds)).filter(Number.isFinite);
    const avgTimeSeconds = timed.length ? timed.reduce((a,b)=>a+b,0) / timed.length : 60;
    let correctStreak = 0;
    let wrongStreak = 0;
    for (let i=recent.length-1; i>=0; i--) {
      if (recent[i].correct === true && wrongStreak === 0) correctStreak++;
      else if (recent[i].correct === false && correctStreak === 0) wrongStreak++;
      else break;
    }
    const currentDifficulty = recent.at(-1)?.difficulty || 'medium';
    return {attempts, correct, accuracy, avgTimeSeconds, correctStreak, wrongStreak, currentDifficulty};
  }

  generateAdaptiveQuestion(options = {}) {
    const history = Array.isArray(options.history) ? options.history : [];
    const stats = this.deriveAdaptiveStats(history);
    const difficulty = this.recommendDifficulty(stats);
    return this.generateQuestion({
      ...options,
      difficulty,
      adaptiveStats: stats,
      seed: options.seed ?? makeSeed('NUMADAPT')
    });
  }

  generateQuestion(options = {}) {
    const requestedSeed = options.seed ?? makeSeed('NUMQ');
    const familyInput = this.normalizeFamily(options.family ?? 'random');

    for (let attempt = 0; attempt < this.config.maxGenerationAttempts; attempt++) {
      const seed = attempt === 0 ? requestedSeed : `${requestedSeed}|retry:${attempt}`;
      const rng = new SeededRNG(seed);
      const family = familyInput === 'random' ? rng.pick(FAMILY_REGISTRY).id : familyInput;
      const difficulty = this.resolveDifficulty(options.difficulty ?? this.config.defaultDifficulty, rng.fork('difficulty'), options.adaptiveStats);
      const generator = GENERATORS[family];
      let base;
      try {
        base = generator({difficulty, rng:rng.fork('content'), seed, engineVersion:this.version});
      } catch (err) {
        if (attempt === this.config.maxGenerationAttempts - 1) throw err;
        continue;
      }
      const q = finalizeQuestion(base, rng.fork('options'), options.preferredCorrectLetter ?? null);
      q.metadata.family_description = FAMILY_MAP[family].description;
      q.metadata.blueprint_family = FAMILY_MAP[family].category;
      q.metadata.quality_gate = 'passed';
      const check = validateQuestion(q);
      if (check.valid) return q;
      if (attempt === this.config.maxGenerationAttempts - 1) {
        throw new Error(`Failed to generate valid question: ${check.errors.join(', ')}`);
      }
    }
    throw new Error('Question generation exhausted attempts');
  }

  generatePractice(options = {}) {
    const count = Math.max(1, Math.min(100, Number(options.count ?? this.config.defaultCount)));
    const seed = options.seed ?? makeSeed('NUMSET');
    const rng = new SeededRNG(seed);
    const selectedFamilies = this._resolveFamilyPool(options);
    const familySchedule = this._buildFamilySchedule(selectedFamilies, count, rng.fork('families'));
    const difficultySchedule = this._buildDifficultySchedule(options.difficulty ?? this.config.defaultDifficulty, count, rng.fork('difficulty'), options.adaptiveStats);
    const letterSchedule = options.balanceAnswerLetters === false
      ? Array(count).fill(null)
      : buildBalancedLetterSchedule(count, rng.fork('letters'));

    const questions = [];
    const signatures = new Set();
    const recentTemplates = [];
    for (let i=0;i<count;i++) {
      let q;
      for (let retry=0; retry<30; retry++) {
        q = this.generateQuestion({
          family: familySchedule[i],
          difficulty: difficultySchedule[i],
          seed: `${seed}|Q${i+1}|${retry}`,
          preferredCorrectLetter: letterSchedule[i],
          adaptiveStats: options.adaptiveStats
        });
        const sig = questionSignature(q);
        const templateRecent = recentTemplates.slice(-2).includes(q.generator_id);
        if (!signatures.has(sig) && !templateRecent) {
          signatures.add(sig);
          break;
        }
      }
      questions.push({...q, practice_number:i+1});
      recentTemplates.push(q.generator_id);
    }

    const validation = this.validateBatch(questions);
    return {
      engine_version: this.version,
      seed,
      generated_at: new Date().toISOString(),
      settings: {
        count,
        requested_family: options.family ?? options.families ?? 'random',
        requested_difficulty: options.difficulty ?? this.config.defaultDifficulty,
        balance_answer_letters: options.balanceAnswerLetters !== false
      },
      summary: this.summarizeBatch(questions),
      validation,
      questions
    };
  }

  validateQuestion(q) {
    return validateQuestion(q);
  }

  validateBatch(questions) {
    const errors=[]; const warnings=[];
    const sigs=new Set(); const keyCounts=Object.fromEntries(LETTERS.map(l=>[l,0]));
    const outlierPositions=[];
    questions.forEach((q,i)=>{
      const check=validateQuestion(q);
      if(!check.valid) errors.push({index:i+1, errors:check.errors});
      const sig=questionSignature(q);
      if(sigs.has(sig)) errors.push({index:i+1, errors:['duplicate_question_signature']});
      sigs.add(sig);
      keyCounts[q.correct_option]=(keyCounts[q.correct_option]||0)+1;
      if(q.family==='odd_one_out' && q.metadata?.outlier_display_position) outlierPositions.push(q.metadata.outlier_display_position);
    });
    const counts=Object.values(keyCounts); const spread=Math.max(...counts)-Math.min(...counts);
    if(questions.length>=6 && spread>2) warnings.push('answer_key_distribution_spread_gt_2');
    if(outlierPositions.length>=4 && new Set(outlierPositions).size===1) warnings.push('odd_one_out_position_leak');
    return {valid:errors.length===0, errors, warnings, key_counts:keyCounts, odd_one_out_positions:outlierPositions};
  }

  summarizeBatch(questions) {
    const byFamily={}, byDifficulty={}, byTemplate={};
    for(const q of questions){
      byFamily[q.family]=(byFamily[q.family]||0)+1;
      byDifficulty[q.difficulty]=(byDifficulty[q.difficulty]||0)+1;
      byTemplate[q.generator_id]=(byTemplate[q.generator_id]||0)+1;
    }
    return {by_family:byFamily, by_difficulty:byDifficulty, by_template:byTemplate};
  }

  _resolveFamilyPool(options) {
    if (Array.isArray(options.families) && options.families.length) {
      return [...new Set(options.families.map(f => this.normalizeFamily(f)).filter(f => f !== 'random'))];
    }
    const family = this.normalizeFamily(options.family ?? 'random');
    return family === 'random' ? FAMILY_REGISTRY.map(f=>f.id) : [family];
  }

  _buildFamilySchedule(pool, count, rng) {
    if (pool.length===1) return Array(count).fill(pool[0]);
    const out=[];
    while(out.length<count){
      let round=rng.shuffle(pool);
      if(out.length && round[0]===out.at(-1)) {
        round=[...round.slice(1), round[0]];
      }
      for(const f of round){
        if(out.length>=count) break;
        out.push(f);
      }
    }
    return out;
  }

  _buildDifficultySchedule(difficulty, count, rng, adaptiveStats) {
    if (['easy','medium','hard'].includes(difficulty)) return Array(count).fill(difficulty);
    if (difficulty==='adaptive') return Array.from({length:count},()=>this.recommendDifficulty(adaptiveStats||{}));
    if (difficulty!=='mixed') throw new Error(`Unknown difficulty: ${difficulty}`);

    const easy=Math.round(count*0.25);
    const hard=Math.round(count*0.15);
    const medium=count-easy-hard;
    const arr=[...Array(easy).fill('easy'),...Array(medium).fill('medium'),...Array(hard).fill('hard')];
    return rng.shuffle(arr);
  }
}

export {FAMILY_REGISTRY, FAMILY_MAP};
export {validateQuestion} from './utils.js';
export {SeededRNG} from './rng.js';

export default NumericalQuestionGeneratorEngine;
