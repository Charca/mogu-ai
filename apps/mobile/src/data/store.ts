import {
  assertAmount,
  categories,
  isLocalDate,
  scaleItem,
  validateNutrients,
  type DiaryRepository,
  type GoalVersion,
  type LocalUser,
  type Meal,
  type MealItem,
  type ProfileInput,
  type WeightEntry,
} from '@mogu/domain';

type Bind = string | number | null;
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Bind[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...params: Bind[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Bind[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const migration1 = `
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  onboarded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  inputs_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  effective_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  UNIQUE(user_id, effective_date)
);
CREATE TABLE meals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  local_date TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  UNIQUE(id, user_id)
);
CREATE INDEX meals_user_date ON meals(user_id, local_date);
CREATE TABLE meal_items (
  id TEXT PRIMARY KEY NOT NULL,
  meal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  payload TEXT NOT NULL,
  FOREIGN KEY(meal_id, user_id) REFERENCES meals(id, user_id) ON DELETE CASCADE
);
CREATE TABLE weights (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  local_date TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX weights_user_date ON weights(user_id, local_date);
PRAGMA user_version = 1;
`;

export async function migrate(db: Database): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > 1)
    throw new Error('This diary needs a newer version of Mogu. Your data has been kept.');
  if ((version?.user_version ?? 0) === 0) {
    await db.withTransactionAsync(() => db.execAsync(migration1));
  }
}

export interface Snapshot {
  user: LocalUser;
  goals: GoalVersion[];
  meals: Meal[];
  weights: WeightEntry[];
}

// This store owns its connection. ALL operations, including reads, use the same
// queue so withTransactionAsync cannot absorb a concurrent unrelated query.
export class LocalStore implements DiaryRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private db: Database,
    private uuid: () => string,
  ) {}

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  initialize(): Promise<LocalUser> {
    return this.serial(async () => {
      await migrate(this.db);
      let user = await this.db.getFirstAsync<LocalUser>(
        'SELECT id, display_name AS displayName, onboarded_at AS onboardedAt FROM users ORDER BY created_at LIMIT 1',
      );
      if (!user) {
        const now = new Date().toISOString();
        user = { id: this.uuid(), displayName: '', onboardedAt: null };
        await this.db.runAsync(
          'INSERT INTO users(id, created_at, updated_at) VALUES (?, ?, ?)',
          user.id,
          now,
          now,
        );
      }
      return user;
    });
  }

  completeOnboarding(
    userId: string,
    displayName: string,
    goal: GoalVersion,
    profile: ProfileInput | null,
  ): Promise<void> {
    return this.serial(async () => {
      this.validateGoal(userId, goal);
      await this.db.withTransactionAsync(async () => {
        await this.writeGoal(userId, goal);
        const now = new Date().toISOString();
        const result = await this.db.runAsync(
          'UPDATE users SET display_name = ?, onboarded_at = ?, updated_at = ? WHERE id = ?',
          displayName.trim().slice(0, 80),
          now,
          now,
          userId,
        );
        if (result.changes !== 1) throw new Error('Local user not found.');
        if (profile)
          await this.db.runAsync(
            'INSERT INTO profiles(user_id, inputs_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET inputs_json=excluded.inputs_json, updated_at=excluded.updated_at',
            userId,
            JSON.stringify(profile),
            now,
          );
      });
    });
  }

  private validateGoal(userId: string, goal: GoalVersion): void {
    if (goal.userId !== userId) throw new Error('Goal belongs to another user.');
    if (!isLocalDate(goal.effectiveLocalDate)) throw new Error('Invalid goal date.');
    validateNutrients(goal.nutrients, true);
    assertAmount(goal.nutrients.caloriesKcal!, 'Calorie target', true);
    if (Object.values(goal.nutrients).some((value) => value === null))
      throw new Error('Enter every macro target.');
  }

  private async writeGoal(userId: string, goal: GoalVersion): Promise<void> {
    const existing = await this.db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM goals WHERE id = ?',
      goal.id,
    );
    if (existing && existing.user_id !== userId) throw new Error('Goal belongs to another user.');
    await this.db.runAsync(
      'INSERT INTO goals(id, user_id, effective_date, payload) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, effective_date) DO UPDATE SET payload=excluded.payload',
      goal.id,
      userId,
      goal.effectiveLocalDate,
      JSON.stringify(goal),
    );
  }

  saveGoal(userId: string, goal: GoalVersion): Promise<void> {
    return this.serial(async () => {
      this.validateGoal(userId, goal);
      await this.db.withTransactionAsync(() => this.writeGoal(userId, goal));
    });
  }

  listGoals(userId: string): Promise<GoalVersion[]> {
    return this.serial(() => this.readGoals(userId));
  }
  private async readGoals(userId: string): Promise<GoalVersion[]> {
    const rows = await this.db.getAllAsync<{ id: string; payload: string }>(
      'SELECT id, payload FROM goals WHERE user_id = ? ORDER BY effective_date DESC',
      userId,
    );
    return rows.map((row) => ({ ...(JSON.parse(row.payload) as GoalVersion), id: row.id }));
  }

  listMeals(userId: string): Promise<Meal[]> {
    return this.serial(() => this.readMeals(userId));
  }
  private async readMeals(userId: string): Promise<Meal[]> {
    const rows = await this.db.getAllAsync<{ payload: string; revision: number }>(
      'SELECT payload, revision FROM meals WHERE user_id = ? AND deleted_at IS NULL ORDER BY occurred_at DESC',
      userId,
    );
    const items = await this.db.getAllAsync<{ meal_id: string; payload: string }>(
      'SELECT meal_id, payload FROM meal_items WHERE user_id = ? ORDER BY position',
      userId,
    );
    const byMeal = new Map<string, MealItem[]>();
    for (const row of items)
      byMeal.set(row.meal_id, [
        ...(byMeal.get(row.meal_id) ?? []),
        JSON.parse(row.payload) as MealItem,
      ]);
    return rows.map((row) => {
      const meal = JSON.parse(row.payload) as Meal;
      return { ...meal, revision: row.revision, items: byMeal.get(meal.id) ?? [] };
    });
  }

  saveMeal(userId: string, meal: Meal): Promise<void> {
    return this.serial(async () => {
      if (meal.userId !== userId) throw new Error('Meal belongs to another user.');
      if (!meal.title.trim() || meal.title.length > 200)
        throw new Error('Enter a meal name of up to 200 characters.');
      if (!categories.includes(meal.category)) throw new Error('Choose a meal category.');
      if (!isLocalDate(meal.localDate) || !Number.isFinite(Date.parse(meal.occurredAt)))
        throw new Error('Enter a valid meal date.');
      if (!meal.items.length || meal.items.length > 20)
        throw new Error('A meal needs between 1 and 20 items.');
      if (new Set(meal.items.map((item) => item.id)).size !== meal.items.length)
        throw new Error('Duplicate meal items.');
      for (const item of meal.items) {
        if (!item.name.trim() || item.name.length > 200)
          throw new Error('Enter an item name of up to 200 characters.');
        if (
          !['g', 'ml', 'serving'].includes(item.unit) ||
          !['manual', 'gemini', 'open-food-facts'].includes(item.source)
        )
          throw new Error('Invalid item unit or source.');
        validateNutrients(item.nutrients, true);
        scaleItem(item);
      }
      await this.db.withTransactionAsync(async () => {
        const existing = await this.db.getFirstAsync<{
          user_id: string;
          revision: number;
          deleted_at: string | null;
        }>('SELECT user_id, revision, deleted_at FROM meals WHERE id = ?', meal.id);
        if (existing && existing.user_id !== userId)
          throw new Error('Meal belongs to another user.');
        if (existing?.deleted_at) throw new Error('This meal was deleted.');
        // Repeated Save of a new meal is an idempotent no-op. Stale edits fail.
        if (existing && meal.revision === 0) return;
        if (existing && meal.revision !== existing.revision)
          throw new Error('This meal changed. Reopen it before editing.');
        const { items, ...metadata } = meal;
        const revision = (existing?.revision ?? 0) + 1;
        const payload = JSON.stringify({
          ...metadata,
          updatedAt: new Date().toISOString(),
          revision,
        });
        await this.db.runAsync(
          'INSERT INTO meals(id,user_id,local_date,occurred_at,payload,revision) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET local_date=excluded.local_date,occurred_at=excluded.occurred_at,payload=excluded.payload,revision=excluded.revision WHERE meals.user_id=excluded.user_id',
          meal.id,
          userId,
          meal.localDate,
          meal.occurredAt,
          payload,
          revision,
        );
        await this.db.runAsync(
          'DELETE FROM meal_items WHERE meal_id = ? AND user_id = ?',
          meal.id,
          userId,
        );
        for (const [position, item] of items.entries())
          await this.db.runAsync(
            'INSERT INTO meal_items(id,meal_id,user_id,position,payload) VALUES(?,?,?,?,?)',
            item.id,
            meal.id,
            userId,
            position,
            JSON.stringify(item),
          );
      });
    });
  }

  deleteMeal(userId: string, mealId: string): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync(
        'UPDATE meals SET deleted_at = ?, revision = revision + 1 WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
        new Date().toISOString(),
        mealId,
        userId,
      );
    });
  }

  saveWeight(userId: string, entry: WeightEntry): Promise<void> {
    return this.serial(async () => {
      if (entry.userId !== userId) throw new Error('Weight belongs to another user.');
      assertAmount(entry.weightKg, 'Weight', true);
      if (!isLocalDate(entry.localDate)) throw new Error('Invalid weight date.');
      // UUID collisions must not transfer another user's record.
      await this.db.runAsync(
        'INSERT INTO weights(id,user_id,local_date,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET local_date=excluded.local_date,payload=excluded.payload WHERE weights.user_id=excluded.user_id',
        entry.id,
        userId,
        entry.localDate,
        JSON.stringify(entry),
      );
    });
  }

  snapshot(userId: string): Promise<Snapshot> {
    return this.serial(async () => {
      const user = await this.db.getFirstAsync<LocalUser>(
        'SELECT id, display_name AS displayName, onboarded_at AS onboardedAt FROM users WHERE id = ?',
        userId,
      );
      if (!user) throw new Error('Local user not found.');
      const rows = await this.db.getAllAsync<{ payload: string }>(
        'SELECT payload FROM weights WHERE user_id = ? ORDER BY local_date DESC',
        userId,
      );
      return {
        user,
        meals: await this.readMeals(userId),
        goals: await this.readGoals(userId),
        weights: rows.map((row) => JSON.parse(row.payload) as WeightEntry),
      };
    });
  }
}
