export const assistantSettingsMessages = {
  en: {
    title: 'Personal AI Assistant',
    permission: 'Enable Personal AI Assistant',
    explanation: 'Vita AI can send relevant Sleep and Water records, questions, and conversation context to Google Gemini. Conversations are saved for up to 7 days. Turning this off locks Assistant and history until you enable it again.',
    loading: 'Checking Vita AI access…',
    saving: 'Saving your choice…',
    error: 'Your Vita AI access setting could not be confirmed.',
    retry: 'Check again',
  },
  vi: {
    title: 'Trợ lý AI cá nhân',
    permission: 'Bật Trợ lý AI cá nhân',
    explanation: 'Vita AI có thể gửi dữ liệu Giấc ngủ và Nước liên quan, câu hỏi và ngữ cảnh hội thoại cho Google Gemini. Hội thoại được lưu tối đa 7 ngày. Khi tắt, Trợ lý và lịch sử bị khóa cho đến khi bạn bật lại.',
    loading: 'Đang kiểm tra quyền truy cập của Vita AI…',
    saving: 'Đang lưu lựa chọn…',
    error: 'Không thể xác nhận cài đặt quyền của Vita AI.',
    retry: 'Kiểm tra lại',
  },
} as const;
