import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import {
  categories,
  isLocalDate,
  localDate,
  sumNutrition,
  type Meal,
  type MealCategory,
  type MealItem,
  type Unit,
} from '@mogu/domain';
import { useDiary } from '../data/provider';
import {
  Button,
  Card,
  Choice,
  ErrorMessage,
  Field,
  IconButton,
  Label,
  NutritionCard,
  Row,
  Screen,
} from '../ui/components';

interface EditableItem {
  id: string;
  name: string;
  reference: string;
  quantity: string;
  unit: Unit;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}
function newItem(): EditableItem {
  return {
    id: randomUUID(),
    name: '',
    reference: '1',
    quantity: '1',
    unit: 'serving',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  };
}
function editable(item: MealItem): EditableItem {
  return {
    id: item.id,
    name: item.name,
    reference: String(item.referenceQuantity),
    quantity: String(item.consumedQuantity),
    unit: item.unit,
    calories: item.nutrients.caloriesKcal == null ? '' : String(item.nutrients.caloriesKcal),
    protein: item.nutrients.proteinG == null ? '' : String(item.nutrients.proteinG),
    carbs: item.nutrients.carbsG == null ? '' : String(item.nutrients.carbsG),
    fat: item.nutrients.fatG == null ? '' : String(item.nutrients.fatG),
  };
}
function number(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}
function materialize(item: EditableItem): MealItem {
  return {
    id: item.id,
    name: item.name.trim(),
    referenceQuantity: Number(item.reference),
    consumedQuantity: Number(item.quantity),
    unit: item.unit,
    source: 'manual',
    nutrients: {
      caloriesKcal: number(item.calories),
      proteinG: number(item.protein),
      carbsG: number(item.carbs),
      fatG: number(item.fat),
    },
  };
}

export default function MealEditor() {
  const { id, date: dateParam } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { user, meals, store, refresh } = useDiary();
  const existing = meals.find((meal) => meal.id === id);
  const [mealId] = useState(() => existing?.id ?? randomUUID());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(
    existing?.localDate ?? (dateParam && isLocalDate(dateParam) ? dateParam : localDate()),
  );
  const [category, setCategory] = useState<MealCategory>(existing?.category ?? 'lunch');
  const [items, setItems] = useState<EditableItem[]>(
    () => existing?.items.map(editable) ?? [newItem()],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  function update(itemId: string, patch: Partial<EditableItem>) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }
  let preview = null;
  try {
    preview = sumNutrition(items.map(materialize));
  } catch {
    /* Incomplete numeric fields are normal while editing. */
  }

  async function save() {
    if (saving.current) return;
    setError(null);
    if (!isLocalDate(date)) {
      setError('Enter a valid date as YYYY-MM-DD.');
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const occurred =
        existing && date === existing.localDate ? new Date(existing.occurredAt) : new Date();
      if (!existing || date !== existing.localDate) {
        const [year, month, day] = date.split('-').map(Number);
        occurred.setFullYear(year, month - 1, day);
      }
      const now = new Date().toISOString();
      const meal: Meal = {
        id: mealId,
        userId: user.id,
        title: title.trim(),
        category,
        localDate: date,
        occurredAt: occurred.toISOString(),
        timeZone:
          existing && date === existing.localDate
            ? existing.timeZone
            : Intl.DateTimeFormat().resolvedOptions().timeZone,
        items: items.map(materialize),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        revision: existing?.revision ?? 0,
      };
      await store.saveMeal(user.id, meal);
      await refresh();
      router.back();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not save your meal. Please try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function close() {
    Alert.alert('Leave this meal?', 'Unsaved changes will be discarded.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: () => router.back() },
    ]);
  }
  function remove() {
    Alert.alert('Delete meal?', 'This meal will be removed from your daily totals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          store
            .deleteMeal(user.id, mealId)
            .then(refresh)
            .then(() => router.back())
            .catch(() => {
              setBusy(false);
              setError('Could not delete this meal. Try again.');
            });
        },
      },
    ]);
  }

  if (id && !existing)
    return (
      <Screen>
        <Label>This meal is no longer available.</Label>
        <Button title="Go back" onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen>
      <Row>
        <IconButton name="close" label="Close meal editor" onPress={close} />
        <Label size="title">{existing ? 'Edit meal' : 'A little meal note'}</Label>
      </Row>
      <Label muted>Review your portion and nutrition, then save it to your diary.</Label>
      <Card>
        <Field
          label="Meal name"
          placeholder="e.g. Chicken salad"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
        <Field
          label="Date (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          maxLength={10}
        />
        <Choice
          label="Meal"
          options={categories.map((value) => ({
            value,
            label: value[0].toUpperCase() + value.slice(1),
          }))}
          value={category}
          onChange={setCategory}
        />
      </Card>
      {items.map((item, index) => (
        <Card key={item.id}>
          <Row>
            <Label>Item {index + 1}</Label>
            {items.length > 1 && (
              <IconButton
                name="trash-outline"
                label={`Remove item ${index + 1}`}
                onPress={() =>
                  setItems((current) => current.filter((entry) => entry.id !== item.id))
                }
              />
            )}
          </Row>
          <Field
            label={`Item ${index + 1} name`}
            placeholder="e.g. Salad with dressing"
            value={item.name}
            onChangeText={(name) => update(item.id, { name })}
            maxLength={200}
          />
          <Choice
            label="Unit"
            options={[
              { value: 'serving', label: 'Serving' },
              { value: 'g', label: 'Grams' },
              { value: 'ml', label: 'Milliliters' },
            ]}
            value={item.unit}
            onChange={(unit) => update(item.id, { unit, reference: '', quantity: '' })}
          />
          <Row>
            <Field
              label="Nutrition is for"
              value={item.reference}
              keyboardType="decimal-pad"
              onChangeText={(reference) => update(item.id, { reference })}
            />
            <Field
              label={`Amount eaten (${item.unit})`}
              value={item.quantity}
              keyboardType="decimal-pad"
              onChangeText={(quantity) => update(item.id, { quantity })}
            />
          </Row>
          <Label size="small" muted>
            Enter nutrition for {item.reference || '…'} {item.unit}. Mogu scales it to the amount
            eaten.
          </Label>
          <Field
            label="Calories (kcal)"
            value={item.calories}
            keyboardType="decimal-pad"
            onChangeText={(calories) => update(item.id, { calories })}
          />
          <View style={{ gap: 12 }}>
            <Field
              label="Protein (g, optional)"
              value={item.protein}
              keyboardType="decimal-pad"
              onChangeText={(protein) => update(item.id, { protein })}
            />
            <Field
              label="Carbs (g, optional)"
              value={item.carbs}
              keyboardType="decimal-pad"
              onChangeText={(carbs) => update(item.id, { carbs })}
            />
            <Field
              label="Fat (g, optional)"
              value={item.fat}
              keyboardType="decimal-pad"
              onChangeText={(fat) => update(item.id, { fat })}
            />
          </View>
          <Label size="small" muted>
            Leave unknown macros blank. Enter 0 only when you know it is zero.
          </Label>
        </Card>
      ))}
      {items.length < 20 && (
        <Button
          secondary
          title="＋  Add another item"
          onPress={() => setItems((current) => [...current, newItem()])}
        />
      )}
      {preview && (
        <>
          <Label size="eyebrow" muted>
            MEAL TOTAL · MANUAL ENTRY
          </Label>
          <NutritionCard total={preview} />
        </>
      )}
      <ErrorMessage message={error} />
      <Button
        disabled={busy}
        title={busy ? 'Saving…' : 'Save meal'}
        onPress={() => {
          void save();
        }}
      />
      {existing && <Button secondary danger disabled={busy} title="Delete meal" onPress={remove} />}
    </Screen>
  );
}
