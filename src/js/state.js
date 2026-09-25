// Global State & Event Bus for omukun Shift
import { DemoStorageAdapter } from './storage.js';

class StateManager {
  constructor() {
    this.storage = new DemoStorageAdapter();
    this.listeners = new Set();

    this.state = {
      role: 'admin', // 'admin' or 'staff'
      currentUser: { id: 'm1', name: '山田 太郎', email: 'yamada@omukun.jp', role: 'admin' },
      currentMemberId: 'm1',
      currentMonthKey: '2026-10',
      selectedDate: '2026-10-01',
      managerViewMode: 'month', // 'month' or 'timeline'
      currentView: 'workspace', // 'workspace', 'settings', 'auth'
      settingsCategory: 'store', // 'store', 'staffing', 'presets', 'staff', 'rules', 'pay', 'invites', 'account'
      submissionFilter: 'all', // 'all', 'not_started', 'in_progress', 'submitted'
      saveStatus: 'saved',
      store: null,
      members: [],
      staffMonthRules: [],
      presets: [],
      period: null,
      submissions: [],
      staffingRules: {
        default_required_count: 2,
        time_range_overrides: [],
        weekday_overrides: [],
        specific_date_overrides: []
      },
      invitations: [],
      availability: [],
      assignments: []
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  async init() {
    this.setSaveStatus('saving');
    this.state.store = await this.storage.getStore();
    this.state.members = await this.storage.getMembers();
    this.state.staffMonthRules = await this.storage.getStaffMonthRules(this.state.currentMonthKey);
    this.state.presets = await this.storage.getPresets();
    this.state.period = await this.storage.getPeriod(this.state.currentMonthKey);
    this.state.submissions = await this.storage.getSubmissions(this.state.period ? this.state.period.id : '');
    this.state.staffingRules = await this.storage.getStaffingRules();
    this.state.invitations = await this.storage.getInvitations();

    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async refreshData() {
    this.state.availability = await this.storage.getAvailability(null, this.state.currentMonthKey);
    this.state.assignments = await this.storage.getAssignments(this.state.currentMonthKey);
    this.state.members = await this.storage.getMembers();
    this.state.staffMonthRules = await this.storage.getStaffMonthRules(this.state.currentMonthKey);
    this.state.presets = await this.storage.getPresets();
    this.state.period = await this.storage.getPeriod(this.state.currentMonthKey);
    this.state.submissions = await this.storage.getSubmissions(this.state.period ? this.state.period.id : '');
    this.state.staffingRules = await this.storage.getStaffingRules();
    this.state.invitations = await this.storage.getInvitations();
    this.state.store = await this.storage.getStore();
    this.notify();
  }

  setRole(role) {
    this.state.role = role;
    if (role === 'staff') {
      const staffMember = this.state.members.find(m => m.id === this.state.currentMemberId && m.role === 'staff') ||
                          this.state.members.find(m => m.role === 'staff') ||
                          this.state.members[0];
      if (staffMember) {
        this.state.currentMemberId = staffMember.id;
        this.state.currentUser = { id: staffMember.id, name: staffMember.name, email: staffMember.email, role: 'staff' };
      }
      this.state.currentView = 'workspace';
    } else if (role === 'admin') {
      const adminMember = this.state.members.find(m => m.role === 'admin') || this.state.members[0];
      if (adminMember) {
        this.state.currentMemberId = adminMember.id;
        this.state.currentUser = { id: adminMember.id, name: adminMember.name, email: adminMember.email, role: 'admin' };
      }
    }
    this.notify();
  }

  setCurrentView(view) {
    this.state.currentView = view;
    this.notify();
  }

  setSettingsCategory(category) {
    this.state.settingsCategory = category;
    this.notify();
  }

  setSubmissionFilter(filter) {
    this.state.submissionFilter = filter;
    this.notify();
  }

  setCurrentMonthKey(monthKey) {
    this.state.currentMonthKey = monthKey;
    const [y, m] = monthKey.split('-');
    this.state.selectedDate = `${y}-${m}-01`;
    this.refreshData();
  }

  setCurrentMember(memberId) {
    this.state.currentMemberId = memberId;
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      this.state.currentUser = { id: member.id, name: member.name, email: member.email, role: member.role };
    }
    this.notify();
  }

  setManagerViewMode(mode) {
    this.state.managerViewMode = mode;
    this.notify();
  }

  setSelectedDate(date) {
    this.state.selectedDate = date;
    this.notify();
  }

  setSaveStatus(status) {
    this.state.saveStatus = status;
    this.notify();
  }

  async saveStore(storeData) {
    this.setSaveStatus('saving');
    await this.storage.saveStore(storeData);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveMember(memberData) {
    this.setSaveStatus('saving');
    await this.storage.saveMember(memberData);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveStaffMonthRule(rule) {
    this.setSaveStatus('saving');
    await this.storage.saveStaffMonthRule(rule);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveStaffingRules(rules) {
    this.setSaveStatus('saving');
    await this.storage.saveStaffingRules(rules);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async savePresets(presets) {
    this.setSaveStatus('saving');
    await this.storage.savePresets(presets);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async savePeriod(periodData) {
    this.setSaveStatus('saving');
    await this.storage.savePeriod(periodData);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveSubmission(subData) {
    this.setSaveStatus('saving');
    await this.storage.saveSubmission(subData);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveInvitation(invData) {
    this.setSaveStatus('saving');
    await this.storage.saveInvitation(invData);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveAvailability(entry) {
    this.setSaveStatus('saving');
    await this.storage.saveAvailability(entry);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveBulkAvailability(entries) {
    this.setSaveStatus('saving');
    await this.storage.saveBulkAvailability(entries);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async saveAssignment(assignment) {
    this.setSaveStatus('saving');
    await this.storage.saveAssignment(assignment);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async deleteAssignment(id) {
    this.setSaveStatus('saving');
    await this.storage.deleteAssignment(id);
    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async replaceAssignments(assignments) {
    this.setSaveStatus('saving');
    await this.storage.replaceAssignments(assignments);
    await this.refreshData();
    this.setSaveStatus('saved');
  }
}

export const stateManager = new StateManager();
