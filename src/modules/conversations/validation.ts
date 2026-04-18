import { z } from 'zod/v4';

// Phase 1 is text-only, one-to-one (message architecture §7.1).
// 4000 chars keeps bodies bounded without cramping normal tutoring exchange.
export const MESSAGE_BODY_MAX_CHARS = 4000;

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(MESSAGE_BODY_MAX_CHARS, 'Message is too long.'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const markThreadReadSchema = z.object({
  conversationId: z.string().uuid(),
});

export type MarkThreadReadInput = z.infer<typeof markThreadReadSchema>;
