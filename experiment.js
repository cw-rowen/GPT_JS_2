// block tablets and phones
if (/Mobi|Android|iPad|iPhone|iPod|Tablet/i.test(navigator.userAgent)) {
  document.body.style.cssText = 'background:#000;display:flex;align-items:center;justify-content:center;height:100vh;margin:0';
  document.body.innerHTML = '<p style="color:white;font-family:sans-serif;font-size:2.2em;text-align:center">이 실험은 데스크탑 또는</br>노트북에서만 참여할 수 있습니다.</p>';
  throw new Error('Mobile/tablet device detected — experiment blocked.');
}

import { core, data, util, visual } from './lib/psychojs-2026.1.3.js';
const { PsychoJS }    = core;
const { TrialHandler } = data;
const { Scheduler }    = util;

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const CFG = {
  bg_color:   'black',
  font:       'NanumGothic',
  text_color: 'white',
  text_bold:  true,

  // PhaseI / Screen 1 layout — source, product, 3 brands
  source_y:            0.42,
  product_y:            0.33,
  brand_row_ys:        [0.14, -0.01, -0.16],
  text_height_source:   0.05,
  text_height_product:  0.045,
  text_height_brand:    0.04,
  brand_wrap:           1.3,

  // PhaseI / Screen 2 — interest question
  question_y:           0.06,
  text_height_question:  0.045,
  question_wrap:         1.3,

  // Likert scale (1–7)
  scale_n:              7,
  circle_radius:        0.045,
  scale_y:              -0.15,
  numbers_y:             -0.265,
  desc_y:                -0.33,
  scale_x_left:          -0.42,
  scale_x_right:          0.42,
  text_height_medium:     0.04,
  text_height_small:      0.035,
  likert_left_label:      '전혀 관심 없다',
  likert_right_label:     '매우 관심 있다',

  // PhaseII — price / carried-forward detail / reveal text / binary choice
  // (source label reuses source_y, "product — brand" line reuses product_y)
  phase2_detail_y:        0.17,   // the PhaseI detail carried forward for this brand
  phase2_text_y:           0.02,  // the PhaseII_UT / PhaseII_HE reveal line
  phase2_price_y:         -0.15,  // bottom-most line: price
  text_height_price:      0.045,
  text_height_body:       0.042,
  body_wrap:              1.3,
  choice_y:               -0.32,
  choice_x_left:          -0.28,
  choice_x_right:          0.28,
  text_height_choice:      0.05,

  // timing
  phase1_screen1_dur:    6.0,
  phase2_reveal_delay:   4.0,
  fix_min:               0.5,
  fix_max:               1.0,

  // randomization
  max_run:               2,     // max consecutive identical sources in the presentation order

  // category exclusion screen
  cat_max_exclude:        2,     // participant may exclude at most 2 categories
  cat_num_final:          5,     // categories kept for the study after exclusion
  cat_title_y:             0.40,
  cat_instr_y:              0.30,
  cat_list_start_y:        0.14,
  cat_row_gap:              0.09,
  cat_warn_y:              -0.40,
  text_height_cat_title:    0.05,
  text_height_cat_row:      0.045,
  text_height_cat_small:    0.035,
  cat_warn_dur:              1.5,   // seconds the "max 2" warning stays visible

  // source-introduction pages (2 pages, 3 sources each)
  intro_label_y:            0.40,
  intro_body_y:              0.0,
  text_height_intro_label:   0.05,
  text_height_intro_body:    0.045,   // larger than the trial body text
  intro_wrap:                1.5,
  intro_min_dur:              4.0,    // min seconds required on each page before continuing
  intro_warn_dur:              1.5,
};

// the 6 endorsement sources
const SOURCE_TYPES = ['EXPERT', 'CONSENSUS', 'PEER', 'SEARCHENGINE', 'CHATGPT', 'ADVERTISEMENT'];

// Korean display label per source.
const SOURCE_LABEL_MAP = {
  EXPERT:        '[전문가]',
  CONSENSUS:     '[다수 의견]',
  PEER:          '[가까운 지인]',
  SEARCHENGINE:  '[검색엔진]',
  CHATGPT:       '[ChatGPT]',
  ADVERTISEMENT: '[광고]',
};

// full description of each source, used on the 2-page intro.
// Page 1 = human/human-mediated sources, Page 2 = algorithmic/commercial sources.
const SOURCE_DESCRIPTIONS = {
  EXPERT:        '이 제품 분야에서 오래 일해 온 전문가입니다. 여러 제품을 직접 검토한 뒤, 자신의 이름을 걸고 그중 나은 것을 골라 알려 줍니다.',
  CONSENSUS:     '이 제품을 실제로 구매한 사람 수백 명의 후기를 모은 것입니다. 가장 많은 사람이 만족했다고 답한 제품을 골라 알려 줍니다.',
  PEER:          '당신과 가깝게 지내는 지인입니다. 직접 써 보았거나 알아본 제품 중에서 당신에게 맞을 것 같은 것을 골라 알려 줍니다.',
  SEARCHENGINE:  '검색 결과에서 상위에 오른 제품을 보여 주는 검색엔진입니다. 순위는 순수하게 알고리즘으로 산출되며, 광고비를 낸 제품이 위로 올라오는 일은 없습니다.',
  CHATGPT:       '질문에 답하는 생성형 AI입니다. 학습한 정보를 바탕으로 조건에 맞는 제품을 골라 알려 줍니다.',
  ADVERTISEMENT: '이 제품을 판매하는 회사가 만든 광고입니다. 자사가 판매하는 제품 중에서 골라 알려 줍니다.',
};

const SOURCE_INTRO_PAGES = [
  { label: '정보 출처 소개 (1/2)', sources: ['EXPERT', 'CONSENSUS', 'PEER'] },
  { label: '정보 출처 소개 (2/2)', sources: ['SEARCHENGINE', 'CHATGPT', 'ADVERTISEMENT'] },
];

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function normStr(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }

// Fisher–Yates shuffle (replaces Python's random.shuffle())
function randomPyShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// true if no run of identical values in seq exceeds maxRun
function isValidRun(seq, maxRun) {
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) { if (++run > maxRun) return false; }
    else run = 1;
  }
  return true;
}

// shuffle a full trial list so that 
// (a) the same SOURCE never appears more than `maxSourceRun` times in a row, and 
// (b) the same PRODUCT never appears twice back-to-back. 
// Retries with a fresh shuffle until both hold.
function constrainedShuffleTrials(rows, maxSourceRun = 2, maxTries = 20000) {
  rows = [...rows];
  for (let attempt = 0; attempt < maxTries; attempt++) {
    randomPyShuffle(rows);
    let ok = true, run = 1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].source === rows[i - 1].source) { if (++run > maxSourceRun) { ok = false; break; } }
      else run = 1;
      if (rows[i].productNameEN === rows[i - 1].productNameEN) { ok = false; break; } // no consecutive same product
    }
    if (ok) return rows;
  }
  console.warn('constrainedShuffleTrials: returning last attempt (could not satisfy constraints)');
  return rows;
}

// all C(n,2) unordered pairs from an array — used to build the 15 source-vs-source comparisons
function allPairs(arr) {
  const pairs = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      pairs.push([arr[i], arr[j]]);
  return pairs;
}

// degree-constrained edge orientation.
// Given a list of edges [u,v] (here: the 15 source-pairs) and a required "heavy" count
// per node, picks one endpoint of each edge as "heavy" (the other becomes "light") so
// that every node's heavy-count exactly matches its target. Retries with a fresh random
// edge order until a valid assignment is found (always exists for our fixed target sums:
// 3 sources get target 3-of-5 / 2-of-5, the other 3 sources get 2-of-5 / 3-of-5, which
// always sums correctly).
function orientEdgesToTargets(edgeList, targetHeavy, maxTries = 20000) {
  // NOTE: edges are processed in a randomized order internally (needed for the
  // greedy-with-retry search below), but the returned array must line up 1:1,
  // by position, with the caller's original `edgeList` — so results are written
  // into an `origIdx`-indexed slot rather than simply pushed in visiting order.
  outer:
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const heavyLeft = { ...targetHeavy };
    const degLeft = {};
    edgeList.forEach(([u, v]) => { degLeft[u] = (degLeft[u] || 0) + 1; degLeft[v] = (degLeft[v] || 0) + 1; });
    const lightLeft = {};
    Object.keys(degLeft).forEach(n => lightLeft[n] = degLeft[n] - heavyLeft[n]);

    const indexed = edgeList.map((edge, origIdx) => ({ edge, origIdx }));
    randomPyShuffle(indexed);
    const result = new Array(edgeList.length);

    for (const { edge: [u, v], origIdx } of indexed) {
      degLeft[u]--; degLeft[v]--;
      const canUHeavy = heavyLeft[u] > 0 && lightLeft[v] > 0;
      const canVHeavy = heavyLeft[v] > 0 && lightLeft[u] > 0;
      let uHeavy;
      if (canUHeavy && canVHeavy) uHeavy = Math.random() < 0.5;
      else if (canUHeavy) uHeavy = true;
      else if (canVHeavy) uHeavy = false;
      else continue outer; // this attempt is infeasible from here — reshuffle and retry

      if (uHeavy) { heavyLeft[u]--; lightLeft[v]--; result[origIdx] = { u, v, heavy: u, light: v }; }
      else        { heavyLeft[v]--; lightLeft[u]--; result[origIdx] = { u, v, heavy: v, light: u }; }
    }
    if (Object.values(heavyLeft).every(x => x === 0)) return result;
  }
  throw new Error('orientEdgesToTargets: could not satisfy constraints');
}

// two-letter brand codes.
// builds every valid A..Z x A..Z code EXCEPT same-letter pairs (AA, BB, ...) and "AI",
// then shuffles once. Codes are handed out from this shared, pre-shuffled pool so that
// no code is ever reused anywhere in the experiment (globally unique)
function buildLetterPool() {
  const letters = [];
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      if (i === j) continue;                                   // no AA, BB, CC, ...
      const code = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
      if (code === 'AI') continue;                             // explicit exclusion
      letters.push(code);
    }
  }
  return randomPyShuffle(letters);
}

// parses a CSV price string like "33,000원" into an integer (33000).
function parseWon(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10);
}

// random price within [low, high], snapped to 1,000 KRW increments.
function randomPriceKRW(low, high) {
  const steps = Math.floor((high - low) / 1000);
  const n = Math.floor(Math.random() * (steps + 1));
  return low + n * 1000;
}

function formatWon(n) { return `${n.toLocaleString('ko-KR')}원`; }

// ─────────────────────────────────────────────
//  TRIAL-DESIGN BUILDER 
// ─────────────────────────────────────────────

// Builds the full 15-pairwise-comparison design from the 15 selected product rows.
// Returns { trialsPhase1, trialsPhase2, sourceTypeMap }.
//  - Every source is paired against every other source exactly once → 15 pairs,
//    one pair per product (15 products), each product shown twice per phase.
//  - Each source therefore appears in 5 trials per phase (30 trials / 6 sources).
//  - Each source is randomly assigned a TYPE, A or B (3 sources each):
//      TYPE A → 8 UT-details / 7 HE-details in Phase 1, 2 PhaseII_UT / 3 PhaseII_HE in Phase 2
//      TYPE B → 7 UT-details / 8 HE-details in Phase 1, 3 PhaseII_UT / 2 PhaseII_HE in Phase 2
//    (8+7 and 7+8 = 15 slots = 5 trials x 3 details, so this is always exact.)
//  - Within a single product's pair, the 6 details (UT_1-3, HE_1-3) always split 2/1
//    between the two sources (one source is "UT-heavy": 2 UT + 1 HE; the other is
//    "HE-heavy": 1 UT + 2 HE) — this guarantees every trial mixes UT and HE

function buildTrials(selectedProductRows, sources) {
  // 1) randomly split the 6 sources into TYPE A (x3) and TYPE B (x3)
  const shuffledSources = randomPyShuffle([...sources]);
  const sourceTypeMap = {};
  shuffledSources.forEach((s, i) => { sourceTypeMap[s] = i < 3 ? 'A' : 'B'; });

  const phase1HeavyTarget = {}; // "UT-heavy" trial count target, per source
  const phase2UTTarget    = {}; // "reveals PhaseII_UT" trial count target, per source
  sources.forEach(s => {
    phase1HeavyTarget[s] = sourceTypeMap[s] === 'A' ? 3 : 2;
    phase2UTTarget[s]    = sourceTypeMap[s] === 'A' ? 2 : 3;
  });

  // 2) 15 source-pairs, each pair randomly assigned to one of the 15 products
  const pairs = allPairs(sources);
  if (pairs.length !== 15) throw new Error(`Expected 15 source pairs, got ${pairs.length}.`);
  const shuffledProducts = randomPyShuffle([...selectedProductRows]);
  if (shuffledProducts.length !== pairs.length)
    throw new Error(`Product count (${shuffledProducts.length}) must equal pair count (${pairs.length}).`);
  const edges = shuffledProducts.map((row, i) => ({ product: row, u: pairs[i][0], v: pairs[i][1] }));

  // 3) decide, per product, which of its 2 sources is "UT-heavy" (Phase 1) and which
  //    "reveals PhaseII_UT" (Phase 2) — these are independent orientations of the same graph
  const edgeList = edges.map(e => [e.u, e.v]);
  const phase1Orientation = orientEdgesToTargets(edgeList, phase1HeavyTarget);
  const phase2Orientation = orientEdgesToTargets(edgeList, phase2UTTarget);

  const letterPool = buildLetterPool();
  let letterCursor = 0;

  const trialsPhase1 = [];
  const trialsPhase2 = [];

  edges.forEach((e, i) => {
    const row   = e.product;
    const price = randomPriceKRW(parseWon(row.low), parseWon(row.high));

    // 6 globally-unique brand letters for this product's 6 details
    const letters = letterPool.slice(letterCursor, letterCursor + 6);
    letterCursor += 6;
    if (letters.length < 6) throw new Error('buildLetterPool ran out of unique brand codes.');
    randomPyShuffle(letters);

    const allDetails = [
      { key: 'UT_1', type: 'UT', text: row.UT_1 },
      { key: 'UT_2', type: 'UT', text: row.UT_2 },
      { key: 'UT_3', type: 'UT', text: row.UT_3 },
      { key: 'HE_1', type: 'HE', text: row.HE_1 },
      { key: 'HE_2', type: 'HE', text: row.HE_2 },
      { key: 'HE_3', type: 'HE', text: row.HE_3 },
    ].map((d, idx) => ({ ...d, brand: letters[idx] })); // pair each detail with a brand

    // split this product's 6 details between its 2 sources — the
    // "heavy" source gets 2 UT + 1 HE, the "light" source gets 1 UT + 2 HE, so both
    // always show a mix of UT and HE, and never the same detail twice.
    const p1 = phase1Orientation[i];
    const utPool = randomPyShuffle(allDetails.filter(d => d.type === 'UT'));
    const hePool = randomPyShuffle(allDetails.filter(d => d.type === 'HE'));
    const heavySet = [utPool[0], utPool[1], hePool[0]];
    const lightSet = [utPool[2], hePool[1], hePool[2]];

    const detailSetBySource = {};
    detailSetBySource[p1.heavy] = randomPyShuffle([...heavySet]);
    detailSetBySource[p1.light] = randomPyShuffle([...lightSet]);

    // which of this product's 2 sources reveals PhaseII_UT vs PhaseII_HE
    const p2 = phase2Orientation[i];

    [e.u, e.v].forEach(source => {
      const detailSet   = detailSetBySource[source];                              // 3 entries shown in PhaseI
      // PhaseII carries forward ONE of the 3 brand/detail pairs this
      // source showed in PhaseI for this product (chosen at random).
      const p2Pick       = detailSet[Math.floor(Math.random() * detailSet.length)];
      const revealType   = (p2.heavy === source) ? 'UT' : 'HE';
      const revealText    = revealType === 'UT' ? row.PhaseII_UT : row.PhaseII_HE;

      const trialCore = {
        productNameEN:     row.product_EN,
        productNameKR:     row.product_KR,
        category:          row.category,
        price,
        source,
        sourceType:        sourceTypeMap[source],
        pairedWith:        (source === e.u) ? e.v : e.u,
        mixType:           (p1.heavy === source) ? 'UT_heavy' : 'HE_heavy',
        phase1Details:      detailSet,          // [{key,type,text,brand}, x3] — shown in Phase 1
        phase2Brand:        p2Pick.brand,
        phase2DetailKey:    p2Pick.key,
        phase2DetailText:   p2Pick.text,
        phase2RevealType:   revealType,
        phase2RevealText:   revealText,
      };
      trialsPhase1.push({ ...trialCore });
      trialsPhase2.push({ ...trialCore });
    });
  });

  return { trialsPhase1, trialsPhase2, sourceTypeMap };
}

// ─────────────────────────────────────────────
//  PSYCHOJS BOOTSTRAP
// ─────────────────────────────────────────────

const psychoJS = new PsychoJS({});

const expInfo = {
  '참여자 ID': '',
};

psychoJS.openWindow({
  fullscr:         true,
  color:           new util.Color(CFG.bg_color),
  units:           'height',
  waitBlanking:    true,
  backgroundImage: '',
  backgroundFit:   'none',
});

psychoJS.schedule(psychoJS.gui.DlgFromDict({
  dictionary: expInfo,
  title:      '연구 참여 정보 입력',
}));

const flowScheduler         = new Scheduler(psychoJS);
const dialogCancelScheduler = new Scheduler(psychoJS);

psychoJS.scheduleCondition(
  () => {
    if (!psychoJS.gui.dialogComponent) return false;
    if (!psychoJS.gui.dialogComponent.button) return false;
    return psychoJS.gui.dialogComponent.button === 'OK';
  },
  flowScheduler,
  dialogCancelScheduler,
);

// block OK submission until all fields are filled
function patchDialogOKButton() {
  const okBtn = document.getElementById('dialogOK');
  if (!okBtn) { requestAnimationFrame(patchDialogOKButton); return; }

  const original = okBtn.onclick;
  okBtn.onclick = function (e) {
    const inputs = document.querySelectorAll('#experiment-dialog input[type="text"]');
    const allFilled = [...inputs].every(inp => inp.value.trim() !== '');
    if (!allFilled) {
      let warn = document.getElementById('_fillWarning');
      if (!warn) {
        warn = document.createElement('p');
        warn.id = '_fillWarning';
        warn.style.cssText = 'color:red;margin:4px 0 0;text-align:center;font-size:0.9em';
        okBtn.parentElement.insertBefore(warn, okBtn);
      }
      warn.textContent = '모든 항목을 입력해 주세요.';
      return;
    }
    original.call(this, e);
  };
}
requestAnimationFrame(patchDialogOKButton);

// queue all routines in order
flowScheduler.add(updateInfo);
flowScheduler.add(experimentInit);

// category exclusion happens as the very first interactive step,
// immediately after the ID dialog closes (see comment on categorySelectRoutineBegin)
flowScheduler.add(categorySelectRoutineBegin());
flowScheduler.add(categorySelectRoutineEachFrame());
flowScheduler.add(categorySelectRoutineEnd());

flowScheduler.add(finalizeTrials);
flowScheduler.add(logSetupInfo);

flowScheduler.add(instructionsRoutineBegin());
flowScheduler.add(instructionsRoutineEachFrame());
flowScheduler.add(instructionsRoutineEnd());

// 2-page source introduction (must be read before any trials)
flowScheduler.add(sourceIntroRoutineBegin());
flowScheduler.add(sourceIntroRoutineEachFrame());
flowScheduler.add(sourceIntroRoutineEnd());

const phase1LoopScheduler = new Scheduler(psychoJS);
flowScheduler.add(phase1LoopBegin(phase1LoopScheduler));
flowScheduler.add(phase1LoopScheduler);
flowScheduler.add(phase1LoopEnd());

flowScheduler.add(phase2IntroRoutineBegin());
flowScheduler.add(phase2IntroRoutineEachFrame());
flowScheduler.add(phase2IntroRoutineEnd());

const phase2LoopScheduler = new Scheduler(psychoJS);
flowScheduler.add(phase2LoopBegin(phase2LoopScheduler));
flowScheduler.add(phase2LoopScheduler);
flowScheduler.add(phase2LoopEnd());

flowScheduler.add(finalRoutineBegin());
flowScheduler.add(finalRoutineEachFrame());
flowScheduler.add(finalRoutineEnd());

flowScheduler.add(quitPsychoJS, '', true);
dialogCancelScheduler.add(quitPsychoJS, '', false);

psychoJS.start({
  expName: 'Biphasic Endorsement / Purchase-Intent Study',
  expInfo,
  resources: [
    { name: 'product_list.csv', path: 'product_list.csv' },
  ],
});

psychoJS.experimentLogger.setLevel(core.Logger.ServerLevel.EXP);

// ─────────────────────────────────────────────
//  GLOBAL STATE
// ─────────────────────────────────────────────

let globalClock, routineTimer, frameDur;
let introClock, introKey;
let phase2IntroClock, phase2IntroKey;
let finalClock, finalStim;

// LOCKOUT / PAUSE (ported from REFERENCE.js): if the participant leaves fullscreen
// (Esc, Alt-Tab, etc.) mid-experiment, everything is hidden and a pause screen asks
// Y (quit) / N (resume + re-enter fullscreen). See pauseStim / _escPending below.
let pauseStim;
let _escPending = false;

// shared stimuli
let sourceLabelStim, productLabelStim, brandStims;      // PhaseI screen 1 / shared header
let questionStim;                                       // PhaseI screen 2
let priceStim, detailTextStim, bodyTextStim;              // PhaseII (bodyTextStim = PhaseII_UT/HE reveal line)
let choiceLeftStim, choiceRightStim;                      // PhaseII binary choice
let fixStim;                                              // fixation cross
let scale_circles = [], scale_numbers = [];
let scale_leftDesc = null, scale_rightDesc = null;
let instructionsStim, phase2IntroStim;

// category exclusion screen stimuli
let catTitleStim, catInstrStim, catRowStims = [], catWarnStim;
let allProductRows = [], categoryList = [];
let excludedCategories = [], chosenCategories = [], selectedProductRows = [];
let _catClock, _catSelected, _catWarnVisible, _catWarnStartT;

// source-introduction screen stimuli
let introPageLabelStim, introPageBodyStim, introPageHintStim, introPageWarnStim, introPageStartingStim;
let _introClock, _introCurrentPage, _introVisited, _introAccumTime, _introPageEnteredAt;
let _introWarnVisible, _introWarnStartT, _introStartingT;

let _colRed, _colClear, _colWhite;

let trialsPhase1 = [], trialsPhase2 = [], phase1Order = [], phase2Order = [];
let sourceTypeMap = {};
let trialIndex = 0;

// per-trial state (PhaseI)
let _p1Clock, _p1Phase, _p1PhaseStartT, _p1PhaseDuration;
let _p1Selected, _p1ResponseGiven, _p1StartT;
let _p1DisplayOrder; // the 3 (brand,detail) rows in their on-screen order — kept so a
                      // LOCKOUT/PAUSE resume can redraw the exact same trial as before

// per-trial state (PhaseII)
let _p2Clock, _p2Phase, _p2PhaseStartT, _p2PhaseDuration;
let _p2Selected, _p2ChoiceGiven, _p2StartT;

// ─────────────────────────────────────────────
//  updateInfo
// ─────────────────────────────────────────────

async function updateInfo() {
  const englishData = { 'ParticipantID': expInfo['참여자 ID'] };
  Object.assign(expInfo, englishData);
  delete expInfo['참여자 ID'];

  expInfo['date']      = util.MonotonicClock.getDateStr();
  expInfo['frameRate'] = psychoJS.window.getActualFrameRate();
  frameDur = (typeof expInfo['frameRate'] !== 'undefined')
    ? 1.0 / Math.round(expInfo['frameRate']) : 1.0 / 60.0;
  util.addInfoFromUrl(expInfo);

  psychoJS.experiment.dataFileName = `data/${expInfo['ParticipantID']}_${expInfo['date']}`;
  return Scheduler.Event.NEXT;
}

// ─────────────────────────────────────────────
//  experimentInit
//  NOTE: this now only builds stimuli and loads the raw product CSV. Trial
//  construction happens later in finalizeTrials(), once the
//  participant has completed the category-exclusion screen.
// ─────────────────────────────────────────────

async function experimentInit() {
  const win = psychoJS.window;

  document.body.style.cursor = 'none';
  psychoJS.window._renderer.view.style.cursor = 'none';

  globalClock  = new util.Clock();
  routineTimer = new util.CountdownTimer();
  introClock   = new util.Clock();
  phase2IntroClock = new util.Clock();
  _p1Clock     = new util.Clock();
  _p2Clock     = new util.Clock();
  _catClock    = new util.Clock();
  _introClock  = new util.Clock();

  _colRed   = new util.Color('red');
  _colClear = new util.Color(CFG.bg_color);
  _colWhite = new util.Color(CFG.text_color);

  // ── shared header stimuli (source label + product name / product—brand) ──
  sourceLabelStim = new visual.TextStim({
    win, name: 'sourceLabelStim', text: '',
    pos: [0, CFG.source_y], height: CFG.text_height_source,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });
  productLabelStim = new visual.TextStim({
    win, name: 'productLabelStim', text: '',
    pos: [0, CFG.product_y], height: CFG.text_height_product,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });

  // ── Phase I Screen 1: three brand rows ──
  // every source (including ADVERTISEMENT) always shows exactly 3 rows 
  brandStims = CFG.brand_row_ys.map((y, i) => new visual.TextStim({
    win, name: `brandStim_${i}`, text: '',
    pos: [0, y], height: CFG.text_height_brand,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
    wrapWidth: CFG.brand_wrap,
  }));

  // ── PhaseI Screen 2: interest question ──
  questionStim = new visual.TextStim({
    win, name: 'questionStim', text: '이 중에 구매할만한 제품이 있나요?',
    pos: [0, CFG.question_y], height: CFG.text_height_question,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
    wrapWidth: CFG.question_wrap,
  });

  // ── Likert scale (1–7) ──
  const xs = Array.from({ length: CFG.scale_n },
    (_, i) => CFG.scale_x_left + i * (CFG.scale_x_right - CFG.scale_x_left) / (CFG.scale_n - 1));

  for (let i = 0; i < CFG.scale_n; i++) {
    scale_circles.push(new visual.Polygon({
      win, name: `circle_${i}`, edges: 64, radius: CFG.circle_radius,
      lineColor: _colWhite, lineWidth: 4, fillColor: _colClear,
      pos: [xs[i], CFG.scale_y], units: 'height', depth: -1,
    }));
    scale_numbers.push(new visual.TextStim({
      win, name: `num_${i}`, text: String(i + 1),
      pos: [xs[i], CFG.numbers_y], height: CFG.text_height_medium,
      color: _colWhite, font: CFG.font, bold: CFG.text_bold,
      alignText: 'center', units: 'height', depth: -1,
    }));
  }
  scale_leftDesc = new visual.TextStim({
    win, name: 'scale_leftDesc', text: CFG.likert_left_label,
    pos: [CFG.scale_x_left - 2 * CFG.circle_radius, CFG.desc_y],
    height: CFG.text_height_small, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'left', anchorHoriz: 'left', units: 'height', wrapWidth: 0.4, depth: -1,
  });
  scale_rightDesc = new visual.TextStim({
    win, name: 'scale_rightDesc', text: CFG.likert_right_label,
    pos: [CFG.scale_x_right + 2 * CFG.circle_radius, CFG.desc_y],
    height: CFG.text_height_small, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'right', anchorHoriz: 'right', units: 'height', wrapWidth: 0.4, depth: -1,
  });

  // ── PhaseII: price / carried-forward detail / reveal text / binary choice ──
  priceStim = new visual.TextStim({
    win, name: 'priceStim', text: '',
    pos: [0, CFG.phase2_price_y], height: CFG.text_height_price,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });
  // the single PhaseI detail (UT_x / HE_x text) carried forward for
  // this exact endorser x product x brand-letter pairing.
  detailTextStim = new visual.TextStim({
    win, name: 'detailTextStim', text: '',
    pos: [0, CFG.phase2_detail_y], height: CFG.text_height_body,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
    wrapWidth: CFG.body_wrap,
  });
  // the PhaseII_UT / PhaseII_HE reveal line.
  bodyTextStim = new visual.TextStim({
    win, name: 'bodyTextStim', text: '',
    pos: [0, CFG.phase2_text_y], height: CFG.text_height_body,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
    wrapWidth: CFG.body_wrap,
  });
  choiceLeftStim = new visual.TextStim({
    win, name: 'choiceLeftStim', text: '구매한다',
    pos: [CFG.choice_x_left, CFG.choice_y], height: CFG.text_height_choice,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });
  choiceRightStim = new visual.TextStim({
    win, name: 'choiceRightStim', text: '구매하지 않는다',
    pos: [CFG.choice_x_right, CFG.choice_y], height: CFG.text_height_choice,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });

  // ── fixation cross ──
  fixStim = new visual.TextStim({
    win, name: 'fixStim', text: '+',
    pos: [0, 0], height: 0.08, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });

  // ── LOCKOUT / PAUSE screen ──
    pauseStim = new visual.TextStim({
    win, name: 'pauseStim',
    text: '실험을 종료하시겠습니까?\n종료 시 재시작 또는 재참여가 불가합니다.\n\nY = 종료\nN = 계속',
    pos: [0, 0], height: 0.055, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
    depth: -10, // always draws in front of every other stim
  });

  // Fires whenever the browser leaves fullscreen (Esc key, Alt-Tab out, etc.) at any
  // point in the experiment. Hides whatever routine is currently on screen and shows
  // the pause prompt; each routine's EachFrame function is responsible for handling
  // the Y/N response and, on resume, redrawing its own current state (see _escPending
  // checks below).
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement &&
        !_escPending &&
        psychoJS.experiment &&
        !psychoJS.experiment.experimentEnded) {
      _escPending = true;
      allRoutinesStimOff();
      pauseStim.setAutoDraw(true);
    }
  });

  // ── instructions screens ──
  instructionsStim = new visual.TextStim({
    win, name: 'instructionsStim',
    text: '이 실험에서는 여러 제품에 대한 정보를 보게 됩니다.\n' +
          '화면의 안내에 따라 응답해 주세요.\n\n' +
          '준비되면 스페이스바를 눌러 시작하세요.',
    pos: [0, 0], height: 0.05, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });
  phase2IntroStim = new visual.TextStim({
    win, name: 'phase2IntroStim',
    text: '이제 다음 파트가 시작됩니다.\n' +
          '이번에는 가격 정보와 제품 설명을 보고 구매 의사를 응답하시게 됩니다.\n\n' +
          '스페이스바를 눌러 계속하세요.',
    pos: [0, 0], height: 0.05, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });

  finalStim = new visual.TextStim({
    win, name: 'finalStim', text: '실험이 종료되었습니다.\n참여해 주셔서 감사합니다.',
    pos: [0, 0], height: 0.06, color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });

  // ── category-exclusion screen stimuli ──
  catTitleStim = new visual.TextStim({
    win, name: 'catTitleStim',
    text: `관심 없는 카테고리를 선택하세요 (최대 ${CFG.cat_max_exclude}개)`,
    pos: [0, CFG.cat_title_y], height: CFG.text_height_cat_title,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });
  catInstrStim = new visual.TextStim({
    win, name: 'catInstrStim',
    text: '숫자 키를 눌러 선택 / 해제하세요. 아무것도 선택하지 않아도 됩니다.\n완료되면 엔터(Enter) 또는 스페이스바를 누르세요.',
    pos: [0, CFG.cat_instr_y], height: CFG.text_height_cat_small,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });
  catWarnStim = new visual.TextStim({
    win, name: 'catWarnStim',
    text: `최대 ${CFG.cat_max_exclude}개까지만 선택할 수 있습니다.`,
    pos: [0, CFG.cat_warn_y], height: CFG.text_height_cat_small,
    color: new util.Color('yellow'), font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });
  // catRowStims (one per category) are built after the CSV is loaded below, since the
  // category list and its length are not known until then.

  // ── source-introduction screen stimuli ──
  introPageLabelStim = new visual.TextStim({
    win, name: 'introPageLabelStim', text: '',
    pos: [0, CFG.intro_label_y], height: CFG.text_height_intro_label,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });
  introPageBodyStim = new visual.TextStim({
    win, name: 'introPageBodyStim', text: '',
    pos: [0, CFG.intro_body_y], height: CFG.text_height_intro_body,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: CFG.intro_wrap,
  });
  introPageHintStim = new visual.TextStim({
    win, name: 'introPageHintStim',
    text: '← → 로 페이지를 넘기고, 두 페이지를 모두 읽은 후 스페이스바를 누르세요.',
    pos: [0, -0.42], height: CFG.text_height_cat_small,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });
  introPageWarnStim = new visual.TextStim({
    win, name: 'introPageWarnStim', text: '내용을 조금 더 읽어주세요!',
    pos: [0, -0.34], height: CFG.text_height_cat_title,
    color: new util.Color('yellow'), font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });
  introPageStartingStim = new visual.TextStim({
    win, name: 'introPageStartingStim', text: '잠시 후 시작됩니다.',
    pos: [0, -0.34], height: CFG.text_height_cat_title,
    color: new util.Color('lime'), font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  });

  // ── load product_list.csv ──
  const _productHandler = new TrialHandler({
    psychoJS, nReps: 1,
    method: TrialHandler.Method.SEQUENTIAL,
    trialList: 'product_list.csv',
    name: '_productLoader',
  });
  allProductRows = _productHandler.trialList;
  if (!allProductRows || allProductRows.length === 0)
    throw new Error('product_list.csv loaded 0 rows.');

  // product_list.csv validate
  const reqCols = ['product_EN', 'product_KR', 'category', 'low', 'high',
                    'UT_1', 'UT_2', 'UT_3', 'PhaseII_UT', 'HE_1', 'HE_2', 'HE_3', 'PhaseII_HE'];
  const missingCols = reqCols.filter(c => !(c in allProductRows[0]));
  if (missingCols.length) throw new Error(`product_list.csv missing: ${missingCols}`);

  // normalize price strings ("33,000원" -> 33000) once, up front
  allProductRows.forEach(r => { r.low = parseWon(r.low); r.high = parseWon(r.high); });

  // unique categories, in first-appearance order (drives both the exclusion screen
  // and the later random 5-of-N category selection in finalizeTrials)
  categoryList = [];
  allProductRows.forEach(r => { if (!categoryList.includes(r.category)) categoryList.push(r.category); });
  if (categoryList.length < CFG.cat_num_final)
    throw new Error(`Need at least ${CFG.cat_num_final} categories in product_list.csv, found ${categoryList.length}.`);
  // the exclusion screen maps categories to single number keys ('1'..'9'), so it
  // supports at most 9 categories
  if (categoryList.length > 9)
    throw new Error(`Category-exclusion screen supports at most 9 categories, found ${categoryList.length}.`);

  // build the category-exclusion row stimuli now that we know how many categories exist
  catRowStims = categoryList.map((cat, i) => new visual.TextStim({
    win, name: `catRowStim_${i}`,
    text: `${i + 1}. ${cat}`,
    pos: [0, CFG.cat_list_start_y - i * CFG.cat_row_gap],
    height: CFG.text_height_cat_row,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height', wrapWidth: 1.4,
  }));

  return Scheduler.Event.NEXT;
}

// ─────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────

function allStimOff() {
  [sourceLabelStim, productLabelStim, ...brandStims, questionStim,
   priceStim, detailTextStim, bodyTextStim, choiceLeftStim, choiceRightStim, fixStim]
    .forEach(s => s.setAutoDraw(false));
  scaleSetAutoDraw(false);
}

function catStimOff() {
  catTitleStim.setAutoDraw(false);
  catInstrStim.setAutoDraw(false);
  catRowStims.forEach(s => s.setAutoDraw(false));
  catWarnStim.setAutoDraw(false);
}

function introPageStimOff() {
  introPageLabelStim.setAutoDraw(false);
  introPageBodyStim.setAutoDraw(false);
  introPageHintStim.setAutoDraw(false);
  introPageWarnStim.setAutoDraw(false);
  introPageStartingStim.setAutoDraw(false);
}

// LOCKOUT / PAUSE: turns off every stim from every routine, since the fullscreen-exit
// listener can fire at any point in the experiment and doesn't know which routine is
// currently active.
function allRoutinesStimOff() {
  allStimOff();
  catStimOff();
  introPageStimOff();
  instructionsStim.setAutoDraw(false);
  phase2IntroStim.setAutoDraw(false);
  finalStim.setAutoDraw(false);
}

function scaleSetAutoDraw(val) {
  scale_circles.forEach(c => c.setAutoDraw(val));
  scale_numbers.forEach(n => n.setAutoDraw(val));
  scale_leftDesc.setAutoDraw(val);
  scale_rightDesc.setAutoDraw(val);
}

function updateCircleFills(selectedIdx) {
  scale_circles.forEach((c, i) => c.setFillColor(i === selectedIdx ? _colRed : _colClear));
}

function updateChoiceHighlight(selectedIdx) {
  choiceLeftStim.setColor(selectedIdx === 0 ? _colRed : _colWhite);
  choiceRightStim.setColor(selectedIdx === 1 ? _colRed : _colWhite);
}

// ─────────────────────────────────────────────
//  CATEGORY EXCLUSION ROUTINE
// ─────────────────────────────────────────────
// Shown right after the participant ID dialog closes.

function categorySelectRoutineBegin() {
  return async function () {
    _catClock.reset();
    _catSelected     = new Set();
    _catWarnVisible  = false;
    _catWarnStartT   = 0;

    catTitleStim.setAutoDraw(true);
    catInstrStim.setAutoDraw(true);
    catRowStims.forEach(s => s.setAutoDraw(true));
    updateCatRowColors();

    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    return Scheduler.Event.NEXT;
  };
}

function categorySelectRoutineEachFrame() {
  return async function () {
    const t = _catClock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume)
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          catTitleStim.setAutoDraw(true);
          catInstrStim.setAutoDraw(true);
          catRowStims.forEach(s => s.setAutoDraw(true));
          updateCatRowColors();
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    // number keys '1'..'9', one per category 
    const digitKeys = categoryList.map((_, i) => String(i + 1));
    const pressed = psychoJS.eventManager.getKeys({ keyList: [...digitKeys, 'return', 'space'] });

    for (const k of pressed) {
      const name = k.name || k;

      if (name === 'return' || name === 'space') {
        excludedCategories = [..._catSelected].map(i => categoryList[i]);
        catStimOff();
        return Scheduler.Event.NEXT;
      }

      const idx = digitKeys.indexOf(name);
      if (idx === -1) continue;

      if (_catSelected.has(idx)) {
        _catSelected.delete(idx);                       // toggle off
      } else if (_catSelected.size < CFG.cat_max_exclude) {
        _catSelected.add(idx);                           // toggle on
      } else {
        // already at the max — flash a warning instead of selecting a 3rd category
        _catWarnVisible = true; _catWarnStartT = t;
        catWarnStim.setAutoDraw(true);
      }
      updateCatRowColors();
    }

    if (_catWarnVisible && (t - _catWarnStartT) >= CFG.cat_warn_dur) {
      catWarnStim.setAutoDraw(false); _catWarnVisible = false;
    }

    return Scheduler.Event.FLIP_REPEAT;
  };
}

function categorySelectRoutineEnd() {
  return async function () { catStimOff(); return Scheduler.Event.NEXT; };
}

function updateCatRowColors() {
  catRowStims.forEach((s, i) => s.setColor(_catSelected.has(i) ? _colRed : _colWhite));
}

// ─────────────────────────────────────────────
//  finalizeTrials  (product pool + trial design)
// ─────────────────────────────────────────────

async function finalizeTrials() {
  // from whatever categories the participant did NOT exclude, keep
  // exactly cat_num_final (5) of them, chosen at random. 5 categories x 3 products
  // each = 15 products, i.e. exactly one product per pairwise source-comparison.
  const remainingCats = categoryList.filter(c => !excludedCategories.includes(c));
  chosenCategories = randomPyShuffle([...remainingCats]).slice(0, CFG.cat_num_final);

  selectedProductRows = allProductRows.filter(r => chosenCategories.includes(r.category));

  if (selectedProductRows.length !== 15) {
    throw new Error(
      `Expected 15 products (5 categories x 3 products) after category selection, got ` +
      `${selectedProductRows.length}. Every category in product_list.csv must have exactly 3 rows.`
    );
  }

  const built = buildTrials(selectedProductRows, SOURCE_TYPES);
  trialsPhase1  = built.trialsPhase1;
  trialsPhase2  = built.trialsPhase2;
  sourceTypeMap = built.sourceTypeMap;

  // independently randomize the on-screen order for each phase
  phase1Order = constrainedShuffleTrials(trialsPhase1, CFG.max_run);
  phase2Order = constrainedShuffleTrials(trialsPhase2, CFG.max_run);

  return Scheduler.Event.NEXT;
}

// writes one dedicated CSV row capturing the participant-level setup (category
// choices + which sources got TYPE A / TYPE B this run) before any trial rows
async function logSetupInfo() {
  psychoJS.experiment.addData('Phase', 'SETUP');
  psychoJS.experiment.addData('ExcludedCategories', excludedCategories.join('|') || 'none');
  psychoJS.experiment.addData('ChosenCategories',    chosenCategories.join('|'));
  SOURCE_TYPES.forEach(s => psychoJS.experiment.addData(`SourceType_${s}`, sourceTypeMap[s]));
  psychoJS.experiment.nextEntry();
  return Scheduler.Event.NEXT;
}

// ─────────────────────────────────────────────
//  INSTRUCTIONS ROUTINE
// ─────────────────────────────────────────────

let _instrContinue;

function instructionsRoutineBegin() {
  return async function () {
    introClock.reset();
    instructionsStim.setAutoDraw(true);
    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    _instrContinue = true;
    return Scheduler.Event.NEXT;
  };
}

function instructionsRoutineEachFrame() {
  return async function () {
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume)
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          instructionsStim.setAutoDraw(true);
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    const pressed = psychoJS.eventManager.getKeys({ keyList: ['space'] });
    if (pressed.length > 0) _instrContinue = false;
    if (!_instrContinue) return Scheduler.Event.NEXT;
    return Scheduler.Event.FLIP_REPEAT;
  };
}

function instructionsRoutineEnd() {
  return async function () {
    instructionsStim.setAutoDraw(false);
    return Scheduler.Event.NEXT;
  };
}

// ─────────────────────────────────────────────
//  SOURCE-INTRODUCTION ROUTINE  (2 pages, 3 sources each)
// ─────────────────────────────────────────────
// only advances once the participant has spent at least intro_min_dur
// seconds on BOTH pages. A short "starting soon" message plays once 
// both conditions are met.

function buildIntroPageBody(pageIdx) {
  const page = SOURCE_INTRO_PAGES[pageIdx];
  return page.sources
    .map(s => `${SOURCE_LABEL_MAP[s]}\n${SOURCE_DESCRIPTIONS[s]}`)
    .join('\n\n');
}

function sourceIntroRoutineBegin() {
  return async function () {
    _introClock.reset();
    _introCurrentPage   = 0; // 0-based: page 0 = SOURCE_INTRO_PAGES[0]
    _introVisited       = new Set([0]);
    _introAccumTime     = { 0: 0, 1: 0 };
    _introPageEnteredAt = 0;
    _introWarnVisible   = false;
    _introWarnStartT    = 0;
    _introStartingT     = null;

    introPageLabelStim.setText(SOURCE_INTRO_PAGES[0].label);
    introPageBodyStim.setText(buildIntroPageBody(0));

    introPageLabelStim.setAutoDraw(true);
    introPageBodyStim.setAutoDraw(true);
    introPageHintStim.setAutoDraw(true);

    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    return Scheduler.Event.NEXT;
  };
}

function _introDwell(page, now) {
  return _introAccumTime[page] + (_introCurrentPage === page ? now - _introPageEnteredAt : 0);
}

function sourceIntroRoutineEachFrame() {
  return async function () {
    const t = _introClock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume)
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          introPageLabelStim.setAutoDraw(true);
          introPageBodyStim.setAutoDraw(true);
          introPageHintStim.setAutoDraw(true);
          if (_introWarnVisible) introPageWarnStim.setAutoDraw(true);
          if (_introStartingT !== null) introPageStartingStim.setAutoDraw(true);
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    const pressed = psychoJS.eventManager.getKeys({ keyList: ['left', 'right', 'space'] });

    for (const k of pressed) {
      const name = k.name || k;

      if (name === 'left' || name === 'right') {
        _introAccumTime[_introCurrentPage] += t - _introPageEnteredAt;
        _introCurrentPage = (_introCurrentPage === 0) ? 1 : 0;
        _introVisited.add(_introCurrentPage);
        _introPageEnteredAt = t;
        introPageLabelStim.setText(SOURCE_INTRO_PAGES[_introCurrentPage].label);
        introPageBodyStim.setText(buildIntroPageBody(_introCurrentPage));

      } else if (name === 'space') {
        const seenBoth   = _introVisited.has(0) && _introVisited.has(1);
        const enoughTime = _introDwell(0, t) >= CFG.intro_min_dur && _introDwell(1, t) >= CFG.intro_min_dur;

        if (seenBoth && enoughTime) {
          if (_introWarnVisible) { introPageWarnStim.setAutoDraw(false); _introWarnVisible = false; }
          if (_introStartingT === null) {
            introPageStartingStim.setAutoDraw(true);
            _introStartingT = t;
          }
        } else if (!_introWarnVisible) {
          introPageWarnStim.setAutoDraw(true);
          _introWarnVisible = true; _introWarnStartT = t;
        }
      }
    }

    if (_introWarnVisible && (t - _introWarnStartT) >= CFG.intro_warn_dur) {
      introPageWarnStim.setAutoDraw(false); _introWarnVisible = false;
    }

    // advance once the "starting soon" message has lingered for 1.5s
    if (_introStartingT !== null && (t - _introStartingT) >= 1.5) {
      introPageStimOff();
      return Scheduler.Event.NEXT;
    }
    return Scheduler.Event.FLIP_REPEAT;
  };
}

function sourceIntroRoutineEnd() {
  return async function () { introPageStimOff(); return Scheduler.Event.NEXT; };
}

// ─────────────────────────────────────────────
//  PHASEII INTRO ROUTINE
// ─────────────────────────────────────────────

function phase2IntroRoutineBegin() {
  return async function () {
    phase2IntroClock.reset();
    phase2IntroStim.setAutoDraw(true);
    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    _instrContinue = true;
    return Scheduler.Event.NEXT;
  };
}

function phase2IntroRoutineEachFrame() {
  return async function () {
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume)
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          phase2IntroStim.setAutoDraw(true);
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    const pressed = psychoJS.eventManager.getKeys({ keyList: ['space'] });
    if (pressed.length > 0) _instrContinue = false;
    if (!_instrContinue) return Scheduler.Event.NEXT;
    return Scheduler.Event.FLIP_REPEAT;
  };
}

function phase2IntroRoutineEnd() {
  return async function () {
    phase2IntroStim.setAutoDraw(false);
    return Scheduler.Event.NEXT;
  };
}

// ─────────────────────────────────────────────
//  PHASEI LOOP  (Screen 1: 3 brands → Screen 2: interest Likert)
// ─────────────────────────────────────────────

function phase1LoopBegin(loopScheduler) {
  return async function () {
    for (let pos = 0; pos < phase1Order.length; pos++) {
      loopScheduler.add(phase1TrialRoutineBegin(pos));
      loopScheduler.add(phase1TrialRoutineEachFrame(pos));
      loopScheduler.add(phase1TrialRoutineEnd(pos));
    }
    return Scheduler.Event.NEXT;
  };
}
function phase1LoopEnd() { return async function () { return Scheduler.Event.NEXT; }; }

function phase1TrialRoutineBegin(pos) {
  return async function () {
    const trial = phase1Order[pos];
    trialIndex = pos + 1;

    _p1Clock.reset();
    _p1PhaseStartT   = 0;
    _p1PhaseDuration = CFG.phase1_screen1_dur;
    _p1Phase         = 'screen1';
    _p1Selected      = null;
    _p1ResponseGiven = false;
    _escPending      = false; // LOCKOUT/PAUSE: reset pause state for every new trial

    sourceLabelStim.setText(SOURCE_LABEL_MAP[trial.source] || trial.source);
    productLabelStim.setText(trial.productNameKR);

    allStimOff();
    sourceLabelStim.setAutoDraw(true);
    productLabelStim.setAutoDraw(true);

    // show all 3 brand rows (randomized on-screen order)
    _p1DisplayOrder = randomPyShuffle([...trial.phase1Details]);
    _p1DisplayOrder.forEach((entry, i) => {
      brandStims[i].setPos([0, CFG.brand_row_ys[i]]);
      brandStims[i].setText(`Brand ${entry.brand}\n${entry.text}`);
      brandStims[i].setAutoDraw(true);
    });

    psychoJS.experiment.addData('Phase',            1);
    psychoJS.experiment.addData('TrialNumber',       trialIndex);
    psychoJS.experiment.addData('Product_EN',        trial.productNameEN);
    psychoJS.experiment.addData('Product_KR',        trial.productNameKR);
    psychoJS.experiment.addData('Category',          trial.category);
    psychoJS.experiment.addData('Source',            trial.source);
    psychoJS.experiment.addData('SourceType',        trial.sourceType);
    psychoJS.experiment.addData('PairedWith',        trial.pairedWith);
    psychoJS.experiment.addData('MixType',           trial.mixType); // UT_heavy (2UT+1HE) or HE_heavy (1UT+2HE)
    psychoJS.experiment.addData('Price',             trial.price);
    _p1DisplayOrder.forEach((entry, i) => {
      psychoJS.experiment.addData(`Brand${i + 1}_Letter`,     entry.brand);
      psychoJS.experiment.addData(`Brand${i + 1}_DetailKey`,  entry.key);
      psychoJS.experiment.addData(`Brand${i + 1}_DetailText`, entry.text);
    });
    psychoJS.experiment.addData('InterestRating',    '');
    psychoJS.experiment.addData('InterestRating_RT', '');
    psychoJS.experiment.addData('Phase1_Restarted',  '');

    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    return Scheduler.Event.NEXT;
  };
}

function phase1TrialRoutineEachFrame(pos) {
  return async function () {
    const t = _p1Clock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume).
    // On resume the trial restarts from the beginning (matching REFERENCE.js).
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          allStimOff();
          _p1Clock.reset();
          _p1PhaseStartT   = 0;
          _p1PhaseDuration = CFG.phase1_screen1_dur;
          _p1Phase         = 'screen1';
          _p1Selected      = null;
          _p1ResponseGiven = false;
          psychoJS.experiment.addData('Phase1_Restarted', 1);

          sourceLabelStim.setAutoDraw(true);
          productLabelStim.setAutoDraw(true);
          _p1DisplayOrder.forEach((entry, i) => {
            brandStims[i].setPos([0, CFG.brand_row_ys[i]]);
            brandStims[i].setText(`Brand ${entry.brand}\n${entry.text}`);
            brandStims[i].setAutoDraw(true);
          });

          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    // Screen 1: brands shown for a fixed duration
    if (_p1Phase === 'screen1') {
      if (t >= _p1PhaseStartT + _p1PhaseDuration) {
        sourceLabelStim.setAutoDraw(false);
        productLabelStim.setAutoDraw(false);
        brandStims.forEach(s => s.setAutoDraw(false));

        _p1PhaseStartT   = t;
        _p1PhaseDuration = CFG.fix_min + Math.random() * (CFG.fix_max - CFG.fix_min);
        _p1Phase = 'fix';
        fixStim.setAutoDraw(true);
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    // brief inter-screen fixation
    if (_p1Phase === 'fix') {
      if (t >= _p1PhaseStartT + _p1PhaseDuration) {
        fixStim.setAutoDraw(false);
        _p1Phase = 'screen2_init';
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    // Screen 2 setup: same source/product header + interest question + Likert
    if (_p1Phase === 'screen2_init') {
      sourceLabelStim.setAutoDraw(true);
      productLabelStim.setAutoDraw(true);
      questionStim.setAutoDraw(true);
      updateCircleFills(null);
      scaleSetAutoDraw(true);

      _p1Selected      = null;
      _p1ResponseGiven = false;
      _p1StartT        = t;
      psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
      _p1Phase = 'screen2';
      return Scheduler.Event.FLIP_REPEAT;
    }

    // Screen 2: wait for Likert response
    if (_p1Phase === 'screen2') {
      const n = CFG.scale_n;
      const pressed = psychoJS.eventManager.getKeys({ keyList: ['left', 'right', 'return'] });

      for (const k of pressed) {
        const name = k.name || k;
        if (name === 'left') {
          _p1Selected = (_p1Selected === null) ? Math.floor(n / 2) : Math.max(0, _p1Selected - 1);
        } else if (name === 'right') {
          _p1Selected = (_p1Selected === null) ? Math.floor(n / 2) : Math.min(n - 1, _p1Selected + 1);
        } else if (name === 'return' && _p1Selected !== null) {
          const score = _p1Selected + 1;
          const rt = t - _p1StartT;
          psychoJS.experiment.addData('InterestRating', score);
          psychoJS.experiment.addData('InterestRating_RT', rt);
          _p1ResponseGiven = true;
        }
      }

      updateCircleFills(_p1Selected);

      if (_p1ResponseGiven) {
        allStimOff();
        return Scheduler.Event.NEXT;
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    return Scheduler.Event.NEXT;
  };
}

function phase1TrialRoutineEnd(pos) {
  return async function () {
    allStimOff();
    psychoJS.experiment.nextEntry();
    return Scheduler.Event.NEXT;
  };
}

// ─────────────────────────────────────────────
//  PHASEII LOOP  (Screen 1: detail + reveal + price → Screen 2: binary choice, same screen)
// ─────────────────────────────────────────────

function phase2LoopBegin(loopScheduler) {
  return async function () {
    for (let pos = 0; pos < phase2Order.length; pos++) {
      loopScheduler.add(phase2TrialRoutineBegin(pos));
      loopScheduler.add(phase2TrialRoutineEachFrame(pos));
      loopScheduler.add(phase2TrialRoutineEnd(pos));
    }
    return Scheduler.Event.NEXT;
  };
}
function phase2LoopEnd() { return async function () { return Scheduler.Event.NEXT; }; }

function phase2TrialRoutineBegin(pos) {
  return async function () {
    const trial = phase2Order[pos];
    trialIndex = pos + 1;

    _p2Clock.reset();
    _p2PhaseStartT   = 0;
    _p2PhaseDuration = CFG.phase2_reveal_delay;
    _p2Phase         = 'screen1';
    _p2Selected      = null;
    _p2ChoiceGiven   = false;
    _escPending      = false; // LOCKOUT/PAUSE: reset pause state for every new trial

    // [Endorser] / PRODUCT — BRAND[LETTER] / carried-forward detail /
    // PhaseII_UT or PhaseII_HE reveal / price, top to bottom.
    sourceLabelStim.setText(SOURCE_LABEL_MAP[trial.source] || trial.source);
    productLabelStim.setText(`${trial.productNameKR} — Brand ${trial.phase2Brand}`);
    detailTextStim.setText(trial.phase2DetailText);
    bodyTextStim.setText(trial.phase2RevealText);
    priceStim.setText(`가격: ${formatWon(trial.price)}`);

    allStimOff();
    sourceLabelStim.setAutoDraw(true);
    productLabelStim.setAutoDraw(true);
    detailTextStim.setAutoDraw(true);
    bodyTextStim.setAutoDraw(true);
    priceStim.setAutoDraw(true);

    psychoJS.experiment.addData('Phase',             2);
    psychoJS.experiment.addData('TrialNumber',        trialIndex);
    psychoJS.experiment.addData('Product_EN',         trial.productNameEN);
    psychoJS.experiment.addData('Product_KR',         trial.productNameKR);
    psychoJS.experiment.addData('Category',           trial.category);
    psychoJS.experiment.addData('Source',             trial.source);
    psychoJS.experiment.addData('SourceType',         trial.sourceType);
    psychoJS.experiment.addData('PairedWith',         trial.pairedWith);
    psychoJS.experiment.addData('Phase2_Brand',       trial.phase2Brand);
    psychoJS.experiment.addData('Phase2_DetailKey',   trial.phase2DetailKey);
    psychoJS.experiment.addData('Phase2_DetailText',  trial.phase2DetailText);
    psychoJS.experiment.addData('Phase2_RevealType',  trial.phase2RevealType); // UT or HE
    psychoJS.experiment.addData('Phase2_RevealText',  trial.phase2RevealText);
    psychoJS.experiment.addData('Price',              trial.price);
    psychoJS.experiment.addData('Choice',             '');
    psychoJS.experiment.addData('Choice_RT',          '');
    psychoJS.experiment.addData('Phase2_Restarted',   '');

    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    return Scheduler.Event.NEXT;
  };
}

function phase2TrialRoutineEachFrame(pos) {
  return async function () {
    const t = _p2Clock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume).
    // On resume the trial restarts from the beginning (matching REFERENCE.js).
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          allStimOff();
          _p2Clock.reset();
          _p2PhaseStartT   = 0;
          _p2PhaseDuration = CFG.phase2_reveal_delay;
          _p2Phase         = 'screen1';
          _p2Selected      = null;
          _p2ChoiceGiven   = false;
          psychoJS.experiment.addData('Phase2_Restarted', 1);

          sourceLabelStim.setAutoDraw(true);
          productLabelStim.setAutoDraw(true);
          detailTextStim.setAutoDraw(true);
          bodyTextStim.setAutoDraw(true);
          priceStim.setAutoDraw(true);

          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    // Screen 1: detail + reveal + price shown alone for a fixed delay
    if (_p2Phase === 'screen1') {
      if (t >= _p2PhaseStartT + _p2PhaseDuration) {
        // Screen 2 = same screen, binary choice appended below
        choiceLeftStim.setAutoDraw(true);
        choiceRightStim.setAutoDraw(true);
        updateChoiceHighlight(null);
        _p2Selected    = null;
        _p2ChoiceGiven = false;
        _p2StartT      = t;
        psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
        _p2Phase = 'screen2';
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    // Screen 2: wait for binary choice
    if (_p2Phase === 'screen2') {
      const pressed = psychoJS.eventManager.getKeys({ keyList: ['left', 'right', 'return'] });

      for (const k of pressed) {
        const name = k.name || k;
        if (name === 'left')  _p2Selected = 0;   // 구매한다
        if (name === 'right') _p2Selected = 1;   // 구매하지 않는다
        if (name === 'return' && _p2Selected !== null) {
          const choiceText = _p2Selected === 0 ? '구매한다' : '구매하지 않는다';
          const rt = t - _p2StartT;
          psychoJS.experiment.addData('Choice', choiceText);
          psychoJS.experiment.addData('Choice_RT', rt);
          _p2ChoiceGiven = true;
        }
      }

      updateChoiceHighlight(_p2Selected);

      if (_p2ChoiceGiven) {
        allStimOff();
        return Scheduler.Event.NEXT;
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    return Scheduler.Event.NEXT;
  };
}

function phase2TrialRoutineEnd(pos) {
  return async function () {
    allStimOff();
    psychoJS.experiment.nextEntry();
    return Scheduler.Event.NEXT;
  };
}

// ─────────────────────────────────────────────
//  FINAL ROUTINE
// ─────────────────────────────────────────────

function finalRoutineBegin() {
  return async function () {
    finalClock = new util.Clock();
    finalClock.reset();
    finalStim.setAutoDraw(true);
    return Scheduler.Event.NEXT;
  };
}

function finalRoutineEachFrame() {
  return async function () {
    const t = finalClock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // LOCKOUT / PAUSE: while paused, wait for Y (quit) or N (resume)
    if (_escPending) {
      const confirm = psychoJS.eventManager.getKeys({ keyList: ['y', 'n'] });
      for (const k of confirm) {
        const name = k.name || k;
        if (name === 'y') return quitPsychoJS('사용자 종료', false);
        if (name === 'n') {
          pauseStim.setAutoDraw(false);
          finalStim.setAutoDraw(true);
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          _escPending = false;
        }
      }
      return Scheduler.Event.FLIP_REPEAT;
    }

    if (t >= 5.0) return Scheduler.Event.NEXT;
    return Scheduler.Event.FLIP_REPEAT;
  };
}

function finalRoutineEnd() {
  return async function () {
    finalStim.setAutoDraw(false);
    return Scheduler.Event.NEXT;
  };
}

// ─────────────────────────────────────────────
//  QUIT
// ─────────────────────────────────────────────

async function quitPsychoJS(message, isCompleted) {
  if (psychoJS.experiment.isEntryEmpty()) psychoJS.experiment.nextEntry();

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  document.body.style.cursor = 'auto';
  psychoJS.window._renderer.view.style.cursor = 'auto';

  psychoJS.window.close();
  psychoJS.quit({ message, isCompleted });
  return Scheduler.Event.QUIT;
}
