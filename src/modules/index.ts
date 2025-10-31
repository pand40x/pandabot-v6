// Main module exports
export * from './prices';
export * from './watchlists';
export * from './portfolios';
export * from './notes';
export * from './reminders';
export * from './alerts';
export * from './ai';
export * from './users';
export * from './currency';
export * from './stocks';
export * from './admin';

// Module registration
import { Bot } from 'grammy';

// Import all modules
import { registerUsersModule } from './users';
import { registerPricesModule } from './prices';
import { registerWatchlistsModule } from './watchlists';
import { registerPortfoliosModule } from './portfolios';
import { registerNotesModule } from './notes';
import { registerRemindersModule } from './reminders';
import { registerAlertsModule } from './alerts';
import { registerAIModule } from './ai';
import { registerCurrencyModule } from './currency';
import { registerStocksModule } from './stocks';
import { registerAdminModule } from './admin';

export function registerModules(bot: Bot) {
  registerUsersModule(bot);
  registerPricesModule(bot);
  registerWatchlistsModule(bot);
  registerPortfoliosModule(bot);
  registerNotesModule(bot);
  registerRemindersModule(bot);
  registerAlertsModule(bot);
  registerAIModule(bot);
  registerCurrencyModule(bot);
  registerStocksModule(bot);
  registerAdminModule(bot);
}
