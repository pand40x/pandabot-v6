import { Bot } from 'grammy';
import { registerPortfoliosHandlers } from './handlers';

export function registerPortfoliosModule(bot: Bot) {
  registerPortfoliosHandlers(bot);
}

export const Portfolio = require('./model').Portfolio;
