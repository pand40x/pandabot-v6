import { Bot } from 'grammy';
import { registerAlertsHandlers } from './handlers';

export function registerAlertsModule(bot: Bot) {
  registerAlertsHandlers(bot);
}

export const Alert = require('./model').Alert;
