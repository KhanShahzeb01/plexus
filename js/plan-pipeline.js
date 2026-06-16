// ─── Non-streaming LLM call (for research steps) ──────────────────────
async function callLLM(messages, maxTokens = 2000, signal = null) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Plexus',
    },
    body: JSON.stringify({
      model: state.model,
      messages,
      stream: false,
      max_tokens: maxTokens,
      temperature: state.temperature ?? 0.7,
      top_p: state.topP ?? 1.0,
    }),
    signal: signal || undefined,
  });
  if (!response.ok) {
    let detail = '';
    try { const err = await response.json(); detail = err.error?.message || ''; } catch {}
    throw new Error(detail || `HTTP ${response.status}`);
  }
  const data = await response.json();
  // Track tokens
  if (data.usage) {
    const pi = data.usage.prompt_tokens || 0;
    const co = data.usage.completion_tokens || 0;
    state.totalTokensIn = (state.totalTokensIn || 0) + pi;
    state.totalTokensOut = (state.totalTokensOut || 0) + co;
    state.lifetimeTokensIn = (state.lifetimeTokensIn || 0) + pi;
    state.lifetimeTokensOut = (state.lifetimeTokensOut || 0) + co;
    saveState();
    updateStatusBar();
  }
  return data.choices?.[0]?.message?.content || '';
}

let visionModelsCache = null;

const Vision = {
  IMAGE_TYPES: new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']),
  IMAGE_EXT: /\.(png|jpe?g|webp|gif)$/i,
  MAX_IMAGE_BYTES: 4 * 1024 * 1024,
  FALLBACK_HEURISTIC: /gpt-4o|gpt-4\.1|gemini|claude-3|claude-sonnet|claude-haiku|claude-opus|llama-3\.2.*vision|pixtral|qwen.*vl|llava|gemma.*vision|gpt-oss.*vision/i,

  fallbackModel() {
    return 'google/gemini-2.5-flash';
  },

  supports(modelId = state.model) {
    if (!modelId) return false;
    if (visionModelsCache?.has(modelId)) return true;
    return Vision.FALLBACK_HEURISTIC.test(modelId);
  },

  async refreshModelCache() {
    if (!state.apiKey) return;
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${state.apiKey}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const ids = new Set();
      for (const m of data.data || []) {
        const mods = m.architecture?.input_modalities || [];
        const modality = m.architecture?.modality || '';
        if (mods.includes('image') || modality.includes('image')) ids.add(m.id);
      }
      visionModelsCache = ids;
    } catch {}
  },

  isImageFile(file) {
    return Vision.IMAGE_TYPES.has(file.type) || Vision.IMAGE_EXT.test(file.name);
  },

  readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  },

  buildParts(text, dataUrl) {
    const parts = [];
    if (dataUrl) parts.push({ type: 'image_url', image_url: { url: dataUrl } });
    parts.push({ type: 'text', text: text || 'What is in this image?' });
    return parts;
  },

  async callVision(messages, model, maxTokens = 2000, signal = null) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Plexus',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
      signal: signal || undefined,
    });
    if (!response.ok) {
      let detail = '';
      try { const err = await response.json(); detail = err.error?.message || ''; } catch {}
      throw new Error(detail || `Vision HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.usage) {
      const pi = data.usage.prompt_tokens || 0;
      const co = data.usage.completion_tokens || 0;
      state.totalTokensIn = (state.totalTokensIn || 0) + pi;
      state.totalTokensOut = (state.totalTokensOut || 0) + co;
      state.lifetimeTokensIn = (state.lifetimeTokensIn || 0) + pi;
      state.lifetimeTokensOut = (state.lifetimeTokensOut || 0) + co;
      saveState();
      updateStatusBar();
    }
    return (data.choices?.[0]?.message?.content || '').trim();
  },

  async describeForContext(image, signal) {
    const model = Vision.supports() ? state.model : Vision.fallbackModel();
    return Vision.callVision([
      {
        role: 'user',
        content: Vision.buildParts(
          'Describe this image thoroughly for research context. Include all visible text, numbers, chart values, labels, UI elements, and notable visual details.',
          image.dataUrl
        ),
      },
    ], model, 2500, signal);
  },

  appendApiMessages(apiMessages, pendingImage = null) {
    const recent = state.messages.slice(-20);
    for (let i = 0; i < recent.length; i++) {
      const msg = recent[i];
      const isLastUser = msg.role === 'user' && i === recent.length - 1;
      if (isLastUser && pendingImage && Vision.supports()) {
        apiMessages.push({
          role: 'user',
          content: Vision.buildParts(msg.content, pendingImage.dataUrl),
        });
      } else if (msg.role === 'user' && msg.imageDataUrl && Vision.supports()) {
        apiMessages.push({
          role: 'user',
          content: Vision.buildParts(msg.content, msg.imageDataUrl),
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }
  },
};

// ─── Structured multi-step analysis (plan mode + /research) ───────────
const PLAN_BALANCE_GUIDE = `Tone: stay balanced and evidence-based. Do not be unnecessarily positive or overly critical — weigh strengths and weaknesses fairly. Use Neutral or Mixed when evidence is mixed. Acknowledge uncertainty instead of forced optimism or doom.`;

const SYNTHESIS_CTX_CHAR_BUDGET = 90000;

function isContextLengthError(msg) {
  const m = (msg || '').toLowerCase();
  return (m.includes('context') && (m.includes('length') || m.includes('window') || m.includes('limit') || m.includes('exceed')))
    || (m.includes('token') && (m.includes('limit') || m.includes('maximum') || m.includes('exceed') || m.includes('too long') || m.includes('too many')))
    || (m.includes('prompt') && (m.includes('too long') || m.includes('too large') || m.includes('maximum')))
    || m.includes('maximum context');
}

function truncatePlanText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 18)).trim() + '… [truncated]';
}

const SYNTHESIS_REDUCTIONS = [
  { maxAnswerChars: null, maxPairs: null },
  { maxAnswerChars: 3000, maxPairs: null },
  { maxAnswerChars: 2000, maxPairs: null },
  { maxAnswerChars: 1200, maxPairs: null },
  { maxAnswerChars: 800, maxPairs: 14 },
  { maxAnswerChars: 600, maxPairs: 12 },
  { maxAnswerChars: 450, maxPairs: 10 },
  { maxAnswerChars: 300, maxPairs: 8 },
];

function formatQAPairs(pairs, reduction = {}) {
  const maxAnswerChars = reduction.maxAnswerChars;
  const maxPairs = reduction.maxPairs;
  const list = maxPairs != null ? pairs.slice(0, maxPairs) : pairs;
  return list.map((p, i) => {
    let answer = (p.answer || '').trim();
    if (maxAnswerChars != null) answer = truncatePlanText(answer, maxAnswerChars);
    return `### Q${i + 1}: ${p.question}\n${answer}`;
  }).join('\n\n');
}

function buildSynthesisMessages(userContent, fileContext, qaPairs, reductionLevel = 0) {
  const reduction = SYNTHESIS_REDUCTIONS[Math.min(reductionLevel, SYNTHESIS_REDUCTIONS.length - 1)];
  let qaBlock = formatQAPairs(qaPairs, reduction);
  let level = reductionLevel;
  while (qaBlock.length > SYNTHESIS_CTX_CHAR_BUDGET && level < SYNTHESIS_REDUCTIONS.length - 1) {
    level++;
    qaBlock = formatQAPairs(qaPairs, SYNTHESIS_REDUCTIONS[level]);
  }
  if (qaBlock.length > SYNTHESIS_CTX_CHAR_BUDGET) {
    qaBlock = truncatePlanText(qaBlock, SYNTHESIS_CTX_CHAR_BUDGET);
  }

  return {
    level,
    messages: [
      { role: 'system', content: (state.systemPrompt ? state.systemPrompt + '\n\n' : '') + `You synthesize multi-part research into one polished, detailed final answer. Use markdown with clear headings and well-organized sections. Lead with an executive summary, then develop the analysis in depth. Weave together all sub-question answers into a cohesive narrative — do not paste them verbatim as a list. ${PLAN_BALANCE_GUIDE} Present a fair view: note both positives and risks, and avoid cheerleading or undue pessimism.` },
      { role: 'user', content: `Original question: ${userContent}${fileContext}

Sub-question answers (use all of these as source material):

${qaBlock}

Write a polished, detailed **Final Answer** that integrates every sub-question answer above into one comprehensive, balanced response. Structure with clear sections. Highlight the most important conclusions, trade-offs, and actionable takeaways.` },
    ],
  };
}

async function streamChatCompletion(messages, { signal, maxTokens = 8000, onDelta } = {}) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Plexus',
    },
    body: JSON.stringify({
      model: state.model,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: state.temperature ?? 0.7,
      top_p: state.topP ?? 1.0,
    }),
    signal,
  });

  if (!resp.ok) {
    let d = '';
    try { const e = await resp.json(); d = e.error?.message || ''; } catch {}
    throw new Error(d || `HTTP ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t || !t.startsWith('data: ')) continue;
      const d = t.slice(6).trim();
      if (d === '[DONE]') continue;
      try {
        const chunk = JSON.parse(d);
        if (chunk.usage) {
          const pi = chunk.usage.prompt_tokens || 0;
          const co = chunk.usage.completion_tokens || 0;
          state.totalTokensIn = (state.totalTokensIn || 0) + pi;
          state.totalTokensOut = (state.totalTokensOut || 0) + co;
          state.lifetimeTokensIn = (state.lifetimeTokensIn || 0) + pi;
          state.lifetimeTokensOut = (state.lifetimeTokensOut || 0) + co;
          saveState();
          updateStatusBar();
        }
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          if (onDelta) onDelta(delta, full);
        }
      } catch {}
    }
  }
  return full;
}

// ─── Plan pipeline modules (planner → answerer → quality gate → synthesizer) ─
function getPlanQuestionBounds() {
  let min = parseInt(state.planMinQuestions, 10);
  let max = parseInt(state.planMaxQuestions, 10);
  if (!Number.isFinite(min)) min = 3;
  if (!Number.isFinite(max)) max = 14;
  min = Math.max(1, Math.min(30, min));
  max = Math.max(3, Math.min(50, max));
  if (min > max) min = max;
  return { min, max };
}

const PlanPipeline = {
  FALLBACK_QUESTIONS: [
    { id: 1, question: 'Core subject and scope?' },
    { id: 2, question: 'Key facts and context?' },
    { id: 3, question: 'Quantitative metrics or data?' },
    { id: 4, question: 'Strengths and advantages?' },
    { id: 5, question: 'Weaknesses and risks?' },
    { id: 6, question: 'Growth drivers or opportunities?' },
    { id: 7, question: 'Competitive or comparative position?' },
    { id: 8, question: 'Outlook and catalysts?' },
  ],

  normalizeQuestion(text) {
    const q = String(text || '').replace(/^\d+[\.\)]\s*/, '').trim();
    return q.endsWith('?') ? q : q + '?';
  },

  parseSubQuestions(planRaw) {
    try {
      const extracted = planRaw.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(extracted ? extracted[0] : planRaw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item, i) => {
        if (typeof item === 'string') return { id: i + 1, question: this.normalizeQuestion(item) };
        const q = item.question || item.q || item.text || '';
        return { id: item.id || i + 1, question: this.normalizeQuestion(q) };
      }).filter(x => x.question && x.question.length > 1);
    } catch {
      return [];
    }
  },

  applyQuestionGuardrails(subQuestions) {
    const { min: PLAN_MIN_QUESTIONS, max: PLAN_MAX_QUESTIONS } = getPlanQuestionBounds();
    let list = subQuestions.slice(0, PLAN_MAX_QUESTIONS);
    if (list.length < PLAN_MIN_QUESTIONS) {
      const fallback = this.FALLBACK_QUESTIONS.map(q => ({
        id: q.id,
        question: this.normalizeQuestion(q.question),
      }));
      const seen = new Set(list.map(q => q.question.toLowerCase()));
      for (const fq of fallback) {
        if (list.length >= PLAN_MIN_QUESTIONS) break;
        if (!seen.has(fq.question.toLowerCase())) {
          list.push({ id: list.length + 1, question: fq.question });
          seen.add(fq.question.toLowerCase());
        }
      }
      while (list.length < PLAN_MIN_QUESTIONS && fallback.length) {
        list.push({ id: list.length + 1, question: fallback[list.length % fallback.length].question });
      }
    }
    return list.map((q, i) => ({ id: i + 1, question: q.question }));
  },

  async planner({ userContent, fileContext, sys, signal }) {
    const { min: PLAN_MIN_QUESTIONS, max: PLAN_MAX_QUESTIONS } = getPlanQuestionBounds();
    const planRaw = await callLLM([
      ...(sys || []),
      { role: 'system', content: 'You decompose user queries into the optimal analytical checklist. Judge complexity yourself and return only valid JSON.' },
      { role: 'user', content: `Analyze this query and decide the best set of sub-questions to answer it thoroughly.

You choose BOTH:
1. How many questions (between ${PLAN_MIN_QUESTIONS} and ${PLAN_MAX_QUESTIONS})
2. Which specific questions to ask

Sizing guide — pick the count that fits the query, do not pad or stretch:
- ${PLAN_MIN_QUESTIONS}–5: simple, narrow, or factual queries (definitions, single-topic explainers, quick decisions)
- 6–9: moderate depth (comparisons, how-to, single-domain analysis)
- 10–${PLAN_MAX_QUESTIONS}: broad, multi-dimensional queries (investment theses, company diligence, architecture reviews, complex trade-offs)

Rules:
- Adapt to the domain automatically (finance, tech, science, career, policy, etc.).
- Each sub-question is a short phrase ending with "?".
- Order logically: context → core analysis → evidence → risks → outlook (omit angles that do not apply).
- Include upside and downside where relevant; skip redundant angles.
- Do not answer yet — only list questions.

Return ONLY a JSON array (${PLAN_MIN_QUESTIONS}–${PLAN_MAX_QUESTIONS} items):
[{"id": 1, "question": "..."}, {"id": 2, "question": "..."}, ...]

Query: ${userContent}${fileContext}` },
    ], 3000, signal);

    let subQuestions = this.parseSubQuestions(planRaw);
    return this.applyQuestionGuardrails(subQuestions);
  },

  async answerOne({ userContent, fileContext, question, index, total, signal }) {
    const qText = this.normalizeQuestion(question);
    const answer = await callLLM([
      { role: 'system', content: `You answer analytical sub-questions in clear prose. ${PLAN_BALANCE_GUIDE}` },
      { role: 'user', content: `Original query: ${userContent}${fileContext}

Answer sub-question ${index + 1} of ${total}: "${qText}"

Write 1–3 detailed paragraphs in plain prose.
- No tables, code blocks, or bullet lists.
- Be specific with data, metrics, dates, and examples where relevant.
- ${PLAN_BALANCE_GUIDE}
- If data is uncertain, say so clearly.` },
    ], 1800, signal);

    const cleaned = answer.trim().replace(/^#+\s*/, '');
    return {
      question: qText,
      answer: cleaned || 'Unable to retrieve sufficient data for this angle.',
    };
  },

  async answerAll({ userContent, fileContext, subQuestions, signal, parallel = false, onProgress }) {
    const total = subQuestions.length;
    if (parallel) {
      let completed = 0;
      const results = await Promise.all(subQuestions.map(async (sq, i) => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const pair = await this.answerOne({ userContent, fileContext, question: sq.question, index: i, total, signal });
        completed++;
        onProgress?.({ index: i, completed, total, parallel: true });
        return pair;
      }));
      return results;
    }

    const results = [];
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const pair = await this.answerOne({ userContent, fileContext, question: subQuestions[i].question, index: i, total, signal });
      results.push(pair);
      onProgress?.({ index: i, completed: i + 1, total, parallel: false });
    }
    return results;
  },

  async qualityGate({ userContent, fileContext, qaPairs, signal }) {
    if (qaPairs.length <= 3) return qaPairs;

    const summary = qaPairs.map((p, i) => (
      `[${i + 1}] Q: ${p.question}\nA: ${truncatePlanText(p.answer, 600)}`
    )).join('\n\n');

    const raw = await callLLM([
      { role: 'system', content: 'You review research sub-answers and filter weak or contradictory ones. Return only valid JSON.' },
      { role: 'user', content: `Original query: ${userContent}${fileContext}

Review these sub-question answers. Drop answers that are:
- Empty, vague, or placeholder ("unable to retrieve", no real substance)
- Clearly factually contradictory to stronger answers elsewhere
- Heavily redundant (same point already covered better by another answer)

Do NOT drop answers merely for being cautious, mixed, or balanced.

Return ONLY JSON:
{"drop": [1-based indices to exclude], "notes": "brief optional summary"}

Rules:
- Use 1-based indices matching [1], [2], etc.
- Keep at least ${Math.max(3, Math.ceil(qaPairs.length * 0.5))} answers.
- When uncertain, keep the answer.

Sub-answers:
${summary}` },
    ], 1500, signal);

    let dropIndices = new Set();
    try {
      const extracted = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(extracted ? extracted[0] : raw);
      const drops = parsed.drop || parsed.remove || parsed.exclude || [];
      if (Array.isArray(drops)) {
        drops.forEach(n => {
          const idx = parseInt(n, 10);
          if (idx >= 1 && idx <= qaPairs.length) dropIndices.add(idx);
        });
      }
    } catch {}

    const minKeep = Math.max(3, Math.ceil(qaPairs.length * 0.5));
    let filtered = qaPairs.filter((_, i) => !dropIndices.has(i + 1));
    if (filtered.length < minKeep) return qaPairs;
    return filtered.length ? filtered : qaPairs;
  },

  async synthesizer({ userContent, fileContext, qaPairs, signal, onDelta }) {
    let finalAnswer = '';
    let lastError = null;
    for (let level = 0; level < SYNTHESIS_REDUCTIONS.length; level++) {
      try {
        const { messages } = buildSynthesisMessages(userContent, fileContext, qaPairs, level);
        finalAnswer = '';
        const streamed = await streamChatCompletion(messages, {
          signal,
          maxTokens: 8000,
          onDelta: (_delta, full) => {
            finalAnswer = full;
            if (onDelta) onDelta(full);
          },
        });
        return streamed || finalAnswer;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        lastError = err;
        if (isContextLengthError(err.message) && level < SYNTHESIS_REDUCTIONS.length - 1) continue;
        throw err;
      }
    }
    throw lastError || new Error('Synthesis failed after context reduction');
  },
};

async function runStructuredAnalysis(query, { parallel = false, qualityGate = false, appendUser = true } = {}) {
  if (isStreaming || !state.apiKey) return;

  const userContent = query.trim();
  if (appendUser) {
    const imgPreview = uploadedImage?.dataUrl || null;
    const msgRecord = {
      role: 'user',
      content: userContent,
      imageName: uploadedImage?.name || undefined,
    };
    if (uploadedImage?.dataUrl && uploadedImage.dataUrl.length <= 600000) {
      msgRecord.imageDataUrl = uploadedImage.dataUrl;
    }
    addMessage('query', userContent, false, imgPreview);
    state.messages.push(msgRecord);
    saveState();
  }

  let fileContext = uploadedText.trim()
    ? `\n\nAttached file context (${uploadedFile ? uploadedFile.name : 'file'}):\n${uploadedText.trim().substring(0, 50000)}`
    : '';

  const { div: progressDiv, body: progressBody } = addMessage('response', '', true);
  const progressEl = progressBody.querySelector('#loading');
  isStreaming = true;
  sendBtn.disabled = true;
  stopBtn.classList.add('active');
  abortController = new AbortController();
  const signal = abortController.signal;

  const sys = state.systemPrompt
    ? [{ role: 'system', content: state.systemPrompt }]
    : [];

  const questionList = [];
  let contextNote = '';
  let finalAnswer = '';

  function renderThinkingUI({ activeIndex = -1, completedCount = 0, phase = 'planning', parallel = false } = {}) {
    if (progressEl) progressEl.classList.remove('active');
    const showDots = ['vision', 'planning', 'answering', 'quality', 'synthesizing'].includes(phase);
    const isDone = phase === 'done';
    const dots = showDots ? '<span class="plan-thinking-dots"><span>.</span><span>.</span><span>.</span></span>' : '';
    const headerLabel = isDone ? 'Thought' : 'Thinking';
    const chevron = isDone ? `<span class="plan-thinking-chevron">${progressBody.dataset.thinkingOpen === '1' ? '▼' : '▶'}</span>` : '';

    let questionsHtml = '';
    if (questionList.length) {
      questionsHtml = questionList.map((q, i) => {
        let cls = 'plan-thinking-q';
        if (phase === 'answering') {
          if (parallel) {
            if (i < completedCount) cls += ' done';
          } else if (i === activeIndex) {
            cls += ' active';
          } else if (i < activeIndex) {
            cls += ' done';
          }
        } else if (phase === 'quality' || phase === 'synthesizing' || isDone) {
          cls += ' done';
        }
        return `<div class="${cls}">${i + 1}. ${escapeHtml(q)}</div>`;
      }).join('');
      if (phase === 'answering' && parallel && completedCount < questionList.length) {
        questionsHtml += `<div class="plan-thinking-q active">Answering in parallel… ${completedCount}/${questionList.length}</div>`;
      }
      if (phase === 'quality') {
        questionsHtml += '<div class="plan-thinking-q active">Reviewing answer quality…</div>';
      }
      if (phase === 'synthesizing') {
        questionsHtml += '<div class="plan-thinking-q active">Synthesizing final answer…</div>';
      }
    } else if (phase === 'vision') {
      questionsHtml = '<div class="plan-thinking-q active">Analyzing attached image…</div>';
    } else {
      questionsHtml = '<div class="plan-thinking-q active">Planning…</div>';
    }

    if (contextNote) {
      questionsHtml = `<div class="plan-thinking-q done">${escapeHtml(contextNote)}</div>` + questionsHtml;
    }

    const questionsCollapsed = isDone && progressBody.dataset.thinkingOpen !== '1';
    const existingAnswer = progressBody.querySelector('#plan-answer');
    const answerHtml = existingAnswer ? existingAnswer.outerHTML : (phase === 'synthesizing' || isDone ? '<div class="plan-answer" id="plan-answer"></div>' : '');

    progressBody.innerHTML = `
      <div class="plan-thinking">
        <div class="plan-thinking-header${isDone ? ' done' : ''}" id="plan-thinking-toggle">
          ${chevron}${headerLabel}${dots}
        </div>
        <div class="plan-thinking-questions${questionsCollapsed ? ' collapsed' : ''}" id="plan-thinking-questions">${questionsHtml}</div>
      </div>
      ${answerHtml}
    `;

    if (isDone) {
      const toggle = progressBody.querySelector('#plan-thinking-toggle');
      toggle?.addEventListener('click', () => {
        progressBody.dataset.thinkingOpen = progressBody.dataset.thinkingOpen === '1' ? '0' : '1';
        renderThinkingUI({ phase: 'done' });
        const ans = progressBody.querySelector('#plan-answer');
        if (ans && progressBody.dataset.finalAnswer) {
          ans.innerHTML = renderMarkdown(progressBody.dataset.finalAnswer);
        }
      });
    }

    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function updatePlanAnswer(text) {
    let el = progressBody.querySelector('#plan-answer');
    if (!el) {
      renderThinkingUI({ phase: 'synthesizing' });
      el = progressBody.querySelector('#plan-answer');
    }
    if (el) {
      el.innerHTML = renderMarkdown(text);
      progressBody.dataset.finalAnswer = text;
    }
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  try {
    if (uploadedImage) {
      renderThinkingUI({ phase: 'vision' });
      try {
        const imageDesc = await Vision.describeForContext(uploadedImage, signal);
        fileContext += `\n\n## Attached image (${uploadedImage.name})\n${imageDesc}`;
        contextNote = '✓ Image analyzed';
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        contextNote = `⚠ Image analysis skipped: ${(err.message || 'unavailable').slice(0, 60)}`;
      }
    }

    renderThinkingUI({ phase: 'planning' });

    const subQuestions = await PlanPipeline.planner({ userContent, fileContext, sys, signal });
    questionList.push(...subQuestions.map(sq => PlanPipeline.normalizeQuestion(sq.question)));
    renderThinkingUI({ phase: 'answering', parallel, completedCount: 0 });

    let qaResults = await PlanPipeline.answerAll({
      userContent,
      fileContext,
      subQuestions,
      signal,
      parallel,
      onProgress: ({ index, completed, parallel: isParallel }) => {
        renderThinkingUI({
          phase: 'answering',
          parallel: isParallel,
          activeIndex: isParallel ? -1 : index,
          completedCount: completed,
        });
      },
    });

    if (qualityGate) {
      renderThinkingUI({ phase: 'quality', parallel, completedCount: questionList.length });
      qaResults = await PlanPipeline.qualityGate({ userContent, fileContext, qaPairs: qaResults, signal });
    }

    renderThinkingUI({ phase: 'synthesizing', parallel, completedCount: questionList.length });

    finalAnswer = await PlanPipeline.synthesizer({
      userContent,
      fileContext,
      qaPairs: qaResults,
      signal,
      onDelta: (full) => updatePlanAnswer(full),
    });

    if (!finalAnswer.trim()) throw new Error('Empty synthesis response');
    progressBody.dataset.thinkingOpen = '0';
    renderThinkingUI({ phase: 'done' });
    updatePlanAnswer(finalAnswer.trim());
    state.messages.push({ role: 'assistant', content: finalAnswer.trim() });
    saveState();
    addMessageButtons(progressDiv, 'response', finalAnswer.trim());

  } catch (err) {
    if (err.name === 'AbortError') {
      if (finalAnswer?.trim()) {
        progressBody.dataset.thinkingOpen = '0';
        renderThinkingUI({ phase: 'done' });
        updatePlanAnswer(finalAnswer.trim());
        state.messages.push({ role: 'assistant', content: finalAnswer.trim() });
        saveState();
        addMessageButtons(progressDiv, 'response', finalAnswer.trim());
      } else if (questionList.length) {
        renderThinkingUI({ phase: 'done' });
        progressBody.querySelector('#plan-answer')?.remove();
      }
      return;
    }
    if (progressEl) progressEl.classList.remove('active');
    let msg = err.message || 'Analysis failed';
    if (msg.includes('401')) msg = 'Invalid API key. Set it in settings.';
    else if (msg.includes('402')) msg = 'Model out of credits. Try a free model.';
    else if (msg.includes('Failed to fetch')) msg = 'Network error. Check your connection.';
    progressBody.innerHTML = `<div style="color:var(--red);font-size:12px">⚠ ${msg}</div>`;
  } finally {
    isStreaming = false;
    stopBtn.classList.remove('active');
    sendBtn.disabled = false;
    abortController = null;
    clearAttachments();
    updateStatusBar();
  }
}

async function doDeepResearch(query) {
  return runStructuredAnalysis(query, {
    parallel: !!state.researchParallel,
    qualityGate: !!state.researchQualityGate,
  });
}
