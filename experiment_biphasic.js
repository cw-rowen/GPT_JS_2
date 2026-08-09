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

  // Phase 1 / Screen 1 layout — source, product, 3 brands
  source_y:            0.42,
  product_y:            0.33,
  brand_row_ys:        [0.14, -0.01, -0.16],
  text_height_source:   0.05,
  text_height_product:  0.045,
  text_height_brand:    0.04,
  brand_wrap:           1.3,

  // Phase 1 / Screen 2 — interest question
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

  // Phase 2 — price / persuasion text / binary choice
  phase2_price_y:        0.10,
  phase2_text_y:         -0.05,
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

};

// the 6 endorsement sources
const SOURCE_TYPES = ['EXPERT', 'CONSENSUS', 'PEER', 'SEARCHENGINE', 'CHATGPT', 'ADVERTISEMENT'];

// Korean display label per source — EDIT THESE (see ASSUMPTIONS #1)
const SOURCE_LABEL_MAP = {
  EXPERT:        '[전문가 추천]',
  CONSENSUS:     '[소비자 의견 종합]',
  PEER:          '[지인 추천]',
  SEARCHENGINE:  '[검색엔진 상위 노출]',
  CHATGPT:       '[ChatGPT 추천]',
  ADVERTISEMENT: '[광고]',
};

// Brand A .. Brand Z
const BRAND_NAMES = Array.from({ length: 26 }, (_, i) => `Brand ${String.fromCharCode(65 + i)}`);

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

// shuffle `rows`, retrying until no run of keyFn(row) exceeds maxRun
function constrainedShuffle(rows, keyFn, maxRun = 2, maxTries = 20000) {
  rows = [...rows];
  for (let attempt = 0; attempt < maxTries; attempt++) {
    randomPyShuffle(rows);
    if (isValidRun(rows.map(keyFn), maxRun)) return rows;
  }
  console.warn('constrainedShuffle: returning last attempt (could not satisfy max_run)');
  return rows;
}

// build a sequence of length n drawn evenly from `types`, with a run limit
function buildBalancedSequence(n, types, maxRun = 2, maxTries = 5000) {
  for (let attempt = 0; attempt < maxTries; attempt++) {
    let pool = [];
    while (pool.length < n) {
      const chunk = [...types];
      randomPyShuffle(chunk);
      pool.push(...chunk);
    }
    pool = pool.slice(0, n);
    if (isValidRun(pool, maxRun)) return pool;
  }
  console.warn('buildBalancedSequence: returning last attempt (could not satisfy max_run)');
  return pool;
}

// pick 3 distinct random brand names
function pickThreeBrands() {
  const arr = [...BRAND_NAMES];
  randomPyShuffle(arr);
  return arr.slice(0, 3);
}

// build the full trial list: one entry per product row, source-balanced,
// brand-tagged, with the Phase-2 brand/text pre-selected so it stays
// consistent with Phase 1.
function buildTrials(productRows) {
  const n = productRows.length;
  const sources = buildBalancedSequence(n, SOURCE_TYPES, CFG.max_run);

  return productRows.map((row, i) => {
    const letters = pickThreeBrands();
    const cols = [
      { col: 1, brand: letters[0], text: row.PhaseI_1 },
      { col: 2, brand: letters[1], text: row.PhaseI_2 },
      { col: 3, brand: letters[2], text: row.PhaseI_3 },
    ];
    // ADVERTISEMENT trials show only ONE brand in Phase 1;
    // that same brand is the one that carries into Phase 2, so no separate
    // random pick is needed for it.
    const isAdOnly = sources[i] === 'ADVERTISEMENT';
    const phase1Display = isAdOnly
      ? [cols[Math.floor(Math.random() * cols.length)]]           // just 1 brand
      : randomPyShuffle([...cols]);                                // all 3, randomized order
    const phase2Pick = isAdOnly
      ? phase1Display[0]                                           // same single brand
      : cols[Math.floor(Math.random() * cols.length)];             // random pick among the 3 shown
    const useUT = Math.random() < 0.5;

    return {
      idx:            i,
      productName:    row.Product_Name,
      price:          row.Price,
      source:         sources[i],
      phase1Display,                                   // [{col,brand,text}, ...] in randomized display order
      phase2Brand:    phase2Pick.brand,
      phase2Col:      phase2Pick.col,
      phase2TextType: useUT ? 'UT' : 'HE',
      phase2Text:     useUT ? row.PhaseII_UT : row.PhaseII_HE,
    };
  });
}

// build a randomized presentation order (array of trial indices) with a run
// limit on source type
function buildTrialOrder(trials, maxRun) {
  const idxs = trials.map((_, i) => i);
  return constrainedShuffle(idxs, i => trials[i].source, maxRun);
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
flowScheduler.add(instructionsRoutineBegin());
flowScheduler.add(instructionsRoutineEachFrame());
flowScheduler.add(instructionsRoutineEnd());

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

// shared stimuli
let sourceLabelStim, productLabelStim, brandStims;      // Phase 1 screen 1 / shared header
let questionStim;                                       // Phase 1 screen 2
let priceStim, bodyTextStim;                             // Phase 2
let choiceLeftStim, choiceRightStim;                      // Phase 2 binary choice
let fixStim;                                              // fixation cross
let scale_circles = [], scale_numbers = [];
let scale_leftDesc = null, scale_rightDesc = null;
let instructionsStim, phase2IntroStim;

let _colRed, _colClear, _colWhite;

let trials = [], phase1Order = [], phase2Order = [];
let trialIndex = 0;

// per-trial state (Phase 1)
let _p1Clock, _p1Phase, _p1PhaseStartT, _p1PhaseDuration;
let _p1Selected, _p1ResponseGiven, _p1StartT;

// per-trial state (Phase 2)
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

  _colRed   = new util.Color('red');
  _colClear = new util.Color(CFG.bg_color);
  _colWhite = new util.Color(CFG.text_color);

  // ── shared header stimuli (source label + product name) ──
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

  // ── Phase 1 Screen 1: three brand rows ──
  brandStims = CFG.brand_row_ys.map((y, i) => new visual.TextStim({
    win, name: `brandStim_${i}`, text: '',
    pos: [0, y], height: CFG.text_height_brand,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
    wrapWidth: CFG.brand_wrap,
  }));

  // ── Phase 1 Screen 2: interest question ──
  questionStim = new visual.TextStim({
    win, name: 'questionStim', text: '이 제품들에 관심이 있으신가요?',
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

  // ── Phase 2: price / persuasion text / binary choice ──
  priceStim = new visual.TextStim({
    win, name: 'priceStim', text: '',
    pos: [0, CFG.phase2_price_y], height: CFG.text_height_price,
    color: _colWhite, font: CFG.font, bold: CFG.text_bold,
    alignText: 'center', anchor: 'center', units: 'height',
  });
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

  // ── load product_list.csv ──
  const _productHandler = new TrialHandler({
    psychoJS, nReps: 1,
    method: TrialHandler.Method.SEQUENTIAL,
    trialList: 'product_list.csv',
    name: '_productLoader',
  });
  const productRows = _productHandler.trialList;
  if (!productRows || productRows.length === 0)
    throw new Error('product_list.csv loaded 0 rows.');

  const reqCols = ['Product_Name', 'Price', 'PhaseI_1', 'PhaseI_2', 'PhaseI_3', 'PhaseII_UT', 'PhaseII_HE'];
  const missingCols = reqCols.filter(c => !(c in productRows[0]));
  if (missingCols.length) throw new Error(`product_list.csv missing: ${missingCols}`);

  // build trials + independent presentation orders for each phase
  trials       = buildTrials(productRows);
  phase1Order  = buildTrialOrder(trials, CFG.max_run);
  phase2Order  = buildTrialOrder(trials, CFG.max_run);

  return Scheduler.Event.NEXT;
}

// ─────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────

function allStimOff() {
  [sourceLabelStim, productLabelStim, ...brandStims, questionStim,
   priceStim, bodyTextStim, choiceLeftStim, choiceRightStim, fixStim]
    .forEach(s => s.setAutoDraw(false));
  scaleSetAutoDraw(false);
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
    const pressed = psychoJS.eventManager.getKeys({ keyList: ['space'] });
    if (pressed.length > 0) _instrContinue = false;
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);
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
//  PHASE-2 INTRO ROUTINE
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
    const pressed = psychoJS.eventManager.getKeys({ keyList: ['space'] });
    if (pressed.length > 0) _instrContinue = false;
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);
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
//  PHASE 1 LOOP  (Screen 1: 3 brands → Screen 2: interest Likert)
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
    const tIdx  = phase1Order[pos];
    const trial = trials[tIdx];
    trialIndex = pos + 1;

    _p1Clock.reset();
    _p1PhaseStartT   = 0;
    _p1PhaseDuration = CFG.phase1_screen1_dur;
    _p1Phase         = 'screen1';
    _p1Selected      = null;
    _p1ResponseGiven = false;

    sourceLabelStim.setText(SOURCE_LABEL_MAP[trial.source] || trial.source);
    productLabelStim.setText(trial.productName);

    allStimOff();
    sourceLabelStim.setAutoDraw(true);
    productLabelStim.setAutoDraw(true);

    if (trial.phase1Display.length === 1) {
      // ADVERTISEMENT: single brand, centered on the middle row
      const entry = trial.phase1Display[0];
      const midRow = Math.floor(brandStims.length / 2);
      brandStims[midRow].setPos([0, CFG.brand_row_ys[midRow]]);
      brandStims[midRow].setText(`${entry.brand}\n${entry.text}`);
      brandStims[midRow].setAutoDraw(true);
    } else {
      trial.phase1Display.forEach((entry, i) => {
        brandStims[i].setPos([0, CFG.brand_row_ys[i]]);
        brandStims[i].setText(`${entry.brand}\n${entry.text}`);
        brandStims[i].setAutoDraw(true);
      });
    }

    psychoJS.experiment.addData('Phase',            1);
    psychoJS.experiment.addData('TrialNumber',       trialIndex);
    psychoJS.experiment.addData('Product_Name',      trial.productName);
    psychoJS.experiment.addData('Source',            trial.source);
    trial.phase1Display.forEach((entry, i) => {
      psychoJS.experiment.addData(`Brand${i + 1}_Name`,   entry.brand);
      psychoJS.experiment.addData(`Brand${i + 1}_Column`, `PhaseI_${entry.col}`);
    });
    psychoJS.experiment.addData('InterestRating',    '');
    psychoJS.experiment.addData('InterestRating_RT', '');

    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    return Scheduler.Event.NEXT;
  };
}

function phase1TrialRoutineEachFrame(pos) {
  return async function () {
    const t = _p1Clock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

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
//  PHASE 2 LOOP  (Screen 1: price + text → Screen 2: binary choice, same screen)
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
    const tIdx  = phase2Order[pos];
    const trial = trials[tIdx];
    trialIndex = pos + 1;

    _p2Clock.reset();
    _p2PhaseStartT   = 0;
    _p2PhaseDuration = CFG.phase2_reveal_delay;
    _p2Phase         = 'screen1';
    _p2Selected      = null;
    _p2ChoiceGiven   = false;

    sourceLabelStim.setText(SOURCE_LABEL_MAP[trial.source] || trial.source);
    productLabelStim.setText(`${trial.productName} — ${trial.phase2Brand}`);
    priceStim.setText(`가격: ${trial.price}`);
    bodyTextStim.setText(trial.phase2Text);

    allStimOff();
    sourceLabelStim.setAutoDraw(true);
    productLabelStim.setAutoDraw(true);
    priceStim.setAutoDraw(true);
    bodyTextStim.setAutoDraw(true);

    psychoJS.experiment.addData('Phase',            2);
    psychoJS.experiment.addData('TrialNumber',       trialIndex);
    psychoJS.experiment.addData('Product_Name',      trial.productName);
    psychoJS.experiment.addData('Source',            trial.source);
    psychoJS.experiment.addData('Phase2_Brand',      trial.phase2Brand);
    psychoJS.experiment.addData('Phase2_Column',     `PhaseI_${trial.phase2Col}`);
    psychoJS.experiment.addData('Price',             trial.price);
    psychoJS.experiment.addData('Phase2_TextType',   trial.phase2TextType);
    psychoJS.experiment.addData('Phase2_Text',       trial.phase2Text);
    psychoJS.experiment.addData('Choice',            '');
    psychoJS.experiment.addData('Choice_RT',         '');

    psychoJS.eventManager.clearEvents({ eventType: 'keyboard' });
    return Scheduler.Event.NEXT;
  };
}

function phase2TrialRoutineEachFrame(pos) {
  return async function () {
    const t = _p2Clock.getTime();
    if (psychoJS.experiment.experimentEnded) return quitPsychoJS('Experiment ended', false);

    // Screen 1: price + text shown alone for a fixed delay
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