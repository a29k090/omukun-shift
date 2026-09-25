// Storage Adapter supporting Local Demo Storage and Supabase Storage

const DEMO_STORAGE_KEY = 'omukun_shift_demo_db_v2';

// Seed data for Demo Mode
const SEED_DATA = {
  store: {
    id: 'store-1',
    name: 'omukun 渋谷店',
    store_code: 'OMK-7F2K9',
    default_open_time: '09:00',
    default_close_time: '21:30',
    timezone: 'Asia/Tokyo'
  },
  members: [
    { id: 'm1', name: '山田 太郎', email: 'yamada@omukun.jp', role: 'admin', color: '#ef4444', min_monthly_hours: 80, max_monthly_hours: 120, min_shift_hours: 4, pay_type: 'hourly', hourly_rate: 1200, monthly_salary: null, status: 'active', notes: '店長代理' },
    { id: 'm2', name: '佐藤 花子', email: 'sato@omukun.jp', role: 'staff', color: '#3b82f6', min_monthly_hours: 60, max_monthly_hours: 100, min_shift_hours: 3, pay_type: 'hourly', hourly_rate: 1150, monthly_salary: null, status: 'active', notes: 'ホールリーダー' },
    { id: 'm3', name: '鈴木 健太', email: 'suzuki@omukun.jp', role: 'staff', color: '#10b981', min_monthly_hours: 40, max_monthly_hours: 80, min_shift_hours: 3, pay_type: 'hourly', hourly_rate: 1100, monthly_salary: null, status: 'active', notes: '' },
    { id: 'm4', name: '高橋 咲', email: 'takahashi@omukun.jp', role: 'staff', color: '#f59e0b', min_monthly_hours: 50, max_monthly_hours: 90, min_shift_hours: 3, pay_type: 'hourly', hourly_rate: 1150, monthly_salary: null, status: 'active', notes: '' },
    { id: 'm5', name: '伊藤 蓮', email: 'ito@omukun.jp', role: 'staff', color: '#8b5cf6', min_monthly_hours: 40, max_monthly_hours: 70, min_shift_hours: 3, pay_type: 'hourly', hourly_rate: 1100, monthly_salary: null, status: 'active', notes: '' },
    { id: 'm6', name: '渡辺 葵', email: 'watanabe@omukun.jp', role: 'staff', color: '#ec4899', min_monthly_hours: 60, max_monthly_hours: 100, min_shift_hours: 3, pay_type: 'monthly', hourly_rate: null, monthly_salary: 220000, status: 'active', notes: '契約社員' },
    { id: 'm7', name: '中村 拓海', email: 'nakamura@omukun.jp', role: 'staff', color: '#06b6d4', min_monthly_hours: 30, max_monthly_hours: 60, min_shift_hours: 3, pay_type: 'hourly', hourly_rate: 1100, monthly_salary: null, status: 'active', notes: '' },
    { id: 'm8', name: '小林 美咲', email: 'kobayashi@omukun.jp', role: 'staff', color: '#84cc16', min_monthly_hours: 40, max_monthly_hours: 80, min_shift_hours: 3, pay_type: 'hourly', hourly_rate: 1100, monthly_salary: null, status: 'active', notes: '' }
  ],
  staff_month_rules: [
    { id: 'smr-1', member_id: 'm1', month_key: '2026-10', min_monthly_hours: 70, max_monthly_hours: 100 }
  ],
  periods: [
    {
      id: 'period-2026-10',
      month_key: '2026-10',
      status: 'open',
      deadline: '2026-09-25T23:59',
      operating_open_time: '09:00',
      operating_close_time: '21:30',
      message: '10月分の希望シフトです。25日までに入力をお願いします。',
      published_at: '2026-09-10T10:00:00Z',
      published_by: 'm1',
      closed_at: null,
      closed_by: null
    }
  ],
  submissions: [
    { id: 'sub-m1', period_id: 'period-2026-10', member_id: 'm1', status: 'submitted', submitted_at: '2026-09-15T12:00:00Z', last_edited_at: '2026-09-15T12:00:00Z' },
    { id: 'sub-m2', period_id: 'period-2026-10', member_id: 'm2', status: 'in_progress', submitted_at: null, last_edited_at: '2026-09-18T14:30:00Z' },
    { id: 'sub-m3', period_id: 'period-2026-10', member_id: 'm3', status: 'not_started', submitted_at: null, last_edited_at: null }
  ],
  presets: [
    { id: 'preset-A', name: '早番 (A)', start_time: '09:30', end_time: '18:30', break_minutes: 60, active: true },
    { id: 'preset-B', name: '中番 (B)', start_time: '11:00', end_time: '20:00', break_minutes: 60, active: true },
    { id: 'preset-C', name: '遅番 (C)', start_time: '12:30', end_time: '21:30', break_minutes: 45, active: true }
  ],
  staffing_rules: {
    default_required_count: 2,
    time_range_overrides: [
      { id: 'tr-1', time_start: '11:00', time_end: '14:00', required_count: 3 },
      { id: 'tr-2', time_start: '17:00', time_end: '20:00', required_count: 4 }
    ],
    weekday_overrides: [
      { id: 'wd-1', day_of_week: 6, time_start: '11:00', time_end: '15:00', required_count: 5 }
    ],
    specific_date_overrides: [
      { id: 'sd-1', date: '2026-10-12', time_start: '18:00', time_end: '21:30', required_count: 4 }
    ]
  },
  invitations: [
    { id: 'inv-1', store_id: 'store-1', token: 'SECURE_TOKEN_DEMO', role: 'staff', expires_at: '2026-12-31T23:59:59Z', max_uses: 10, use_count: 1, status: 'active', created_at: '2026-09-01T00:00:00Z' }
  ],
  availability: [
    { id: 'av-1', member_id: 'm1', date: '2026-10-01', state: 'full', start_time: null, end_time: null, notes: '' },
    { id: 'av-2', member_id: 'm1', date: '2026-10-02', state: 'full', start_time: null, end_time: null, notes: '' },
    { id: 'av-3', member_id: 'm2', date: '2026-10-01', state: 'range', start_time: '09:30', end_time: '18:30', notes: '午前から入れます' },
    { id: 'av-4', member_id: 'm2', date: '2026-10-02', state: 'unavailable', start_time: null, end_time: null, notes: '大学講義' },
    { id: 'av-5', member_id: 'm3', date: '2026-10-01', state: 'from', start_time: '12:00', end_time: null, notes: '午後〜' },
    { id: 'av-6', member_id: 'm4', date: '2026-10-01', state: 'until', start_time: '18:00', end_time: null, notes: '夜予定あり' }
  ],
  assignments: [
    { id: 'asg-1', period_id: 'period-2026-10', date: '2026-10-01', member_id: 'm1', start_time: '09:30', end_time: '18:30', break_minutes: 60, preset_id: 'preset-A', is_locked: false, source: 'manual' },
    { id: 'asg-2', period_id: 'period-2026-10', date: '2026-10-01', member_id: 'm2', start_time: '11:00', end_time: '20:00', break_minutes: 60, preset_id: 'preset-B', is_locked: false, source: 'manual' }
  ]
};

export class DemoStorageAdapter {
  constructor() {
    this.data = this._loadData();
  }

  _loadData() {
    const json = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!json) {
      this._saveData(SEED_DATA);
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
    try {
      const parsed = JSON.parse(json);
      // Ensure missing structure defaults exist if migration occurs
      if (!parsed.staffing_rules || Array.isArray(parsed.staffing_rules)) {
        parsed.staffing_rules = SEED_DATA.staffing_rules;
      }
      if (!parsed.invitations) parsed.invitations = SEED_DATA.invitations;
      if (!parsed.submissions) parsed.submissions = SEED_DATA.submissions;
      if (!parsed.staff_month_rules) parsed.staff_month_rules = SEED_DATA.staff_month_rules;
      return parsed;
    } catch {
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
  }

  _saveData(data) {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  }

  async getStore() { return this.data.store; }
  async saveStore(storeData) {
    this.data.store = { ...this.data.store, ...storeData };
    this._saveData(this.data);
    return this.data.store;
  }

  async getMembers() { return this.data.members; }
  async saveMember(member) {
    const idx = this.data.members.findIndex(m => m.id === member.id);
    if (idx >= 0) {
      this.data.members[idx] = { ...this.data.members[idx], ...member };
    } else {
      this.data.members.push(member);
    }
    this._saveData(this.data);
    return true;
  }

  async getStaffMonthRules(monthKey) {
    return (this.data.staff_month_rules || []).filter(r => !monthKey || r.month_key === monthKey);
  }
  async saveStaffMonthRule(rule) {
    if (!this.data.staff_month_rules) this.data.staff_month_rules = [];
    const idx = this.data.staff_month_rules.findIndex(r => r.member_id === rule.member_id && r.month_key === rule.month_key);
    if (idx >= 0) {
      this.data.staff_month_rules[idx] = { ...this.data.staff_month_rules[idx], ...rule };
    } else {
      this.data.staff_month_rules.push(rule);
    }
    this._saveData(this.data);
    return true;
  }

  async getPresets() { return this.data.presets || []; }
  async savePresets(presets) {
    this.data.presets = presets;
    this._saveData(this.data);
    return true;
  }

  async getStaffingRules() { return this.data.staffing_rules; }
  async saveStaffingRules(rules) {
    this.data.staffing_rules = rules;
    this._saveData(this.data);
    return true;
  }

  async getPeriod(monthKey) {
    return this.data.periods.find(p => p.month_key === monthKey) || null;
  }
  async savePeriod(periodData) {
    const idx = this.data.periods.findIndex(p => p.month_key === periodData.month_key);
    if (idx >= 0) {
      this.data.periods[idx] = { ...this.data.periods[idx], ...periodData };
    } else {
      this.data.periods.push(periodData);
    }
    this._saveData(this.data);
    return true;
  }

  async getSubmissions(periodId) {
    return (this.data.submissions || []).filter(s => !periodId || s.period_id === periodId);
  }
  async saveSubmission(submission) {
    if (!this.data.submissions) this.data.submissions = [];
    const idx = this.data.submissions.findIndex(s => s.period_id === submission.period_id && s.member_id === submission.member_id);
    if (idx >= 0) {
      this.data.submissions[idx] = { ...this.data.submissions[idx], ...submission, last_edited_at: new Date().toISOString() };
    } else {
      this.data.submissions.push({ ...submission, last_edited_at: new Date().toISOString() });
    }
    this._saveData(this.data);
    return true;
  }

  async getInvitations() { return this.data.invitations || []; }
  async saveInvitation(inv) {
    if (!this.data.invitations) this.data.invitations = [];
    const idx = this.data.invitations.findIndex(i => i.id === inv.id);
    if (idx >= 0) {
      this.data.invitations[idx] = { ...this.data.invitations[idx], ...inv };
    } else {
      this.data.invitations.push(inv);
    }
    this._saveData(this.data);
    return true;
  }

  async getAvailability(memberId, monthKey) {
    return this.data.availability.filter(a => {
      const matchMember = !memberId || a.member_id === memberId;
      const matchMonth = a.date.startsWith(monthKey);
      return matchMember && matchMonth;
    });
  }

  async saveAvailability(availabilityEntry) {
    const index = this.data.availability.findIndex(
      a => a.member_id === availabilityEntry.member_id && a.date === availabilityEntry.date
    );
    if (index >= 0) {
      this.data.availability[index] = { ...this.data.availability[index], ...availabilityEntry, updated_at: new Date().toISOString() };
    } else {
      this.data.availability.push({ ...availabilityEntry, updated_at: new Date().toISOString() });
    }

    // Auto update submission status to in_progress if not completed
    const period = await this.getPeriod(availabilityEntry.date.substring(0, 7));
    if (period) {
      const existingSub = (this.data.submissions || []).find(s => s.period_id === period.id && s.member_id === availabilityEntry.member_id);
      if (!existingSub || existingSub.status === 'not_started') {
        await this.saveSubmission({
          id: `sub-${availabilityEntry.member_id}`,
          period_id: period.id,
          member_id: availabilityEntry.member_id,
          status: 'in_progress',
          submitted_at: null,
          last_edited_at: new Date().toISOString()
        });
      } else if (existingSub.status === 'submitted') {
        await this.saveSubmission({
          ...existingSub,
          status: 'submitted',
          last_edited_at: new Date().toISOString()
        });
      }
    }

    this._saveData(this.data);
    return true;
  }

  async saveBulkAvailability(entries) {
    for (const entry of entries) {
      await this.saveAvailability(entry);
    }
    return true;
  }

  async getAssignments(monthKey, date) {
    return this.data.assignments.filter(a => {
      const matchMonth = a.date.startsWith(monthKey);
      const matchDate = !date || a.date === date;
      return matchMonth && matchDate;
    });
  }

  async saveAssignment(assignment) {
    const index = this.data.assignments.findIndex(a => a.id === assignment.id);
    if (index >= 0) {
      this.data.assignments[index] = { ...this.data.assignments[index], ...assignment, updated_at: new Date().toISOString() };
    } else {
      this.data.assignments.push({ ...assignment, updated_at: new Date().toISOString() });
    }
    this._saveData(this.data);
    return true;
  }

  async deleteAssignment(id) {
    this.data.assignments = this.data.assignments.filter(a => a.id !== id);
    this._saveData(this.data);
    return true;
  }

  async replaceAssignments(newAssignments) {
    this.data.assignments = newAssignments;
    this._saveData(this.data);
    return true;
  }

  resetDemoData() {
    this.data = JSON.parse(JSON.stringify(SEED_DATA));
    this._saveData(this.data);
  }
}
