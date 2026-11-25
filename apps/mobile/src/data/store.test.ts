import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStore, type Database } from './store';
import type { GoalVersion, Meal, WeightEntry } from '@mogu/domain';

let sql: DatabaseSync;
let store: LocalStore;
let userId: string;
let counter = 0;

function adapter(db: DatabaseSync): Database {
  return {
    async execAsync(query) {
      db.exec(query);
    },
    async runAsync(query, ...params) {
      return { changes: Number(db.prepare(query).run(...params).changes) };
    },
    async getFirstAsync<T>(query: string, ...params: (string | number | null)[]) {
      return (db.prepare(query).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(query: string, ...params: (string | number | null)[]) {
      return db.prepare(query).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
const goal = (owner: string, date = '2026-11-25'): GoalVersion => ({
  id: `goal-${++counter}`,
  userId: owner,
  effectiveLocalDate: date,
  nutrients: { caloriesKcal: 2000, proteinG: 100, carbsG: 250, fatG: 60 },
  source: 'manual',
  inputs: null,
});
const meal = (owner: string): Meal => ({
  id: `meal-${++counter}`,
  userId: owner,
  title: 'Lunch',
  category: 'lunch',
  occurredAt: '2026-11-25T20:00:00Z',
  localDate: '2026-11-25',
  timeZone: 'America/Los_Angeles',
  items: [
    {
      id: `item-${++counter}`,
      name: 'Rice',
      referenceQuantity: 100,
      consumedQuantity: 150,
      unit: 'g',
      nutrients: { caloriesKcal: 200, proteinG: 5, carbsG: 40, fatG: null },
      source: 'manual',
    },
  ],
  createdAt: '2026-11-25T20:00:00Z',
  updatedAt: '2026-11-25T20:00:00Z',
  revision: 0,
});

beforeEach(async () => {
  sql = new DatabaseSync(':memory:');
  store = new LocalStore(adapter(sql), () => `user-${++counter}`);
  userId = (await store.initialize()).id;
});
afterEach(() => sql.close());

describe('local diary persistence', () => {
  it('initializes one user, resumes onboarding and reads persisted rows from a new store', async () => {
    expect((await store.initialize()).id).toBe(userId);
    expect((await store.snapshot(userId)).user.onboardedAt).toBeNull();
    await store.completeOnboarding(userId, 'Mogu friend', goal(userId), null);
    const entry = meal(userId);
    await store.saveMeal(userId, entry);
    const reopened = new LocalStore(adapter(sql), () => 'unexpected-user');
    expect((await reopened.initialize()).id).toBe(userId);
    const snapshot = await reopened.snapshot(userId);
    expect(snapshot.user.displayName).toBe('Mogu friend');
    expect(snapshot.meals[0].items[0].nutrients.fatG).toBeNull();
    expect(snapshot.meals[0].revision).toBe(1);
  });
  it('makes repeated new-meal saves idempotent and rejects stale edits', async () => {
    const entry = meal(userId);
    await Promise.all([store.saveMeal(userId, entry), store.saveMeal(userId, entry)]);
    expect(await store.listMeals(userId)).toHaveLength(1);
    const saved = (await store.listMeals(userId))[0];
    await store.saveMeal(userId, { ...saved, title: 'Updated lunch' });
    await expect(store.saveMeal(userId, saved)).rejects.toThrow('changed');
    expect((await store.listMeals(userId))[0].title).toBe('Updated lunch');
  });
  it('rolls back the meal update when an ingredient insert fails', async () => {
    const entry = meal(userId);
    await store.saveMeal(userId, entry);
    const saved = (await store.listMeals(userId))[0];
    sql.exec(
      "CREATE TRIGGER fail_item BEFORE INSERT ON meal_items WHEN NEW.id = 'bad-item' BEGIN SELECT RAISE(ABORT, 'injected failure'); END;",
    );
    await expect(
      store.saveMeal(userId, {
        ...saved,
        title: 'Should roll back',
        items: [{ ...saved.items[0], id: 'bad-item' }],
      }),
    ).rejects.toThrow('injected failure');
    expect((await store.listMeals(userId))[0]).toEqual(saved);
  });
  it('keeps user ownership isolated for reads, writes, weights and deletion', async () => {
    const other = 'other-user';
    sql
      .prepare('INSERT INTO users(id,created_at,updated_at) VALUES(?,?,?)')
      .run(other, 'now', 'now');
    const entry = meal(userId);
    await store.saveMeal(userId, entry);
    expect(await store.listMeals(other)).toEqual([]);
    await expect(store.saveMeal(other, entry)).rejects.toThrow('another user');
    await expect(store.saveMeal(other, { ...entry, userId: other })).rejects.toThrow(
      'another user',
    );
    await store.deleteMeal(other, entry.id);
    expect(await store.listMeals(userId)).toHaveLength(1);
    const weight: WeightEntry = {
      id: 'weight-1',
      userId,
      weightKg: 70,
      localDate: '2026-11-25',
      measuredAt: '2026-11-25T20:00:00Z',
      timeZone: 'America/Los_Angeles',
    };
    await store.saveWeight(userId, weight);
    expect((await store.snapshot(other)).weights).toEqual([]);
    await store.saveWeight(other, { ...weight, userId: other, weightKg: 99 });
    expect((await store.snapshot(userId)).weights[0].weightKg).toBe(70);
  });
  it('preserves dated goals and hides deleted meals while retaining a tombstone', async () => {
    await store.saveGoal(userId, goal(userId, '2026-11-01'));
    await store.saveGoal(userId, goal(userId));
    await store.saveGoal(userId, goal(userId));
    expect(await store.listGoals(userId)).toHaveLength(2);
    const entry = meal(userId);
    await store.saveMeal(userId, entry);
    await store.deleteMeal(userId, entry.id);
    expect(await store.listMeals(userId)).toEqual([]);
    expect(
      sql.prepare('SELECT deleted_at FROM meals WHERE id=?').get(entry.id)?.deleted_at,
    ).toBeTruthy();
    await expect(store.saveMeal(userId, entry)).rejects.toThrow('deleted');
  });
  it('enforces foreign keys and preserves a database with a future schema', async () => {
    await expect(store.saveGoal('missing-user', goal('missing-user'))).rejects.toThrow();
    sql.exec('PRAGMA user_version = 2');
    await expect(store.initialize()).rejects.toThrow('newer version');
    expect(sql.prepare('SELECT COUNT(*) AS count FROM users').get()?.count).toBe(1);
  });
});
