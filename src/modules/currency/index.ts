import { Bot } from 'grammy';

export function registerCurrencyModule(bot: Bot) {
  const { registerCurrencyModule: handler } = require('./handlers');
  handler(bot);
}
