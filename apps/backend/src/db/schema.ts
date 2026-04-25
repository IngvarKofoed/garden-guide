import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const invites = sqliteTable('invites', {
  token: text('token').primaryKey(),
  email: text('email'),
  expiresAt: text('expires_at').notNull(),
  consumedAt: text('consumed_at'),
});

export const zones = sqliteTable('zones', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const plants = sqliteTable(
  'plants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    species: text('species'),
    zoneId: text('zone_id').references(() => zones.id, { onDelete: 'set null' }),
    notes: text('notes'),
    hardinessZone: text('hardiness_zone'),
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('plants_zone_id_idx').on(t.zoneId)],
);

export const plantPhotos = sqliteTable(
  'plant_photos',
  {
    id: text('id').primaryKey(),
    plantId: text('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(),
    takenAt: text('taken_at'),
    caption: text('caption'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('plant_photos_plant_id_idx').on(t.plantId)],
);

const ACTION_TYPES = [
  'prune',
  'fertilize',
  'water',
  'plant',
  'transplant',
  'harvest',
  'sow',
  'mulch',
  'treat',
  'inspect',
  'custom',
] as const;

const actionTypeCheck = (column: string) =>
  sql.raw(`${column} IN (${ACTION_TYPES.map((t) => `'${t}'`).join(', ')})`);

export const careTasks = sqliteTable(
  'care_tasks',
  {
    id: text('id').primaryKey(),
    plantId: text('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(),
    customLabel: text('custom_label'),
    kind: text('kind', { enum: ['recurring', 'one_off'] }).notNull(),
    recurStartMd: text('recur_start_md'),
    recurEndMd: text('recur_end_md'),
    dueDate: text('due_date'),
    notes: text('notes'),
    notify: integer('notify', { mode: 'boolean' }).notNull().default(true),
    source: text('source', { enum: ['manual', 'ai'] }).notNull(),
    aiRationale: text('ai_rationale'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('care_tasks_plant_id_idx').on(t.plantId),
    check('care_tasks_action_type_check', actionTypeCheck('action_type')),
  ],
);

export const taskCompletions = sqliteTable(
  'task_completions',
  {
    id: text('id').primaryKey(),
    careTaskId: text('care_task_id')
      .notNull()
      .references(() => careTasks.id, { onDelete: 'cascade' }),
    completedOn: text('completed_on').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('task_completions_care_task_id_idx').on(t.careTaskId)],
);

export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    plantId: text('plant_id').references(() => plants.id, { onDelete: 'set null' }),
    occurredOn: text('occurred_on').notNull(),
    actionType: text('action_type').notNull(),
    customLabel: text('custom_label'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (t) => [
    index('journal_entries_plant_id_idx').on(t.plantId),
    index('journal_entries_occurred_on_idx').on(t.occurredOn),
    check('journal_entries_action_type_check', actionTypeCheck('action_type')),
  ],
);

export const journalPhotos = sqliteTable(
  'journal_photos',
  {
    id: text('id').primaryKey(),
    journalId: text('journal_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('journal_photos_journal_id_idx').on(t.journalId)],
);

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('push_subscriptions_endpoint_idx').on(t.endpoint),
    index('push_subscriptions_user_id_idx').on(t.userId),
  ],
);

export const notificationLog = sqliteTable(
  'notification_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    careTaskId: text('care_task_id')
      .notNull()
      .references(() => careTasks.id, { onDelete: 'cascade' }),
    firedForYear: integer('fired_for_year'),
    firedAt: text('fired_at').notNull(),
  },
  (t) => [
    index('notification_log_care_task_year_idx').on(t.careTaskId, t.firedForYear),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  ],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Re-exported placeholders to silence unused-import warnings if needed by callers.
export const _internal = { primaryKey };
