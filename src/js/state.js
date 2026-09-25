// Global State & Event Bus for omukun Shift
import { DemoStorageAdapter } from './storage.js';

class StateManager {
  constructor() {
    this.storage = new DemoStorageAdapter();
    this.listeners = new Set();

    this.state = {
      role: 'admin', // 'admin' or 'staff'
      currentMemberId: 'm1', // Default active user in demo mode
      currentMonthKey: '2026-10',
      selectedDate: '2026-10-01',
      managerViewMode: 'timeline', // 'month' or 'timeline'
      saveStatus: 'saved', // 'saving', 'saved', 'error'
      store: null,
      members: [],
      presets: [],
      period: null,
      availability: [],
      assignments: [],
      staffingRules: []
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
    this.state.presets = await this.storage.getPresets();
    this.state.period = await this.storage.getPeriod(this.state.currentMonthKey);
    this.state.staffingRules = await this.storage.getStaffingRules(this.state.period ? this.state.period.id : '');

    await this.refreshData();
    this.setSaveStatus('saved');
  }

  async refreshData() {
    this.state.availability = await this.storage.getAvailability(null, this.state.currentMonthKey);
    this.state.assignments = await this.storage.getAssignments(this.state.currentMonthKey);
    this.notify();
  }

  setRole(role) {
    this.state.role = role;
    if (role === 'staff' && !this.state.members.find(m => m.id === this.state.currentMemberId && m.role === 'staff')) {
      // Pick first non-admin staff member if current is admin
      const staffMember = this.state.members.find(m => m.role === 'staff') || this.state.members[0];
      if (staffMember) this.state.currentMemberId = staffMember.id;
    } else if (role === 'admin') {
      const adminMember = this.state.members.find(m => m.role === 'admin') || this.state.members[0];
      if (adminMember) this.state.currentMemberId = adminMember.id;
    }
    this.notify();
  }

  setCurrentMember(memberId) {
    this.state.currentMemberId = memberId;
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
