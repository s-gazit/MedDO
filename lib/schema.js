// Gemini responseSchema (OpenAPI subset), matching spec/ARCHITECTURE.md section 4.5.
const field = (type) => ({
  type: 'object',
  properties: {
    value: { type, nullable: true },
    certain: { type: 'boolean' },
  },
  required: ['value', 'certain'],
});

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    raw_text: { type: 'string' },
    content_type: field('string'),
    specialty: field('string'),
    doc_date: field('string'),
    provider: field('string'),
    key_info: field('string'),
    issue_suggestion: {
      type: 'object',
      properties: {
        issue_id: { type: 'string', nullable: true },
        certain: { type: 'boolean' },
      },
      required: ['issue_id', 'certain'],
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          type: { type: 'string', nullable: true },
          due_date: { type: 'string', nullable: true },
          due_relative: {
            type: 'object',
            nullable: true,
            properties: {
              amount: { type: 'integer' },
              unit: { type: 'string', enum: ['days', 'weeks', 'months', 'years'] },
            },
            required: ['amount', 'unit'],
          },
          due_time: { type: 'string', nullable: true },
          certain: { type: 'boolean' },
        },
        required: ['description', 'type', 'due_date', 'due_relative', 'due_time', 'certain'],
      },
    },
  },
  required: ['raw_text', 'content_type', 'specialty', 'doc_date', 'provider', 'key_info', 'issue_suggestion', 'tasks'],
};
