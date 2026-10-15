import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const contributions = sqliteTable('contributions', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  film: text('film').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  status: text('status').notNull().default('published'),
});
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  film: text('film').notNull(),
  author: text('author').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  status: text('status').notNull().default('published'),
});
export const screeningSelection = sqliteTable('screening_selection', {
  key: text('key').primaryKey(),
  film: text('film').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(), username: text('username').notNull(), expiresAt: text('expires_at').notNull(), credentialVersion: text('credential_version').notNull(),
});
export const loginAttempts = sqliteTable('login_attempts', { key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull() });
export const films = sqliteTable('films', {
  id:text('id').primaryKey(), title:text('title').notNull().unique(), year:text('year').notNull(), director:text('director').notNull(), category:text('category').notNull(), kind:text('kind').notNull(), note:text('note').notNull(), image:text('image').notNull(), watched:integer('watched').notNull().default(0), archived:integer('archived').notNull().default(0),
});
export const screenings = sqliteTable('screenings', { id:text('id').primaryKey(), filmId:text('film_id').notNull(), date:text('date').notNull() });
