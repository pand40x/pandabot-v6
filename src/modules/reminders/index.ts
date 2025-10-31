import { Bot } from 'grammy';
import { registerRemindersHandlers } from './handlers';

export function registerRemindersModule(bot: Bot) {
  registerRemindersHandlers(bot);
}

export const Reminder = require('./model').Reminder;
