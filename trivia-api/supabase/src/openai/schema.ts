import { z } from 'zod'

export const QuestionOutputSchema = z.object({
  questionText: z.string().min(10).max(300),
  optionA: z.string().min(1).max(150),
  optionB: z.string().min(1).max(150),
  optionC: z.string().min(1).max(150),
  optionD: z.string().min(1).max(150),
  correctOption: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string().max(500),
})

export const QuestionBatchOutputSchema = z.object({
  questions: z.array(QuestionOutputSchema),
})

export type QuestionOutput = z.infer<typeof QuestionOutputSchema>
export type QuestionBatchOutput = z.infer<typeof QuestionBatchOutputSchema>

// JSON schema for OpenAI structured output (strict mode)
export const OPENAI_QUESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption', 'explanation'],
        properties: {
          questionText: { type: 'string' },
          optionA: { type: 'string' },
          optionB: { type: 'string' },
          optionC: { type: 'string' },
          optionD: { type: 'string' },
          correctOption: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
          explanation: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
}
