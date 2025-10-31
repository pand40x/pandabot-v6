import { Bot } from 'grammy';
import { registerNotesHandlers } from './handlers';

export function registerNotesModule(bot: Bot) {
  registerNotesHandlers(bot);
}

export const Note = require('./model').Note;
