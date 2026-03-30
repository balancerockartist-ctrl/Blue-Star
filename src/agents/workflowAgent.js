/**
 * Workflow Agent
 *
 * Orchestrates multi-step agentic tasks using Claude AI.
 * Supports:
 *   run()      — execute a free-form task described in natural language
 *   scaffold() — generate code scaffolding for a specific artifact type
 */

const { v4: uuidv4 } = require('uuid');
const claudeAgent = require('./claudeAgent');

/**
 * Run a free-form agentic task.
 * @param {object} params
 * @param {string} params.prompt     - natural-language task description
 * @param {object} [params.context]  - optional structured context to inject
 * @returns {Promise<object>} task record
 */
async function run({ prompt, context = {} }) {
  const id = uuidv4();
  const startedAt = new Date().toISOString();

  const enrichedPrompt = context && Object.keys(context).length > 0
    ? `Context:\n${JSON.stringify(context, null, 2)}\n\nTask:\n${prompt}`
    : prompt;

  const { messages, finalResponse } = await claudeAgent.think([
    { role: 'user', content: enrichedPrompt },
  ]);

  return {
    id,
    type: 'run',
    prompt,
    context,
    response: finalResponse,
    messages,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Generate code scaffolding for a named artifact type.
 *
 * @param {object} params
 * @param {'smart-contract'|'api-endpoints'|'economic-model'} params.type
 * @param {string} params.description - what to scaffold
 * @param {object} [params.options]   - optional additional options
 * @returns {Promise<object>} task record with generated code
 */
async function scaffold({ type, description, options = {} }) {
  const id = uuidv4();
  const startedAt = new Date().toISOString();

  const scaffoldPrompts = {
    'smart-contract': (desc, opts) =>
      `Generate a complete, production-ready Solidity smart contract for the following requirement.
Include SPDX licence identifier, pragma, NatSpec comments, events, and access control where appropriate.

Requirement: ${desc}
${opts.network ? `Target network: ${opts.network}` : ''}
${opts.standards ? `ERC standards to implement: ${opts.standards.join(', ')}` : ''}

Return ONLY the Solidity source code in a single code block.`,

    'api-endpoints': (desc, opts) =>
      `Generate a complete Express.js router file (CommonJS) with all the API endpoints needed for the following requirement.
Include input validation (express-validator), async error handling, and JSDoc comments.

Requirement: ${desc}
${opts.resourceName ? `Resource name: ${opts.resourceName}` : ''}

Return ONLY the JavaScript source code in a single code block.`,

    'economic-model': (desc, opts) =>
      `Generate a complete JavaScript module that implements the following economic model.
Include exported functions, JSDoc types, and realistic placeholder logic with comments.

Requirement: ${desc}
${opts.currency ? `Currency/token: ${opts.currency}` : ''}

Return ONLY the JavaScript source code in a single code block.`,
  };

  const promptBuilder = scaffoldPrompts[type];
  if (!promptBuilder) {
    throw new Error(`Unsupported scaffold type: ${type}`);
  }

  const prompt = promptBuilder(description, options);
  const generatedCode = await claudeAgent.chat(prompt);

  return {
    id,
    type: 'scaffold',
    scaffoldType: type,
    description,
    options,
    generatedCode,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

module.exports = { run, scaffold };
