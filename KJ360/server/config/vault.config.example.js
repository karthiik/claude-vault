/**
 * Vault Configuration Template
 *
 * Copy this file to vault.config.js and edit to match your vault.
 *
 * IMPORTANT: vault.config.js is git-ignored so each vault can have
 * its own settings without conflicts.
 */

export default {
  // ===========================================
  // FOLDER STRUCTURE
  // Your PARA folder names (or whatever you use)
  // ===========================================
  folders: {
    inbox: '0-Inbox',
    projects: '1-Projects',
    areas: '2-Areas',
    resources: '3-Resources',
    archive: '4-Archive',
    daily: 'Daily'
  },

  // ===========================================
  // DAILY NOTES FORMAT
  // How your daily notes are organized
  // ===========================================
  dailyNotes: {
    // 'flat' = Daily/2026-01-26.md
    // 'nested' = Daily/2026/01/2026-01-26.md
    structure: 'nested',

    // Date format in filename (using date-fns tokens)
    // 'yyyy-MM-dd' = 2026-01-26
    // 'yyyy-MM-dd-EEEE' = 2026-01-26-Sunday
    dateFormat: 'yyyy-MM-dd',

    // Subfolder for briefs (relative to daily folder)
    // null = same folder as daily notes
    // 'Briefs' = Daily/2026/01/Briefs/
    briefsFolder: 'Briefs'
  },

  // ===========================================
  // THINGS 3 → FULL CIRCLE MAPPING
  // Map your Things 3 areas/projects to life areas
  // ===========================================
  thingsMapping: {
    // Health
    'health': 'health',
    'fitness': 'health',
    'gym': 'health',
    'wellness': 'health',

    // Relationships
    'relationships': 'relationships',
    'family': 'relationships',
    'friends': 'relationships',
    'social': 'relationships',

    // Career (add your company/work terms)
    'career': 'career',
    'work': 'career',
    'professional': 'career',
    // Add your company name here:
    // 'mycompany': 'career',

    // Finances
    'finances': 'finances',
    'finance': 'finances',
    'money': 'finances',
    'investing': 'finances',

    // Learning
    'learning': 'learning',
    'education': 'learning',
    'study': 'learning',
    'reading': 'learning',
    'course': 'learning',

    // Joy
    'joy': 'joy',
    'fun': 'joy',
    'hobbies': 'joy',
    'travel': 'joy',
    'entertainment': 'joy',

    // Home
    'home': 'home',
    'house': 'home',
    'household': 'home',

    // Contribution
    'contribution': 'contribution',
    'legacy': 'contribution',
    'giving': 'contribution',
    'mentoring': 'contribution',
    'volunteer': 'contribution'
  },

  // ===========================================
  // STRATEGIC vs OPERATIONAL KEYWORDS
  // Used by Strategic Guardian insight
  // ===========================================
  strategicKeywords: [
    'thesis', 'innovation', 'strategy', 'vision',
    'thought leader', 'speaking', 'article', 'linkedin', 'substack',
    'learning', 'mentor', 'create', 'build', 'launch'
  ],

  operationalKeywords: [
    'review', 'approve', 'sync', 'follow up', 'reply', 'email',
    'meeting', 'call', '1:1', 'budget', 'contract', 'issue'
  ],

  // ===========================================
  // ROUTINE MEETINGS TO FILTER
  // These will be hidden from calendar view
  // ===========================================
  routineMeetingPatterns: [
    'standup', 'stand-up', 'daily sync', 'daily check',
    'lunch', 'break', 'coffee',
    'team sync', 'quick sync', 'check-in', 'weekly sync',
    'office hours', 'focus time', 'blocked', 'do not disturb',
    'out of office', 'commute', 'travel'
  ],

  // ===========================================
  // WORK HOURS
  // For calendar gap detection
  // ===========================================
  workHours: {
    start: 8,  // 8am
    end: 18    // 6pm
  },

  // ===========================================
  // SERVER
  // Change this if running multiple instances
  // Dev: 3600, Prod: 3700, etc.
  // ===========================================
  server: {
    port: 3600
  }
};
