// Streaming URLs - injected by GitHub Actions
const STREAM_URLS = {
    monthly_savings_summary: '__URL_MONTHLY_SAVINGS_SUMMARY__',
};

// State
let conversationHistory = [];

// DOM Elements
const financialSituationInput = document.getElementById('financial-situation');
const adviceTopicSelect = document.getElementById('advice-topic');
const riskToleranceSelect = document.getElementById('risk-tolerance');
const incomeSlider = document.getElementById('income-slider');
const monthlyIncomeInput = document.getElementById('monthly-income');
const runAllBtn = document.getElementById('run-all-btn');
const monthlySavingsOutput = document.getElementById('monthly-savings-output');
const monthlySavingsError = document.getElementById('monthly-savings-error');
const monthlySavingsLoading = document.getElementById('monthly-savings-loading');
const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatError = document.getElementById('chat-error');

// Sync income slider and input
incomeSlider.addEventListener('input', (e) => {
    monthlyIncomeInput.value = e.target.value;
});

monthlyIncomeInput.addEventListener('change', (e) => {
    const value = Math.max(0, Math.min(50000, parseInt(e.target.value) || 0));
    monthlyIncomeInput.value = value;
    incomeSlider.value = value;
});

// Run All button
runAllBtn.addEventListener('click', () => {
    clearOutputs();
    streamMonthlySavingsSummary();
});

// Chat handlers
sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

// Clear all outputs
function clearOutputs() {
    monthlySavingsOutput.innerHTML = '';
    monthlySavingsError.classList.remove('active');
    monthlySavingsError.textContent = '';
    monthlySavingsLoading.classList.remove('active');
}

// Stream Monthly Savings Summary
async function streamMonthlySavingsSummary() {
    const url = STREAM_URLS.monthly_savings_summary;
    
    if (!url || url.includes('__URL_')) {
        showError(monthlySavingsError, 'API endpoint not configured. Check GitHub Actions deployment.');
        return;
    }

    monthlySavingsLoading.classList.add('active');

    const payload = {
        financial_situation: financialSituationInput.value,
        advice_topic: adviceTopicSelect.value,
        risk_tolerance: riskToleranceSelect.value,
        monthly_income: parseInt(monthlyIncomeInput.value) || 0,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        monthlySavingsOutput.innerHTML = '';
        await streamToPanel(response, monthlySavingsOutput);
    } catch (error) {
        showError(monthlySavingsError, `Error: ${error.message}`);
    } finally {
        monthlySavingsLoading.classList.remove('active');
    }
}

// Stream response to panel with markdown rendering
async function streamToPanel(response, panelElement) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lineCount = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    renderMarkdownLine(panelElement, line.trim());
                    lineCount++;
                }
            }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
            renderMarkdownLine(panelElement, buffer.trim());
        }

        // Auto-scroll to bottom
        panelElement.scrollTop = panelElement.scrollHeight;
    } catch (error) {
        throw error;
    }
}

// Render markdown line with formatting
function renderMarkdownLine(container, line) {
    const span = document.createElement('span');
    span.className = 'md-line';

    // Process markdown formatting
    let html = line;

    // Headers (preserve ## vs # vs ###)
    if (line.startsWith('### ')) {
        span.innerHTML = '<h3>' + escapeHtml(line.slice(4)) + '</h3>';
    } else if (line.startsWith('## ')) {
        span.innerHTML = '<h2>' + escapeHtml(line.slice(3)) + '</h2>';
    } else if (line.startsWith('# ')) {
        span.innerHTML = '<h1>' + escapeHtml(line.slice(2)) + '</h1>';
    } else if (line.startsWith('---')) {
        span.innerHTML = '<hr>';
    } else if (line.match(/^[\d]+\.\s/)) {
        // Numbered list
        const text = line.replace(/^[\d]+\.\s/, '');
        span.innerHTML = '<li>' + processInlineMarkdown(text) + '</li>';
    } else if (line.match(/^[-*]\s/)) {
        // Bullet list
        const text = line.replace(/^[-*]\s/, '');
        span.innerHTML = '<li>' + processInlineMarkdown(text) + '</li>';
    } else {
        span.innerHTML = processInlineMarkdown(line);
    }

    span.style.animation = 'none';
    container.appendChild(span);
    // Trigger animation
    setTimeout(() => {
        span.style.animation = '';
    }, 0);
}

// Process inline markdown (bold, italic, code)
function processInlineMarkdown(text) {
    text = escapeHtml(text);

    // **bold**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // *italic*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // `code`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');

    return text;
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Chat functionality
async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addChatBubble('user', message);
    chatInput.value = '';
    conversationHistory.push({ role: 'user', content: message });

    // Build context from current inputs
    const context = `
Financial Situation: ${financialSituationInput.value}
Advice Topic: ${adviceTopicSelect.value}
Risk Tolerance: ${riskToleranceSelect.value}
Monthly Income: $${monthlyIncomeInput.value}

User Question: ${message}
`.trim();

    try {
        const url = STREAM_URLS.monthly_savings_summary;
        if (!url || url.includes('__URL_')) {
            showError(chatError, 'API endpoint not configured.');
            return;
        }

        const payload = {
            financial_situation: context,
            advice_topic: adviceTopicSelect.value,
            risk_tolerance: riskToleranceSelect.value,
            monthly_income: parseInt(monthlyIncomeInput.value) || 0,
            is_chat_followup: true,
            conversation_history: conversationHistory,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const assistantBubble = addChatBubble('assistant', '');
        const bubbleContent = assistantBubble.querySelector('p');
        let fullText = '';
        let buffer = '';
        const decoder = new TextDecoder();
        const reader = response.body.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    fullText += line + '\n';
                    bubbleContent.innerHTML = processInlineMarkdown(fullText);
                }
            }
        }

        if (buffer.trim()) {
            fullText += buffer;
            bubbleContent.innerHTML = processInlineMarkdown(fullText);
        }

        conversationHistory.push({ role: 'assistant', content: fullText });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
        showError(chatError, `Chat error: ${error.message}`);
    }
}

// Add chat bubble
function addChatBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = `<p>${text}</p>`;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubble;
}

// Show error
function showError(element, message) {
    element.textContent = message;
    element.classList.add('active');
}

// Initialize
console.log('AI Finance Advisor loaded. Streaming URLs:', STREAM_URLS);
