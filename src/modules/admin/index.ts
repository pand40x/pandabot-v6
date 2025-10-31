import { Bot } from 'grammy';
import { registerAdminHandlers } from './handlers';

export function registerAdminModule(bot: Bot) {
  registerAdminHandlers(bot);
}
