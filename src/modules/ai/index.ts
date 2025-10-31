import { Bot } from 'grammy';
import { registerAIHandlers } from './handlers';

export function registerAIModule(bot: Bot) {
  registerAIHandlers(bot);
}
