import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export interface AIConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
}

interface OpenAICompatibleProviderErrorInfo {
  code: string;
  message: string;
  status: number;
}

export function extractAIConfig(request: NextRequest): AIConfig {
  const provider = request.headers.get('x-provider') || 'openai';
  const apiKey = request.headers.get('x-api-key') || '';
  const baseURL = request.headers.get('x-base-url') || 'https://api.openai.com/v1';
  const model = request.headers.get('x-model') || 'gpt-4o';
  return { provider, apiKey, baseURL, model };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(record: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumericField(record: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function extractOpenAICompatibleProviderError(payload: unknown): OpenAICompatibleProviderErrorInfo | null {
  if (!isRecord(payload)) return null;

  const objectType = getStringField(payload, 'object');
  const hasInvalidChoices =
    typeof objectType === 'string'
    && objectType.startsWith('chat.completion')
    && (!Array.isArray(payload.choices) || payload.choices.length === 0);

  if (!hasInvalidChoices) {
    return null;
  }

  const baseResp = isRecord(payload.base_resp) ? payload.base_resp : undefined;
  const nestedError = isRecord(payload.error) ? payload.error : undefined;
  const statusCode =
    getNumericField(baseResp, 'status_code')
    ?? getNumericField(nestedError, 'status_code')
    ?? getNumericField(payload, 'status');
  const code =
    getStringField(nestedError, 'code')
    ?? (statusCode ? String(statusCode) : 'invalid_chat_completion_payload');
  const message =
    getStringField(baseResp, 'status_msg')
    ?? getStringField(nestedError, 'message')
    ?? getStringField(payload, 'message')
    ?? getStringField(payload, 'msg')
    ?? 'The upstream OpenAI-compatible provider returned an invalid completion payload.';
  const status =
    statusCode === 2062
      ? 429
      : statusCode && statusCode >= 400 && statusCode < 600
        ? statusCode
        : 502;

  return {
    code,
    message,
    status,
  };
}

async function openAICompatibleFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const response = await fetch(input, init);

  if (!response.ok) {
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response;
  }

  let payload: unknown;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  const providerError = extractOpenAICompatibleProviderError(payload);
  if (!providerError) {
    return response;
  }

  return new Response(
    JSON.stringify({
      error: {
        message: providerError.message,
        type: 'provider_error',
        code: providerError.code,
      },
    }),
    {
      status: providerError.status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

export function getModel(config: AIConfig, modelOverride?: string) {
  if (!config.apiKey) {
    throw new AIConfigError('API key is required. Please configure it in Settings.');
  }
  const modelId = modelOverride || config.model;

  switch (config.provider) {
    case 'anthropic': {
      const p = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL || undefined });
      return p(modelId);
    }
    case 'gemini': {
      const p = createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseURL || undefined });
      return p(modelId);
    }
    default: {
      const p = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        fetch: openAICompatibleFetch,
      });
      return p.chat(modelId);
    }
  }
}

/**
 * Returns providerOptions for JSON mode — only applicable to OpenAI-compatible providers.
 */
export function getJsonProviderOptions(config: AIConfig) {
  if (config.provider === 'openai') {
    return { openai: { response_format: { type: 'json_object' as const } } };
  }
  return {} as Record<string, never>;
}

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigError';
  }
}
