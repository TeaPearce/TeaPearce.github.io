import * as webllm from "./webllm.js";
import jiebaInit, { cut as jiebaCut } from "./lib/jieba/jieba_rs_wasm.js";

// ── Hide loading overlay, show app ──
document.getElementById("loading-overlay").style.display = "none";
document.getElementById("app").style.display = "";

// ── Check WebGPU ──
const hasWebGPU = !!navigator.gpu;
if (!hasWebGPU) {
  document.getElementById("webgpu-warning").style.display = "";
  document.getElementById("load-model-btn").disabled = true;
}

// ── State ──
let engine = null;
let selectedModel = "Qwen3-8B-q4f16_1-MLC";
let selectedSystem = "hsk3";
let selectedLevel = 3;

const HSK_LEVELS = {
  hsk3: [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 5, label: "5" },
    { value: 6, label: "6" },
    { value: 7, label: "7-9" },
  ],
  hsk2: [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 5, label: "5" },
    { value: 6, label: "6" },
  ],
};

// ── DOM refs ──
const modelToggle = document.getElementById("model-toggle");
const modelStatus = document.getElementById("model-status");
const hskSystemToggle = document.getElementById("hsk-system-toggle");
const hskLevelToggle = document.getElementById("hsk-level-toggle");
const inputText = document.getElementById("input-text");
const loadBtn = document.getElementById("load-model-btn");
const simplifyBtn = document.getElementById("simplify-btn");
const stopBtn = document.getElementById("stop-btn");
const outputSection = document.getElementById("output-section");
const outputText = document.getElementById("output-text");

let abortController = null;

// ── Toggle helpers ──
function setupToggle(container, callback) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".toggle-btn");
    if (!btn || btn.classList.contains("active")) return;
    container.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    callback(btn);
  });
}

function renderLevelButtons() {
  const levels = HSK_LEVELS[selectedSystem];
  hskLevelToggle.innerHTML = levels
    .map(
      (l) =>
        `<button class="toggle-btn ${l.value === selectedLevel ? "active" : ""}" data-level="${l.value}">${l.label}</button>`
    )
    .join("");
  // Clamp selected level
  if (!levels.find((l) => l.value === selectedLevel)) {
    selectedLevel = levels[levels.length - 1].value;
    hskLevelToggle.querySelector(`[data-level="${selectedLevel}"]`).classList.add("active");
  }
}

// ── Init toggles ──
setupToggle(modelToggle, (btn) => {
  selectedModel = btn.dataset.model;
  // Reset engine if model changed
  if (engine) {
    engine = null;
    simplifyBtn.disabled = true;
    setStatus("Model changed — click Load Model", "");
  }
});

setupToggle(hskSystemToggle, (btn) => {
  selectedSystem = btn.dataset.system;
  renderLevelButtons();
});

hskLevelToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  hskLevelToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  selectedLevel = parseInt(btn.dataset.level);
});

renderLevelButtons();

// ── Thinking toggle ──
const thinkingToggle = document.getElementById("thinking-toggle");
let thinkingEnabled = false;
thinkingToggle.addEventListener("click", () => {
  thinkingEnabled = !thinkingEnabled;
  thinkingToggle.textContent = `Thinking: ${thinkingEnabled ? "On" : "Off"}`;
  thinkingToggle.classList.toggle("active", thinkingEnabled);
  thinkingToggle.dataset.enabled = thinkingEnabled;
});

// ── Temperature slider ──
const tempSlider = document.getElementById("temp-slider");
const tempValue = document.getElementById("temp-value");
let temperature = 0.3;
tempSlider.addEventListener("input", () => {
  temperature = parseFloat(tempSlider.value);
  tempValue.textContent = temperature.toFixed(1);
});

// ── Status helper ──
function setStatus(msg, cls) {
  modelStatus.textContent = msg;
  modelStatus.className = "status-bar " + (cls || "");
}

// ── Load model ──
loadBtn.addEventListener("click", async () => {
  loadBtn.disabled = true;
  setStatus(`Loading ${selectedModel}...`, "loading");

  try {
    engine = await webllm.CreateMLCEngine(selectedModel, {
      initProgressCallback: (progress) => {
        setStatus(progress.text, "loading");
      },
    });
    setStatus(`${selectedModel} ready`, "ready");
    simplifyBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`, "error");
    engine = null;
  } finally {
    loadBtn.disabled = false;
  }
});

// ── Build prompt ──
function buildPrompt(text, system, level) {
  const systemName = system === "hsk3" ? "HSK 3.0 (2025)" : "HSK 2.0";
  const levelLabel = system === "hsk3" && level === 7 ? "7-9" : level;
  const maxLevel = system === "hsk3" ? 7 : 6;

  return [
    {
      role: "system",
      content: `You are a Chinese language simplification assistant. Your task is to rewrite Chinese text so it only uses vocabulary and grammar appropriate for ${systemName} Level ${levelLabel} learners. 

Rules:
- Replace advanced words with simpler synonyms known at the target level
- Simplify complex grammar structures
- Keep the original meaning as close as possible
- Leave English words and acronyms unchanged
- Output ONLY the simplified Chinese text, nothing else
- Do not add explanations, translations, or annotations
- If a sentence cannot be simplified further, keep it as-is`,
    },
    {
      role: "user",
      content: `Simplify the following text to ${systemName} Level ${levelLabel}:\n\n${text}`,
    },
  ];
}

// ── Simplify ──
simplifyBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) return;
  if (!engine) return;

  abortController = new AbortController();
  simplifyBtn.style.display = "none";
  stopBtn.style.display = "";
  outputSection.style.display = "";
  outputText.textContent = "";
  outputText.classList.add("streaming");

  // Reset chat state in case previous generation was interrupted
  await engine.resetChat();

  try {
    const messages = buildPrompt(text, selectedSystem, selectedLevel);
    const stream = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: temperature,
      max_tokens: 2048,
      extra_body: {
        enable_thinking: thinkingEnabled,
      },
    });

    let result = "";
    for await (const chunk of stream) {
      if (abortController.signal.aborted) break;
      const delta = chunk.choices[0]?.delta?.content || "";
      result += delta;
      outputText.textContent = result;
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
      outputText.textContent = `Error: ${err.message}`;
    }
  } finally {
    abortController = null;
    outputText.classList.remove("streaming");
    stopBtn.style.display = "none";
    simplifyBtn.style.display = "";
    simplifyBtn.disabled = false;
  }
});

// ── Stop ──
stopBtn.addEventListener("click", async () => {
  if (abortController) abortController.abort();
  try { engine.interruptGenerate(); } catch (_) {}
  // Force UI reset in case the finally block is stuck
  abortController = null;
  outputText.classList.remove("streaming");
  stopBtn.style.display = "none";
  simplifyBtn.style.display = "";
  simplifyBtn.disabled = false;
});

// ══════════════════════════════════════════
// ── Word Analyzer ──
// ══════════════════════════════════════════

let hsk2Data = null;
let hsk3Data = null;
let cedictData = null;
let analyzerSystem = "hsk3";
let selectedSegmenter = "jieba";
let jiebaReady = false;

const analyzerHskToggle = document.getElementById("analyzer-hsk-toggle");
const segmenterToggle = document.getElementById("segmenter-toggle");
const segmenterStatus = document.getElementById("segmenter-status");
const analyzerInput = document.getElementById("analyzer-input");
const analyzeBtn = document.getElementById("analyze-btn");
const analyzerOutput = document.getElementById("analyzer-output");
const analyzerOutputSection = document.getElementById("analyzer-output-section");
const wordDetailPanel = document.getElementById("word-detail-panel");
const hskLegend = document.getElementById("hsk-legend");

// Load dictionary data and jieba
async function loadDictionaries() {
  const [h2, h3, cc] = await Promise.all([
    fetch("data/hsk2_union.json").then((r) => r.json()),
    fetch("data/hsk3.json").then((r) => r.json()),
    fetch("data/cedict.json").then((r) => r.json()),
  ]);
  hsk2Data = h2;
  hsk3Data = h3;
  cedictData = cc;
}

async function initJieba() {
  try {
    await jiebaInit({ module_or_path: new URL("./lib/jieba/jieba_rs_wasm_bg.wasm", import.meta.url) });
    jiebaReady = true;
    segmenterStatus.textContent = "jieba ready";
    segmenterStatus.className = "status-bar ready";
  } catch (err) {
    console.error("jieba init failed:", err);
    segmenterStatus.textContent = "jieba failed to load — using Intl.Segmenter";
    segmenterStatus.className = "status-bar error";
    selectedSegmenter = "intl";
  }
}

loadDictionaries().catch((err) => console.error("Failed to load dictionaries:", err));
initJieba();

// HSK level colors
const HSK_COLORS = {
  1: { cls: "hsk-l1", label: "HSK 1", color: "#4ade80" },
  2: { cls: "hsk-l2", label: "HSK 2", color: "#22d3ee" },
  3: { cls: "hsk-l3", label: "HSK 3", color: "#60a5fa" },
  4: { cls: "hsk-l4", label: "HSK 4", color: "#a78bfa" },
  5: { cls: "hsk-l5", label: "HSK 5", color: "#f472b6" },
  6: { cls: "hsk-l6", label: "HSK 6", color: "#fb923c" },
  7: { cls: "hsk-l7", label: "HSK 7-9", color: "#f87171" },
};

// Analyzer HSK toggle
setupToggle(analyzerHskToggle, (btn) => {
  analyzerSystem = btn.dataset.system;
});

// Segmenter toggle
setupToggle(segmenterToggle, (btn) => {
  selectedSegmenter = btn.dataset.segmenter;
  if (selectedSegmenter === "jieba") {
    segmenterStatus.textContent = jiebaReady ? "jieba ready" : "Loading jieba...";
    segmenterStatus.className = "status-bar " + (jiebaReady ? "ready" : "loading");
  } else {
    segmenterStatus.textContent = "Intl.Segmenter ready";
    segmenterStatus.className = "status-bar ready";
  }
});

// Segment Chinese text
function segmentText(text) {
  if (selectedSegmenter === "jieba" && jiebaReady) {
    const words = jiebaCut(text, true);
    return words.map((w) => ({
      text: w,
      isWord: /[\u4e00-\u9fff]/.test(w),
    }));
  }
  // Fallback: Intl.Segmenter
  const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
  return Array.from(segmenter.segment(text), (seg) => ({
    text: seg.segment,
    isWord: seg.isWordLike,
  }));
}

// Look up a word in dictionaries
function lookupWord(word) {
  const hskDict = analyzerSystem === "hsk3" ? hsk3Data : hsk2Data;
  const hskEntry = hskDict?.[word];
  const cedictEntry = cedictData?.[word];

  if (hskEntry) {
    return {
      hanzi: word,
      pinyin: hskEntry.pinyin,
      english: hskEntry.english,
      level: hskEntry.level,
      source: analyzerSystem === "hsk3" ? "HSK 3.0" : "HSK 2.0",
    };
  }
  if (cedictEntry) {
    return {
      hanzi: word,
      pinyin: cedictEntry.pinyin,
      english: cedictEntry.english,
      level: null,
      source: "CC-CEDICT",
    };
  }
  // Break into individual characters and look each up
  if (word.length > 1) {
    const chars = [...word];
    const parts = chars.map((ch) => {
      const chHsk = hskDict?.[ch];
      const chCedict = cedictData?.[ch];
      if (chHsk) return { hanzi: ch, pinyin: chHsk.pinyin, english: chHsk.english, level: chHsk.level, source: analyzerSystem === "hsk3" ? "HSK 3.0" : "HSK 2.0" };
      if (chCedict) return { hanzi: ch, pinyin: chCedict.pinyin, english: chCedict.english, level: null, source: "CC-CEDICT" };
      return { hanzi: ch, pinyin: "?", english: "?", level: null, source: "Unknown" };
    });
    return {
      hanzi: word,
      pinyin: parts.map((p) => p.pinyin).join(" "),
      english: parts.map((p) => `${p.hanzi}: ${p.english}`).join(" · "),
      level: null,
      source: "Char breakdown",
      charBreakdown: parts,
    };
  }
  return null;
}

// Show word detail on hover
function showWordDetail(info) {
  if (!info) {
    wordDetailPanel.innerHTML = '<div class="word-detail-placeholder">Hover over a word to see details</div>';
    return;
  }
  const levelClass = info.level ? HSK_COLORS[info.level]?.cls || "" : "";
  const levelLabel = info.level
    ? `${info.source} Level ${info.level === 7 ? "7-9" : info.level}`
    : info.source === "Char breakdown"
      ? "Not in dictionaries · Character breakdown"
      : `Not in HSK · ${info.source}`;

  let breakdownHtml = "";
  if (info.charBreakdown) {
    breakdownHtml = '<div class="char-breakdown">' +
      info.charBreakdown.map((p) => {
        const cls = p.level ? HSK_COLORS[p.level]?.cls || "" : "";
        return `<div class="char-breakdown-item">` +
          `<span class="char-breakdown-hanzi ${cls}">${p.hanzi}</span>` +
          `<span class="char-breakdown-pinyin">${p.pinyin}</span>` +
          `<span class="char-breakdown-english">${p.english}</span>` +
          `</div>`;
      }).join("") +
      "</div>";
  }

  wordDetailPanel.innerHTML = `
    <div class="word-detail-hanzi ${levelClass}">${info.hanzi}</div>
    <div class="word-detail-pinyin">${info.pinyin}</div>
    ${info.charBreakdown ? breakdownHtml : `<div class="word-detail-english">${info.english}</div>`}
    <div class="word-detail-level">${levelLabel}</div>
  `;
}

// Render legend
function renderLegend() {
  const maxLevel = analyzerSystem === "hsk3" ? 7 : 6;
  let html = "";
  for (let i = 1; i <= maxLevel; i++) {
    const c = HSK_COLORS[i];
    html += `<span class="legend-item"><span class="legend-dot" style="background:${c.color}"></span>${c.label}</span>`;
  }
  html += `<span class="legend-item"><span class="legend-dot" style="background:#d4a017"></span>Other</span>`;
  hskLegend.innerHTML = html;
}

// Analyze button
analyzeBtn.addEventListener("click", () => {
  const text = analyzerInput.value.trim();
  if (!text) return;
  if (!hsk2Data || !hsk3Data || !cedictData) {
    alert("Dictionaries still loading, please wait...");
    return;
  }

  const segments = segmentText(text);
  analyzerOutput.innerHTML = "";
  analyzerOutputSection.style.display = "";

  for (const seg of segments) {
    if (!seg.isWord) {
      analyzerOutput.appendChild(document.createTextNode(seg.text));
      continue;
    }

    const info = lookupWord(seg.text);
    const span = document.createElement("span");
    span.className = "hsk-word";
    span.textContent = seg.text;

    if (info && info.level) {
      span.classList.add(HSK_COLORS[info.level]?.cls || "hsk-unknown");
    } else {
      span.classList.add("hsk-unknown");
    }

    span.addEventListener("mouseenter", () => showWordDetail(info || { hanzi: seg.text, pinyin: "?", english: "Not found", level: null, source: "Unknown" }));
    analyzerOutput.appendChild(span);
  }

  renderLegend();
});

// ══════════════════════════════════════════
// Text to Speech (Piper TTS + Sherpa-ONNX Matcha)
// ══════════════════════════════════════════

const ttsEngineToggle = document.getElementById("tts-engine-toggle");
const ttsVoiceToggle = document.getElementById("tts-voice-toggle");
const ttsPiperVoices = document.getElementById("tts-piper-voices");
const ttsStatus = document.getElementById("tts-status");
const ttsInput = document.getElementById("tts-input");
const ttsSpeakBtn = document.getElementById("tts-speak-btn");
const ttsPauseBtn = document.getElementById("tts-pause-btn");
const ttsStopBtn = document.getElementById("tts-stop-btn");

let ttsEngine = "sherpa-baker"; // "piper", "sherpa", or "sherpa-baker"
let ttsModule = null; // piper module
let ttsVoice = "zh_CN-huayan-medium";
let ttsAudio = null;
let ttsLoading = false;

// Sherpa state — one worker per model build
const sherpaWorkers = {}; // engine key → { worker, ready, loading }
let sherpaAudioCtx = null;
let sherpaSource = null;
let sherpaPaused = false;
let sherpaBuffer = null;
let sherpaPauseOffset = 0;
let sherpaStartTime = 0;

const SHERPA_WORKER_PATHS = {
  sherpa: "lib/sherpa-tts/sherpa-onnx-tts.worker.js",
  "sherpa-baker": "lib/sherpa-tts-baker/sherpa-onnx-tts.worker.js",
};

// Engine toggle
ttsEngineToggle.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-engine]");
  if (!btn) return;
  ttsEngineToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  ttsEngine = btn.dataset.engine;
  ttsPiperVoices.style.display = ttsEngine === "piper" ? "" : "none";
  if (ttsEngine !== "piper") initSherpa(ttsEngine);
});

// Piper voice toggle
ttsVoiceToggle.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-voice]");
  if (!btn) return;
  ttsVoiceToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  ttsVoice = btn.dataset.voice;
});

// ── Piper TTS ──
async function ensurePiper() {
  if (ttsModule) return;
  if (ttsLoading) return;
  ttsLoading = true;
  ttsStatus.textContent = "Loading Piper TTS library...";
  try {
    ttsModule = await import("./lib/piper/piper-tts-web.js");
    ttsStatus.textContent = "Piper TTS ready. First speak will download voice model.";
  } catch (err) {
    console.error("Failed to load Piper TTS:", err);
    ttsStatus.textContent = "Failed to load Piper TTS: " + err.message;
    ttsLoading = false;
  }
}

// ── Sherpa-ONNX Matcha TTS ──
function initSherpa(engineKey) {
  if (sherpaWorkers[engineKey]) return;
  const workerPath = SHERPA_WORKER_PATHS[engineKey];
  if (!workerPath) return;

  sherpaWorkers[engineKey] = { worker: null, ready: false, loading: true };
  ttsStatus.textContent = "Loading Matcha TTS model, please wait...";

  const w = new Worker(workerPath);
  sherpaWorkers[engineKey].worker = w;

  w.onmessage = (e) => {
    // Only update status if this engine is still selected
    const isActive = ttsEngine === engineKey;

    if (e.data.type === "sherpa-onnx-tts-progress") {
      if (!isActive) return;
      const status = e.data.status;
      const dlMatch = status.match(/Downloading data... \((\d+)\/(\d+)\)/);
      if (dlMatch) {
        const downloaded = Number(dlMatch[1]);
        const total = Number(dlMatch[2]);
        const pct = total === 0 ? 0 : ((downloaded / total) * 100).toFixed(1);
        const dlMB = (downloaded / 1024 / 1024).toFixed(1);
        const totalMB = (total / 1024 / 1024).toFixed(1);
        ttsStatus.textContent = `Downloading model... ${pct}% (${dlMB}/${totalMB} MB)`;
      } else if (status === "Running...") {
        ttsStatus.textContent = "Model downloaded. Initializing Matcha TTS...";
      } else {
        ttsStatus.textContent = status;
      }
      return;
    }
    if (e.data.type === "sherpa-onnx-tts-ready") {
      sherpaWorkers[engineKey].ready = true;
      sherpaWorkers[engineKey].loading = false;
      if (isActive) ttsStatus.textContent = "Matcha TTS ready.";
      return;
    }
    if (e.data.type === "error") {
      if (isActive) {
        ttsStatus.textContent = "Matcha TTS error: " + e.data.message;
        ttsSpeakBtn.disabled = false;
        ttsSpeakBtn.textContent = "🔊 Speak";
      }
      return;
    }
    if (e.data.type === "sherpa-onnx-tts-result") {
      onSherpaAudio(e.data.samples, e.data.sampleRate);
      return;
    }
  };
}

function onSherpaAudio(samples, sampleRate) {
  if (!sherpaAudioCtx) {
    sherpaAudioCtx = new AudioContext({ sampleRate });
  }
  sherpaBuffer = sherpaAudioCtx.createBuffer(1, samples.length, sampleRate);
  sherpaBuffer.getChannelData(0).set(samples);

  sherpaPauseOffset = 0;
  sherpaPaused = false;
  playSherpaBuffer();

  ttsSpeakBtn.disabled = false;
  ttsSpeakBtn.textContent = "🔊 Speak";
  ttsPauseBtn.style.display = "";
  ttsStopBtn.style.display = "";
  ttsPauseBtn.textContent = "⏸ Pause";
  ttsStatus.textContent = "Playing (Matcha TTS)...";
}

function playSherpaBuffer() {
  if (!sherpaBuffer || !sherpaAudioCtx) return;
  sherpaSource = sherpaAudioCtx.createBufferSource();
  sherpaSource.buffer = sherpaBuffer;
  sherpaSource.connect(sherpaAudioCtx.destination);
  sherpaSource.onended = () => {
    if (!sherpaPaused) {
      ttsPauseBtn.style.display = "none";
      ttsStopBtn.style.display = "none";
      ttsStatus.textContent = "Playback finished.";
    }
  };
  sherpaStartTime = sherpaAudioCtx.currentTime;
  sherpaSource.start(0, sherpaPauseOffset);
}

// ── Unified handlers ──

// Pre-load default TTS engine on page load
initSherpa("sherpa-baker");

ttsSpeakBtn.addEventListener("click", async () => {
  const text = ttsInput.value.trim();
  if (!text) return;

  // Stop any current playback
  stopAllTTS();

  if (ttsEngine === "piper") {
    await ensurePiper();
    if (!ttsModule) return;

    ttsSpeakBtn.disabled = true;
    ttsSpeakBtn.textContent = "⏳ Generating...";
    ttsStatus.textContent = `Generating speech with ${ttsVoice}...`;

    try {
      const wav = await ttsModule.predict(
        { text, voiceId: ttsVoice },
        (progress) => {
          if (progress.total) {
            const pct = Math.round((progress.loaded * 100) / progress.total);
            ttsStatus.textContent = `Downloading voice model... ${pct}%`;
          }
        }
      );

      ttsAudio = new Audio();
      ttsAudio.src = URL.createObjectURL(wav);
      ttsAudio.addEventListener("ended", () => {
        ttsPauseBtn.style.display = "none";
        ttsStopBtn.style.display = "none";
        ttsSpeakBtn.textContent = "🔊 Speak";
        ttsStatus.textContent = "Playback finished.";
      });

      ttsPauseBtn.style.display = "";
      ttsStopBtn.style.display = "";
      ttsPauseBtn.textContent = "⏸ Pause";
      ttsStatus.textContent = "Playing (Piper)...";
      ttsAudio.play();
    } catch (err) {
      console.error("Piper TTS error:", err);
      ttsStatus.textContent = "TTS error: " + err.message;
    } finally {
      ttsSpeakBtn.disabled = false;
      ttsSpeakBtn.textContent = "🔊 Speak";
    }
  } else {
    // Sherpa Matcha
    const sw = sherpaWorkers[ttsEngine];
    if (!sw || !sw.ready) {
      initSherpa(ttsEngine);
      ttsStatus.textContent = "Matcha TTS still loading, please wait...";
      return;
    }
    ttsSpeakBtn.disabled = true;
    ttsSpeakBtn.textContent = "⏳ Generating...";
    ttsStatus.textContent = "Generating speech with Matcha TTS...";
    sw.worker.postMessage({
      text,
      sid: 0,
      speed: 1.0,
      type: "generate",
    });
  }
});

ttsPauseBtn.addEventListener("click", () => {
  if (ttsEngine === "piper") {
    if (!ttsAudio) return;
    if (ttsAudio.paused) {
      ttsAudio.play();
      ttsPauseBtn.textContent = "⏸ Pause";
      ttsStatus.textContent = "Playing (Piper)...";
    } else {
      ttsAudio.pause();
      ttsPauseBtn.textContent = "▶ Resume";
      ttsStatus.textContent = "Paused.";
    }
  } else {
    if (!sherpaSource || !sherpaAudioCtx) return;
    if (!sherpaPaused) {
      sherpaPauseOffset += sherpaAudioCtx.currentTime - sherpaStartTime;
      sherpaSource.onended = null;
      sherpaSource.stop();
      sherpaPaused = true;
      ttsPauseBtn.textContent = "▶ Resume";
      ttsStatus.textContent = "Paused.";
    } else {
      sherpaPaused = false;
      playSherpaBuffer();
      ttsPauseBtn.textContent = "⏸ Pause";
      ttsStatus.textContent = "Playing (Matcha TTS)...";
    }
  }
});

function stopAllTTS() {
  // Stop Piper
  if (ttsAudio) {
    ttsAudio.pause();
    ttsAudio = null;
  }
  // Stop Sherpa
  if (sherpaSource) {
    try { sherpaSource.onended = null; sherpaSource.stop(); } catch (_) {}
    sherpaSource = null;
  }
  sherpaBuffer = null;
  sherpaPaused = false;
  sherpaPauseOffset = 0;
  ttsPauseBtn.style.display = "none";
  ttsStopBtn.style.display = "none";
}

ttsStopBtn.addEventListener("click", () => {
  stopAllTTS();
  ttsStatus.textContent = "Stopped.";
});
