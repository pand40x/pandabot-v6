import { Bot } from 'grammy';
import type { Context } from 'grammy';
import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../core/logger';

export function registerAIHandlers(bot: Bot) {
  // /ai command
  bot.command('ai', async (ctx: Context) => {
    const query = (ctx.match as string | undefined)?.trim();
    
    if (!query) {
      await ctx.reply('❓ Sorunuzu yazın:\n/ai Bitcoin hakkında ne düşünüyorsun?\n/ai ETH fiyatını analiz et\n/ai Portfolio önerisi verir misin?');
      return;
    }
    
    try {
      console.log('🔍 AI Config Debug:', {
        baseUrl: config.ai.baseUrl,
        modelName: config.ai.modelName,
        timeout: config.ai.timeout,
        groupId: config.ai.minimax.groupId,
        apiKeyPrefix: config.ai.minimax.apiKey.substring(0, 20) + '...'
      });
      
      const response = await axios.post(
        `${config.ai.baseUrl}/chat/completions`,
        {
          model: config.ai.modelName,
          stream: false,
          messages: [
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 1.0,
          max_tokens: 3000
        },
        {
          timeout: config.ai.timeout * 1000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.ai.minimax.apiKey}`
          }
        }
      );
      
      console.log('Minimax Response:', JSON.stringify(response.data, null, 2));
      
      // Extract response content with multiple fallbacks
      let aiResponse = '';
      
      // Try OpenAI-compatible format first
      if (response.data.choices?.[0]?.message?.content) {
        aiResponse = response.data.choices[0].message.content;
      }
      // Try MiniMax native format
      else if (response.data.output?.text) {
        aiResponse = response.data.output.text;
      }
      // Try choices array with text field
      else if (response.data.choices?.[0]?.text) {
        aiResponse = response.data.choices[0].text;
      }
      // If no content found, show debug info
      else {
        await ctx.reply(`❌ AI yanıt formatı tanınamadı.\nDebug: ${JSON.stringify(response.data, null, 2).substring(0, 300)}`);
        return;
      }
      
      // Think kısmını temizle (<think>...</think> veya **Thinking:** ile başlayan kısımları kaldır)
      aiResponse = aiResponse
        .replace(/<think>[\s\S]*?<\/think>/g, '') // <think>...</think> tagları arası
        .replace(/\*\*Thinking:\*\*[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '') // **Thinking:** ile başlayan
        .replace(/\n{3,}/g, '\n\n') // 3+ newline'ı 2'ye düşür
        .trim();
      
      // Check if response is valid after cleaning
      if (!aiResponse || aiResponse.length === 0) {
        await ctx.reply(`❌ AI yanıtı boş geldi. Lütfen tekrar deneyin.`);
        return;
      }
      
      // Get usage info for cost calculation
      const usage = response.data.usage;
      
      // Format response - remove markdown
      const formattedResponse = aiResponse
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
      
      // Add cost info if usage data available
      let messageWithCost = formattedResponse;
      if (usage && usage.total_tokens) {
        // Calculate cost using config values
        const inputCost = usage.prompt_tokens * config.ai.cost.inputPerToken;
        const outputCost = usage.completion_tokens * config.ai.cost.outputPerToken;
        const totalCost = inputCost + outputCost;
        
        messageWithCost = `${formattedResponse}\n\n💰 Maliyet: $${totalCost.toFixed(6)} (${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens} tokens)`;
      }
      
      // Send without formatting (plain text)
      await ctx.reply(messageWithCost);
      
    } catch (error: any) {
      logger.error('Error calling AI:', error);
      
      if (error.response?.status === 401) {
        await ctx.reply('❌ AI API key geçersiz. Lütfen API key\'i kontrol edin.');
        return;
      }
      
      if (error.response?.status === 403) {
        await ctx.reply('❌ AI API erişimi reddedildi. API key geçerli mi?');
        return;
      }
      
      if (error.response?.status === 429) {
        await ctx.reply('❌ AI API limit aşıldı. Lütfen biraz bekleyip tekrar deneyin.');
        return;
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        await ctx.reply('❌ AI servisi şu anda erişilemez.\nLütfen daha sonra tekrar deneyin.');
        return;
      }
      
      if (error.code === 'ETIMEDOUT') {
        await ctx.reply('❌ AI yanıtı çok uzun sürdü. Daha kısa bir soru deneyin.');
        return;
      }
      
      await ctx.reply('❌ AI ile iletişim kurulamadı. Lütfen tekrar deneyin.');
    }
  });
  
  // /api command - Quick API test
  bot.command('api', async (ctx: Context) => {
    const query = (ctx.match as string | undefined)?.trim();
    
    if (!query) {
      await ctx.reply('❓ Test için API yanıtı:\n/api Bitcoin fiyatı ne olacak?\n/api Analiz yap\n/api Hızlı özet');
      return;
    }
    
    try {
      const response = await axios.post(
        `${config.ai.baseUrl}/text/chatcompletion_v2`,
        {
          model: config.ai.modelName,
          stream: false,
          tokens_to_generate: 3000,
          temperature: 0.7,
          messages: [
            {
              sender_type: 'USER',
              sender_name: 'User',
              text: query
            }
          ],
          reply_constraints: {
            sender_type: 'BOT',
            sender_name: 'MM智能助理'
          }
        },
        {
          timeout: config.ai.timeout * 1000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.ai.minimax.apiKey}`
          }
        }
      );
      
      const aiResponse = response.data.output?.choices?.[0]?.text;
      
      if (!aiResponse) {
        await ctx.reply('❌ API yanıt üretemedi.');
        return;
      }
      
      await ctx.reply(
        `📡 API Test:\n\n${aiResponse}`
      );
      
    } catch (error: any) {
      logger.error('Error testing API:', error);
      await ctx.reply(`❌ API test hatası:\n${error.message || 'Bilinmeyen hata'}`);
    }
  });
}
