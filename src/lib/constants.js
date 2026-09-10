// Pipeline stages definition
export const STAGES = [
  { key: 'lead_in', label: 'عميل جديد', color: '#6366f1', icon: '🆕' },
  { key: 'contacted', label: 'تم التواصل', color: '#3b82f6', icon: '📞' },
  { key: 'interested', label: 'مهتم ومؤهل', color: '#0ea5e9', icon: '⭐' },
  { key: 'showroom_visit', label: 'معاينة / تجربة', color: '#14b8a6', icon: '🚗' },
  { key: 'quote_sent', label: 'عرض سعر', color: '#f59e0b', icon: '📋' },
  { key: 'negotiation', label: 'تفاوض', color: '#f97316', icon: '🤝' },
  { key: 'closed_won', label: 'تم البيع ✅', color: '#22c55e', icon: '🎉' },
  { key: 'closed_lost', label: 'فقد ❌', color: '#ef4444', icon: '❌' },
]

export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

export const SOURCE_OPTIONS = [
  { key: 'message', label: 'رسالة' },
  { key: 'visit', label: 'زيارة' },
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
