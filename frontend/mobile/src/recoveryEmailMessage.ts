import type { AuthError } from '@supabase/supabase-js';

export function recoveryEmailMessage(error: AuthError | null, success: string): string {
  if (!error) return success;
  if (error.code === 'over_email_send_rate_limit' || error.message.toLowerCase().includes('email rate limit')) {
    return 'Supabase đã đạt giới hạn gửi email của dự án. Hãy đợi giới hạn được đặt lại rồi yêu cầu một liên kết mới.';
  }
  if (error.status === 429) return 'Bạn đã gửi yêu cầu quá nhanh. Hãy đợi rồi thử lại.';
  return error.message;
}
