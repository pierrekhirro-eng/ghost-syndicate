import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DATABASE_URL: z.string().default('file:./dev.db'),
  TRANSCRIPT_CHANNEL_ID: z.string().min(1),
  CATEGORY_TICKETS_ID: z.string().optional(),
  ROLE_LEADERSHIP_ID: z.string().optional(),
  ROLE_FINANCE_ID: z.string().optional(),
  ROLE_OPERATIONS_ID: z.string().optional(),
  WEB_PORT: z.coerce.number().default(3010),
  BOT_NAME: z.string().default('Ghost Syndicate')
});
export const config = schema.parse(process.env);
