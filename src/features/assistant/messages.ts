export const assistantMessages = {
  en: {
    title: 'Assistant sandbox', notice: 'This test sends the sample question below to Google Gemini.',
    consent: 'Allow Google Gemini to process this question', send: 'Send sample question', loading: 'Sending…',
    permission: 'Allow processing before sending the question.', noEvidence: 'This sandbox supports only the sample question.',
    unavailable: 'The Assistant is temporarily unavailable.', blocked: 'The Assistant is unavailable for this account.',
    pending: 'The request is unresolved. Retry to check the same turn.', retry: 'Retry this turn', newTurn: 'New turn',
    expired: 'This turn has expired.',
    source: 'Source: Sleep Journal', you: 'You', assistant: 'Assistant',
  },
  vi: {
    title: 'Trợ lý thử nghiệm', notice: 'Lượt thử gửi câu hỏi mẫu bên dưới đến Google Gemini.',
    consent: 'Cho phép Google Gemini xử lý câu hỏi này', send: 'Gửi câu hỏi mẫu', loading: 'Đang gửi…',
    permission: 'Hãy xác nhận cho phép xử lý trước khi gửi.', noEvidence: 'Bản thử nghiệm chỉ hỗ trợ câu hỏi mẫu.',
    unavailable: 'Trợ lý tạm thời chưa thể trả lời.', blocked: 'Tài khoản này chưa được dùng Trợ lý.',
    pending: 'Chưa xác định được kết quả. Hãy thử lại cùng lượt.', retry: 'Thử lại lượt này', newTurn: 'Lượt mới',
    expired: 'Lượt này đã hết hạn.',
    source: 'Nguồn: Nhật ký giấc ngủ', you: 'Bạn', assistant: 'Trợ lý',
  },
} as const;
