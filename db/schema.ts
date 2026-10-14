import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const contributions = sqliteTable('contributions', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  film: text('film').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
});
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  film: text('film').notNull(),
  author: text('author').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
});
export const screeningSelection = sqliteTable('screening_selection', {
  key: text('key').primaryKey(),
  film: text('film').notNull(),
  updatedAt: text('updated_at').notNull(),
});
