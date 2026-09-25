// Storage Adapter pattern supporting Local Demo Storage and Supabase Storage

const DEMO_STORAGE_KEY = 'omukun_shift_demo_db_v1';

// Initial realistic seed data for Demo Mode
const SEED_DATA = {
  store: {
    id: 'store-1',
    name: 'omukun 渋谷店',
    store_code: 'OMK-7F2K9',
    default_open_time: '09:00',
    default_close_time: '21:30'
  },
  members: [
    { id: 'm1', name: '山田 太郎', role: 'admin', color: '#ef4444', hourly_rate: 1200, min_monthly_hours: 80, max_monthly_hours: 120, status: 'active' },
    { id: 'm2', name: '佐藤 花子', role: 'staff', color: '#3b82f6', hourly_rate: 1150, min_monthly_hours: 60, max_monthly_hours: 100, status: 'active' },
    { id: 'm3', name: '鈴木 健太', role: 'staff', color: '#10b981', hourly_rate: 1100, min_monthly_hours: 40, max_monthly_hours: 80, status: 'active' },
    { id: 'm4', name: '高橋 咲', role: 'staff', color: '#f59e0b', hourly_rate: 1150, min_monthly_hours: 50, max_monthly_hours: 90, status: 'active' },
    { id: 'm5', name: '伊藤 蓮', role: 'staff', color: '#8b5cf6', hourly_rate: 1100, min_monthly_hours: 40, max_monthly_hours: 70, status: 'active' },
    { id: 'm6', name: '渡辺 葵', role: 'staff', color: '#ec4899', hourly_rate: 1150, min_monthly_hours: 60, max_monthly_hours: 100, status: 'active' },
    { id: 'm7', name: '中村 拓海', role: 'staff', color: '#06b6d4', hourly_rate: 1100, min_monthly_hours: 30, max_monthly_hours: 60, status: 'active' },
    { id: 'm8', name: '小林 美咲', role: 'staff', color: '#84cc16', hourly_rate: 1100, min_monthly_hours: 40, max_monthly_hours: 80, status: 'active' }
  ],
  periods: [
    {
      id: 'period-2026-10',
      month_key: '2026-10',
      status: 'open',
      deadline: '2026-09-25T23:59:00',
      message: '10月度のシフト希望を入力してください。'
    }
  ],
  presets: [
    { id: 'preset-A', name: '早番 (A)', start_time: '09:30', end_time: '18:30', break_minutes: 60 },
    { id: 'preset-B', name: '中番 (B)', start_time: '11:00', end_time: '20:00', break_minutes: 60 },
    { id: 'preset-C', name: '遅番 (C)', start_time: '12:30', end_time: '21:30', break_minutes: 45 }
  ],
  staffing_rules: [
    { id: 'sr-1', period_id: 'period-2026-10', time_start: '09:00', time_end: '11:00', required_count: 2 },
    { id: 'sr-2', period_id: 'period-2026-10', time_start: '11:00', time_end: '15:00', required_count: 4 },
    { id: 'sr-3', period_id: 'period-2026-10', time_start: '15:00', time_end: '18:00', required_count: 2 },
    { id: 'sr-4', period_id: 'period-2026-10', time_start: '18:00', time_end: '21:30', required_count: 3 }
  ],
  availability: [
    // Seed initial availability for test staff
    { id: 'av-1', member_id: 'm1', date: '2026-10-01', state: 'full', start_time: null, end_time: null, notes: '' },
    { id: 'av-2', member_id: 'm1', date: '2026-10-02', state: 'full', start_time: null, end_time: null, notes: '' },
    { id: 'av-3', member_id: 'm2', date: '2026-10-01', state: 'range', start_time: '09:30', end_time: '18:30', notes: '午前から入れます' },
    { id: 'av-4', member_id: 'm2', date: '2026-10-02', state: 'unavailable', start_time: null, end_time: null, notes: '大学講義' },
    { id: 'av-5', member_id: 'm3', date: '2026-10-01', state: 'from', start_time: '12:00', end_time: null, notes: '午後〜' },
    { id: 'av-6', member_id: 'm4', date: '2026-10-01', state: 'until', start_time: '18:00', end_time: null, notes: '夜予定あり' }
  ],
  assignments: [
    // Seed initial shift assignments
    {
      id: 'asg-1',
      period_id: 'period-2026-10',
      date: '2026-10-01',
      member_id: 'm1',
      start_time: '09:30',
      end_time: '18:30',
      break_minutes: 60,
      preset_id: 'preset-A',
      is_locked: false,
      source: 'manual'
    },
    {
      id: 'asg-2',
      period_id: 'period-2026-10',
      date: '2026-10-01',
      member_id: 'm2',
      start_time: '11:00',
      end_time: '20:00',
      break_minutes: 60,
      preset_id: 'preset-B',
      is_locked: false,
      source: 'manual'
    }
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
      return JSON.parse(json);
    } catch {
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
  }

  _saveData(data) {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  }

  async getStore() {
    return this.data.store;
  }

  async getMembers() {
    return this.data.members;
  }

  async getPresets() {
    return this.data.presets;
  }

  async getStaffingRules(periodId) {
    return this.data.staffing_rules.filter(r => r.period_id === periodId);
  }

  async getPeriod(monthKey) {
    return this.data.periods.find(p => p.month_key === monthKey) || null;
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
