import { Bot } from 'grammy';
import { registerStocksHandlers } from './handlers';

export function registerStocksModule(bot: Bot) {
  registerStocksHandlers(bot);
}
