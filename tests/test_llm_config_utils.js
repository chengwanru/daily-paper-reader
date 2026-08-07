const assert = require('node:assert/strict');

const {
  normalizeBaseUrlForStorage,
  buildChatCompletionsEndpoint,
  sanitizeModelList,
  resolveChatModels,
  resolveSummaryLLM,
  inferProviderType,
  getDeepSeekPreset,
  getOpenAICompatiblePreset,
  inferChatApiProfile,
  resolveJsonResponseMode,
  isDeepSeekV4Model,
  resolveMaxOutputTokens,
  shouldUseXApiKeyHeader,
  buildStreamingChatPayload,
  buildConnectivityTestPayload,
  isAliyunMaasBaseUrl,
} = require('../app/llm-config-utils.js');

function testNormalizeBaseUrlForStorage() {
  assert.equal(
    normalizeBaseUrlForStorage('https://api.example.com/v1/chat/completions'),
    'https://api.example.com/v1',
  );
  assert.equal(
    normalizeBaseUrlForStorage('https://api.example.com/v1/'),
    'https://api.example.com/v1',
  );
}

function testBuildChatCompletionsEndpoint() {
  assert.equal(
    buildChatCompletionsEndpoint('https://api.example.com/v1'),
    'https://api.example.com/v1/chat/completions',
  );
  assert.equal(
    buildChatCompletionsEndpoint('https://api.example.com/custom-root'),
    'https://api.example.com/custom-root/v1/chat/completions',
  );
  assert.equal(
    buildChatCompletionsEndpoint(
      'https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    ),
    'https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  );
}

function testSanitizeModelList() {
  assert.deepEqual(
    sanitizeModelList(['deepseek-v4-flash', ' deepseek-v4-flash ', 'deepseek-v4-pro', 'custom-model', 'extra'], 3),
    ['deepseek-v4-flash', 'deepseek-v4-pro', 'custom-model'],
  );
}

function testResolveChatModelsAndSummary() {
  const secret = {
    summarizedLLM: {
      apiKey: 'sk-summary',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-4.1-mini',
    },
    chatLLMs: [
      {
        apiKey: 'sk-chat',
        baseUrl: 'https://api.example.com/v1/',
        models: ['gpt-4.1-mini', 'claude-sonnet-4'],
      },
    ],
  };

  const chatModels = resolveChatModels(secret);
  assert.equal(chatModels.length, 2);
  assert.deepEqual(chatModels.map((item) => item.name), [
    'gpt-4.1-mini',
    'claude-sonnet-4',
  ]);

  const summary = resolveSummaryLLM(secret);
  assert.equal(summary.model, 'gpt-4.1-mini');
  assert.equal(summary.baseUrl, 'https://api.example.com/v1');
}

function testInferProviderType() {
  assert.equal(
    inferProviderType({
      summarizedLLM: {
        apiKey: 'sk',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
      },
    }),
    'deepseek',
  );
  assert.equal(
    inferProviderType({
      llmProvider: { type: 'openai-compatible' },
      summarizedLLM: {
        apiKey: 'sk',
        baseUrl: 'https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
        model: 'deepseek-v3',
      },
    }),
    'openai-compatible',
  );
  assert.equal(
    inferProviderType({
      summarizedLLM: {
        apiKey: 'sk',
        baseUrl: 'https://example.com/v1',
        model: 'other-model',
      },
    }),
    'openai-compatible',
  );
}

function testGetDeepSeekPreset() {
  assert.deepEqual(
    getDeepSeekPreset('deepseek'),
    {
      key: 'deepseek',
      label: 'DeepSeek 官方',
      baseUrl: 'https://api.deepseek.com',
      models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    },
  );
  assert.equal(getDeepSeekPreset('other-a'), null);
}

function testGetOpenAICompatiblePreset() {
  const aliyun = getOpenAICompatiblePreset('aliyun_maas');
  assert.equal(aliyun.key, 'aliyun_maas');
  assert.match(aliyun.baseUrlPlaceholder, /compatible-mode\/v1/);
  assert.equal(getOpenAICompatiblePreset('missing'), null);
}

function testInferChatApiProfile() {
  assert.equal(
    inferChatApiProfile('https://api.deepseek.com', 'deepseek-v4-flash'),
    'deepseek',
  );
  assert.equal(
    inferChatApiProfile(
      'https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      'deepseek-v3',
    ),
    'generic-openai',
  );
  assert.equal(inferChatApiProfile('https://example.com/v1', 'other-model'), 'generic-openai');
  assert.equal(isAliyunMaasBaseUrl('https://ws-x.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'), true);
}

function testResolveJsonResponseMode() {
  assert.equal(
    resolveJsonResponseMode({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
    }),
    'json_object',
  );
  assert.equal(
    resolveJsonResponseMode({
      baseUrl: 'https://example.com/v1',
      model: 'other-model',
      preferSchema: false,
    }),
    'json_object',
  );
}

function testResolveMaxOutputTokens() {
  assert.equal(isDeepSeekV4Model('deepseek-v4-flash'), true);
  assert.equal(isDeepSeekV4Model('deepseek-v4-pro'), true);
  assert.equal(isDeepSeekV4Model('deepseek-chat'), false);
  assert.equal(
    resolveMaxOutputTokens({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
    }),
    393216,
  );
  assert.equal(
    resolveMaxOutputTokens({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-pro',
    }),
    393216,
  );
  assert.equal(
    resolveMaxOutputTokens({
      baseUrl: 'https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      model: 'deepseek-v4-flash',
    }),
    null,
  );
  assert.equal(
    resolveMaxOutputTokens({
      baseUrl: 'https://example.com/v1',
      model: 'other-model',
    }),
    null,
  );
}

function testShouldUseXApiKeyHeader() {
  assert.equal(
    shouldUseXApiKeyHeader({
      baseUrl: 'https://example.com/v1',
      model: 'other-model',
    }),
    true,
  );
}

function testBuildStreamingChatPayload() {
  assert.deepEqual(
    buildStreamingChatPayload({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hi' }],
    }),
    {
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
      max_tokens: 393216,
    },
  );

  assert.deepEqual(
    buildStreamingChatPayload({
      baseUrl: 'https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      model: 'deepseek-v3',
      messages: [{ role: 'user', content: 'hi' }],
    }),
    {
      model: 'deepseek-v3',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    },
  );
}

function testBuildConnectivityTestPayload() {
  assert.deepEqual(
    buildConnectivityTestPayload({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-pro',
    }),
    {
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: 'Reply with exactly: hello world' },
        { role: 'user', content: 'hello world' },
      ],
      temperature: 0,
      max_tokens: 256,
    },
  );
}

testNormalizeBaseUrlForStorage();
testBuildChatCompletionsEndpoint();
testSanitizeModelList();
testResolveChatModelsAndSummary();
testInferProviderType();
testGetDeepSeekPreset();
testGetOpenAICompatiblePreset();
testInferChatApiProfile();
testResolveJsonResponseMode();
testResolveMaxOutputTokens();
testShouldUseXApiKeyHeader();
testBuildStreamingChatPayload();
testBuildConnectivityTestPayload();

console.log('llm config utils tests passed');
