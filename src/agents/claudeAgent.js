/**
 * Claude AI Agent
 *
 * Thin wrapper around the Anthropic SDK that provides:
 *   - chat()  — single-turn completion
 *   - think() — multi-turn reasoning loop (tool-use ready)
 */

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are the Blue-Star Quantum Economics AI, a specialised assistant for the
Global Operating System (G.O.S.) platform. You help users:
- Design and generate Solidity smart contracts for the QR Store and credit systems.
- Scaffold Express.js API endpoint code for economic models.
- Reason about supply & demand dynamics within the G.L.S. logistics chain.
- Produce working, production-ready code when asked.
Always reply with clear, concise answers. When generating code, include complete file contents.`;

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Single-turn chat with Claude.
 * @param {string} userMessage
 * @param {string} [systemOverride] - optional system prompt override
 * @returns {Promise<string>} assistant response text
 */
async function chat(userMessage, systemOverride) {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemOverride || SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * Multi-turn reasoning loop.
 * Continues until Claude stops or max iterations are reached.
 * @param {Array<{role: string, content: string}>} messages - conversation history
 * @param {number} [maxIterations=5]
 * @returns {Promise<{messages: Array, finalResponse: string}>}
 */
async function think(messages, maxIterations = 5) {
  const client = getClient();
  const history = [...messages];
  let finalResponse = '';

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const assistantText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    history.push({ role: 'assistant', content: assistantText });
    finalResponse = assistantText;

    // Stop if Claude has nothing more to add
    if (response.stop_reason === 'end_turn') break;
  }

  return { messages: history, finalResponse };
}

module.exports = { chat, think };
