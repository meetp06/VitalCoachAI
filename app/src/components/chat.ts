/* ──────────────────────────────────────────────────
   VitalCoach — Chat Component
   Conversational copilot panel with text input,
   voice check-in, meal image upload, structured
   response cards. Sponsor: Assistant UI
   ────────────────────────────────────────────────── */

import type { ChatMessage, HealthContext, MealAnalysisResult, MoodCheckin, ActionPlan } from '../lib/types.js';
import { escapeHtml, sanitizeTextInput, generateId, validateImageFile } from '../lib/safety.js';
import { generateChatResponse, analyzeMealImage, interpretVoiceCheckin, generateInsight } from '../lib/deepmind.js';
import { DEMO_WELCOME_MESSAGE, DEMO_HEALTH_CONTEXT } from '../lib/demo-data.js';

// ─── State ────────────────────────────────────────

let messages: ChatMessage[] = [];
let isTyping = false;
let isRecording = false;
let healthContext: HealthContext = DEMO_HEALTH_CONTEXT;
let chatContainer: HTMLElement | null = null;
let messagesContainer: HTMLElement | null = null;

// ─── Initialize ───────────────────────────────────

export function initChat(container: HTMLElement, ctx?: HealthContext): void {
  chatContainer = container;
  if (ctx) healthContext = ctx;

  // Add welcome message
  messages = [
    {
      id: generateId(),
      role: 'assistant',
      content: DEMO_WELCOME_MESSAGE,
      contentType: 'text',
      timestamp: new Date().toISOString(),
    },
  ];

  renderChat();
}

export function updateChatContext(ctx: HealthContext): void {
  healthContext = ctx;
}

// ─── Render ───────────────────────────────────────

function renderChat(): void {
  if (!chatContainer) return;

  chatContainer.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-title">
        <span class="sparkle">✦</span> VitalCoach
      </div>
      <div class="chat-sponsor-tag">Powered by Assistant UI</div>
    </div>

    <div class="chat-messages" id="chat-messages">
      ${messages.map(renderMessage).join('')}
      ${isTyping ? renderTypingIndicator() : ''}
    </div>

    <div class="chat-input-area">
      <div class="chat-quick-actions">
        <button class="quick-action" id="qa-analyze" title="Analyze your health data">
          Analyze my data
        </button>
        <button class="quick-action" id="qa-meal" title="Upload a meal photo">
          Meal photo
        </button>
        <button class="quick-action" id="qa-checkin" title="Voice check-in">
          Voice check-in
        </button>
      </div>
      <div class="chat-input-row">
        <textarea
          class="chat-input"
          id="chat-input"
          placeholder="Ask about your health patterns..."
          rows="1"
        ></textarea>
        <button class="chat-btn" id="btn-mic" title="Voice check-in">mic</button>
        <button class="chat-btn" id="btn-camera" title="Upload meal photo">img</button>
        <button class="chat-btn send" id="btn-send" title="Send message">&#8593;</button>
      </div>
      <input type="file" class="file-upload-hidden" id="meal-file-input" accept="image/jpeg,image/png,image/gif,image/webp" />
    </div>
  `;

  messagesContainer = chatContainer.querySelector('#chat-messages');
  bindEvents();
  scrollToBottom();
}

// ─── Message Rendering ────────────────────────────

function renderMessage(msg: ChatMessage): string {
  const isUser = msg.role === 'user';
  const avatarClass = isUser ? 'user-avatar' : 'assistant-avatar';
  const avatarContent = isUser ? '👤' : '✦';

  let bubbleContent = '';

  switch (msg.contentType) {
    case 'meal-analysis':
      bubbleContent = renderMealAnalysisCard(msg.data as MealAnalysisResult, msg.imageUrl);
      break;
    case 'voice-checkin':
      bubbleContent = renderVoiceCheckinCard(msg.data as MoodCheckin);
      break;
    case 'action-plan':
      bubbleContent = renderActionPlanCard(msg.data as ActionPlan);
      break;
    case 'correlation':
      bubbleContent = `<div class="msg-bubble">${formatMarkdown(msg.content)}</div>` +
        (msg.data ? renderCorrelationCard(msg.data as any) : '');
      break;
    default:
      bubbleContent = `<div class="msg-bubble">${isUser ? escapeHtml(msg.content) : formatMarkdown(msg.content)}</div>`;
  }

  if (msg.imageUrl && msg.contentType === 'text') {
    bubbleContent = `
      <div class="msg-bubble">
        <img src="${msg.imageUrl}" class="meal-image-preview" alt="Uploaded meal" />
        <div style="margin-top:8px">${escapeHtml(msg.content)}</div>
      </div>
    `;
  }

  const chipsHtml = (!isUser && msg.suggestions?.length)
    ? renderSuggestionChips(msg.suggestions)
    : '';

  return `
    <div class="chat-message ${msg.role}">
      <div class="msg-avatar ${avatarClass}">${avatarContent}</div>
      <div class="msg-body">
        ${bubbleContent}
        ${chipsHtml}
      </div>
    </div>
  `;
}

function renderMealAnalysisCard(analysis: MealAnalysisResult, imageUrl?: string): string {
  return `
    <div class="msg-card">
      <div class="msg-card-title">Meal Analysis</div>
      ${imageUrl ? `<img src="${imageUrl}" class="meal-image-preview" alt="Analyzed meal" />` : ''}
      <div class="meal-analysis">
        <div class="meal-foods">
          ${analysis.foods.map(f => `
            <span class="meal-food-tag">${escapeHtml(f.name)} (${escapeHtml(f.portion)})</span>
          `).join('')}
        </div>
        <div class="macro-grid">
          <div class="macro-item">
            <div class="macro-value" style="color:var(--accent-orange)">${analysis.macros.calories}</div>
            <div class="macro-label">Calories</div>
          </div>
          <div class="macro-item">
            <div class="macro-value" style="color:var(--accent-red)">${analysis.macros.proteinG}g</div>
            <div class="macro-label">Protein</div>
          </div>
          <div class="macro-item">
            <div class="macro-value" style="color:var(--accent-blue)">${analysis.macros.carbsG}g</div>
            <div class="macro-label">Carbs</div>
          </div>
          <div class="macro-item">
            <div class="macro-value" style="color:var(--accent-yellow)">${analysis.macros.fatG}g</div>
            <div class="macro-label">Fat</div>
          </div>
        </div>
        <div>
          <span class="glycemic-badge ${analysis.glycemicImpact}">
            Glycemic Impact: ${analysis.glycemicImpact}
          </span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-top:4px">
          ${escapeHtml(analysis.contextualNote)}
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;font-style:italic">
          ${escapeHtml(analysis.disclaimer)}
        </div>
      </div>
    </div>
  `;
}

function renderVoiceCheckinCard(checkin: MoodCheckin): string {
  return `
    <div class="msg-card">
      <div class="msg-card-title">Voice Check-in</div>
      <div class="voice-checkin">
        <div class="voice-transcript">"${escapeHtml(checkin.transcript)}"</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
          <span class="voice-tag">Mood: ${escapeHtml(checkin.detectedMood)}</span>
          <span class="voice-tag">Energy: ${checkin.energyLevel}</span>
          <span class="voice-tag">Stress: ${checkin.stressLevel}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
          ${checkin.detectedSymptoms.map(sym => `
            <span class="meal-food-tag">${escapeHtml(sym)}</span>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderActionPlanCard(plan: ActionPlan): string {
  const renderSection = (title: string, _icon: string, items: typeof plan.rightNow) => {
    if (items.length === 0) return '';
    return `
      <div class="action-section">
        <div class="action-section-title">${escapeHtml(title)}</div>
        ${items.map(item => `
          <div class="action-item">
            <span class="action-icon">${item.icon}</span>
            <div class="action-content">
              <div class="action-title">${escapeHtml(item.title)}</div>
              <div class="action-desc">${escapeHtml(item.description)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <div class="msg-card">
      <div class="msg-card-title">Your Action Plan</div>
      <div class="action-plan">
        ${renderSection('Right Now', '', plan.rightNow)}
        ${renderSection('Next Meal', '', plan.nextMeal)}
        ${renderSection('Tonight', '', plan.tonight)}
      </div>
    </div>
  `;
}

function renderCorrelationCard(data: any): string {
  if (!data?.correlations?.length) return '';
  return `
    <div class="msg-card" style="margin-top:8px">
      <div class="msg-card-title">Correlations Found</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${data.correlations.map((c: any) => `
          <div style="padding:8px;background:var(--bg-glass);border-radius:var(--radius-sm);border:1px solid var(--border)">
            <div style="font-size:12px;line-height:1.5;color:var(--text-secondary)">${escapeHtml(c.description)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
              ${c.dataPoints.map((dp: string) => `<span class="meal-food-tag">${escapeHtml(dp)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTypingIndicator(): string {
  return `
    <div class="chat-message assistant">
      <div class="msg-avatar assistant-avatar">✦</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
}

function renderSuggestionChips(suggestions: string[]): string {
  return `
    <div class="suggestion-chips">
      ${suggestions.map(s => `
        <button class="suggestion-chip" data-text="${escapeHtml(s)}">${escapeHtml(s)}</button>
      `).join('')}
    </div>
  `;
}

// ─── Event Handling ───────────────────────────────

function bindEvents(): void {
  if (!chatContainer) return;

  const sendBtn = chatContainer.querySelector('#btn-send') as HTMLButtonElement;
  const micBtn = chatContainer.querySelector('#btn-mic') as HTMLButtonElement;
  const cameraBtn = chatContainer.querySelector('#btn-camera') as HTMLButtonElement;
  const input = chatContainer.querySelector('#chat-input') as HTMLTextAreaElement;
  const fileInput = chatContainer.querySelector('#meal-file-input') as HTMLInputElement;
  const qaAnalyze = chatContainer.querySelector('#qa-analyze') as HTMLButtonElement;
  const qaMeal = chatContainer.querySelector('#qa-meal') as HTMLButtonElement;
  const qaCheckin = chatContainer.querySelector('#qa-checkin') as HTMLButtonElement;

  // Send message
  sendBtn?.addEventListener('click', () => handleSend());

  // Enter to send (shift+enter for newline)
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  // Mic button - voice check-in
  micBtn?.addEventListener('click', () => handleVoiceCheckin());

  // Camera button - file upload
  cameraBtn?.addEventListener('click', () => fileInput?.click());

  // File selected
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleMealUpload(file);
    fileInput.value = '';
  });

  // Quick actions
  qaAnalyze?.addEventListener('click', () => {
    addUserMessage('Give me a full analysis of my health today');
    handleAnalyzeRequest();
  });

  qaMeal?.addEventListener('click', () => fileInput?.click());

  qaCheckin?.addEventListener('click', () => handleVoiceCheckin());

  // Suggestion chip clicks (delegated — chips are re-rendered on every message)
  chatContainer.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('.suggestion-chip') as HTMLElement | null;
    if (!chip) return;
    const text = chip.dataset.text ?? '';
    if (!text) return;
    const inputEl = chatContainer!.querySelector('#chat-input') as HTMLTextAreaElement | null;
    if (inputEl) {
      inputEl.value = text;
      inputEl.dispatchEvent(new Event('input'));
    }
    handleSend();
  });
}

// ─── Message Handlers ─────────────────────────────

async function handleSend(): Promise<void> {
  const input = chatContainer?.querySelector('#chat-input') as HTMLTextAreaElement;
  if (!input) return;

  const text = sanitizeTextInput(input.value);
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  addUserMessage(text);
  showTyping();

  try {
    const { content, suggestions } = await generateChatResponse(text, healthContext);
    hideTyping();
    addMessage({
      id: generateId(),
      role: 'assistant',
      content,
      contentType: 'text',
      timestamp: new Date().toISOString(),
      suggestions,
    });
  } catch {
    hideTyping();
    addAssistantMessage('I encountered an issue. Please try again.');
  }
}

async function handleMealUpload(file: File): Promise<void> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    addAssistantMessage(`⚠️ ${validation.error}`);
    return;
  }

  // Read file as data URL
  const imageUrl = await readFileAsDataUrl(file);

  addMessage({
    id: generateId(),
    role: 'user',
    content: 'Can you analyze this meal?',
    contentType: 'text',
    timestamp: new Date().toISOString(),
    imageUrl,
  });

  showTyping();

  try {
    const analysis = await analyzeMealImage(imageUrl, healthContext);
    healthContext = {
      ...healthContext,
      mealAnalysis: analysis,
    };
    hideTyping();

    addMessage({
      id: generateId(),
      role: 'assistant',
      content: '',
      contentType: 'meal-analysis',
      data: analysis,
      timestamp: new Date().toISOString(),
      imageUrl,
      suggestions: [
        'Would this cause a glucose spike without exercise?',
        'How much protein is in this meal?',
        'What should I add to balance this meal?',
      ],
    });
  } catch {
    hideTyping();
    addAssistantMessage('I had trouble analyzing that image. Please try uploading a clearer photo.');
  }
}

async function handleVoiceCheckin(): Promise<void> {
  if (isRecording) {
    stopRecording();
    return;
  }

  // Check for Web Speech API support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (SpeechRecognition) {
    startRecording(SpeechRecognition);
  } else {
    // Fallback: use demo transcript
    addAssistantMessage('Voice recognition is not supported in this browser. Using a sample check-in for demo purposes.');
    await processVoiceTranscript(
      'I feel really tired today and kind of stressed. My workout this morning felt way harder than usual.'
    );
  }
}

function startRecording(SpeechRecognitionClass: any): void {
  isRecording = true;
  updateMicButton();

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = async (event: any) => {
    const transcript = event.results[0][0].transcript;
    isRecording = false;
    updateMicButton();
    await processVoiceTranscript(transcript);
  };

  recognition.onerror = () => {
    isRecording = false;
    updateMicButton();
    // Fallback to demo
    processVoiceTranscript(
      'I feel really tired today and kind of stressed. My workout this morning felt way harder than usual.'
    );
  };

  recognition.onend = () => {
    isRecording = false;
    updateMicButton();
  };

  recognition.start();
  addAssistantMessage('Listening — speak your check-in now.');
}

function stopRecording(): void {
  isRecording = false;
  updateMicButton();
}

function updateMicButton(): void {
  const micBtn = chatContainer?.querySelector('#btn-mic') as HTMLButtonElement;
  if (micBtn) {
    micBtn.classList.toggle('active', isRecording);
    micBtn.textContent = isRecording ? '⏹' : '🎤';
  }
}

async function processVoiceTranscript(transcript: string): Promise<void> {
  addUserMessage(`🎤 "${transcript}"`);
  showTyping();

  try {
    const checkin = await interpretVoiceCheckin(transcript, healthContext);
    healthContext = { ...healthContext, mood: checkin };
    hideTyping();

    addMessage({
      id: generateId(),
      role: 'assistant',
      content: '',
      contentType: 'voice-checkin',
      data: checkin,
      timestamp: new Date().toISOString(),
    });

    // Follow up with insight + action plan
    showTyping();
    const insight = await generateInsight(healthContext);
    hideTyping();

    addAssistantMessage(
      `Based on your check-in and today's health data, here's what I'm seeing:\n\n` +
      insight.observations.join('\n\n') +
      `\n\n` +
      insight.correlations.map(c => `**🔗 ${c.description}**`).join('\n\n')
    );

    addMessage({
      id: generateId(),
      role: 'assistant',
      content: '',
      contentType: 'action-plan',
      data: insight.actionPlan,
      timestamp: new Date().toISOString(),
      suggestions: [
        'Give me a 5-minute breathing exercise',
        'What should I eat for my next meal?',
        'How can I improve my sleep tonight?',
      ],
    });
  } catch {
    hideTyping();
    addAssistantMessage('I had trouble processing your check-in. Please try again.');
  }
}

async function handleAnalyzeRequest(): Promise<void> {
  showTyping();

  try {
    const insight = await generateInsight(healthContext);
    hideTyping();

    addAssistantMessage(
      `Here's my analysis of your health data today:\n\n` +
      insight.observations.map(o => `• ${o}`).join('\n\n')
    );

    // Show correlations
    if (insight.correlations.length > 0) {
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: 'I found these connections in your data:',
        contentType: 'correlation',
        data: insight,
        timestamp: new Date().toISOString(),
      });
    }

    // Show action plan
    addMessage({
      id: generateId(),
      role: 'assistant',
      content: '',
      contentType: 'action-plan',
      data: insight.actionPlan,
      timestamp: new Date().toISOString(),
      suggestions: [
        'What time should I stop drinking coffee today?',
        'How much water should I drink today?',
        'Give me a 5-minute breathing exercise',
      ],
    });
  } catch {
    hideTyping();
    addAssistantMessage('I had trouble generating the analysis. Please try again.');
  }
}

// ─── Message Helpers ──────────────────────────────

function addMessage(msg: ChatMessage): void {
  messages.push(msg);
  renderChat();
}

function addUserMessage(text: string): void {
  addMessage({
    id: generateId(),
    role: 'user',
    content: text,
    contentType: 'text',
    timestamp: new Date().toISOString(),
  });
}

function addAssistantMessage(text: string): void {
  addMessage({
    id: generateId(),
    role: 'assistant',
    content: text,
    contentType: 'text',
    timestamp: new Date().toISOString(),
  });
}

function showTyping(): void {
  isTyping = true;
  renderChat();
}

function hideTyping(): void {
  isTyping = false;
}

function scrollToBottom(): void {
  if (messagesContainer) {
    requestAnimationFrame(() => {
      messagesContainer!.scrollTop = messagesContainer!.scrollHeight;
    });
  }
}

// ─── Utilities ────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatMarkdown(text: string): string {
  // Simple markdown: **bold**, *italic*, \n→<br>, •→bullet
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');
  return html;
}
