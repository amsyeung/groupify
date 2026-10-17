/**
 * Ambient declarations for Chrome's built-in AI APIs (Chrome 138+ on desktop).
 * Only the members this extension uses are declared.
 * https://developer.chrome.com/docs/ai/prompt-api
 * https://developer.chrome.com/docs/ai/translator-api
 */

export type AIAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

interface LanguageOptions {
  expectedInputs?: { type: 'text'; languages: string[] }[]
  expectedOutputs?: { type: 'text'; languages: string[] }[]
}

export interface LanguageModelSession {
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>
  destroy(): void
}

export interface LanguageModelStatic {
  availability(options?: LanguageOptions): Promise<AIAvailability>
  create(
    options?: LanguageOptions & { initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[]; signal?: AbortSignal }
  ): Promise<LanguageModelSession>
}

export interface TranslatorInstance {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>
  destroy(): void
}

export interface TranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<AIAvailability>
  create(options: { sourceLanguage: string; targetLanguage: string; signal?: AbortSignal }): Promise<TranslatorInstance>
}

declare global {
  // Only present on Chrome desktop 138+ with supported hardware; always feature-detect.
  var LanguageModel: LanguageModelStatic | undefined
  var Translator: TranslatorStatic | undefined
}
