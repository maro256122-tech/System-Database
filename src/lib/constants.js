// Pipeline stages — 5 active stages + 2 closed
export const STAGES = [
  { key: 'lead_in',        label: 'عميل جديد',              color: '#6366f1', icon: '🆕' },
  { key: 'contacted',      label: 'جار التواصل',             color: '#3b82f6', icon: '📞' },
  { key: 'inquiry_replied',label: 'تم الرد على الاستفسار',  color: '#0ea5e9', icon: '✉️' },
  { key: 'visit_booked',   label: 'حجز موعد زيارة',         color: '#14b8a6', icon: '📅' },
  { key: 'deposit_paid',   label: 'حجز بعربون',              color: '#f59e0b', icon: '💰' },
  { key: 'closed_won',     label: 'دفع كامل — بيع',         color: '#22c55e', icon: '✅' },
  { key: 'closed_lost',    label: 'إلغاء / خسارة',           color: '#ef4444', icon: '❌' },
]

export const ACTIVE_STAGES = STAGES.filter(s => !['closed_won', 'closed_lost'].includes(s.key))

export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

export const SOURCE_OPTIONS = [
  { key: 'snap',      label: '👻 سناب' },
  { key: 'instagram', label: '📸 إنستغرام' },
  { key: 'tiktok',   label: '🎵 تيك توك' },
  { key: 'google',   label: '🔍 جوجل' },
  { key: 'whatsapp', label: '💬 واتساب' },
  { key: 'call',     label: '📞 اتصال' },
  { key: 'referral', label: '🤝 إحالة' },
  { key: 'message',  label: '✉️ رسالة' },
  { key: 'visit',    label: '🚶 زيارة مباشرة' },
]

export const PAYMENT_TYPES = [
  { key: 'cash', label: 'كاش' },
  { key: 'installment', label: 'تقسيط' },
  { key: 'bank_finance', label: 'تمويل بنكي' },
  { key: 'murabaha', label: 'مرابحة' },
]

export const ACTION_TYPE_LABELS = {
  lead_created: 'تم إضافة العميل',
  stage_changed: 'تغيير المرحلة',
  note_added: 'ملاحظة',
  contact_attempt: 'محاولة تواصل',
  follow_up: 'متابعة',
  whatsapp_message: 'رسالة واتساب',
  call_made: 'مكالمة',
  deposit_recorded: '💰 تسجيل عربون',
  visit_no_show: '📅 لم يحضر الزيارة',
  contact_no_response: '📞 لم يرد على التواصل',
  visit_rescheduled: '🔄 إعادة جدولة الزيارة',
}

export const ACTION_TYPE_OPTIONS = [
  { key: 'contact_attempt', label: 'محاولة تواصل' },
  { key: 'follow_up', label: 'متابعة' },
  { key: 'whatsapp_message', label: 'رسالة واتساب' },
  { key: 'call_made', label: 'مكالمة' },
  { key: 'note_added', label: 'ملاحظة' },
]

export const ROLE_LABELS = {
  helicopter: 'إدارة عليا',
  branch_owner: 'مالك الفرع',
  rep: 'مندوب مبيعات',
}

export const OVERDUE_DAYS = 3
