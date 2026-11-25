import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { isLocalDate, localDate } from '@mogu/domain';
import { useDiary } from '../data/provider';
import {
  Button,
  Card,
  Choice,
  ErrorMessage,
  Field,
  IconButton,
  Label,
  Row,
  Screen,
} from '../ui/components';

export default function Weight() {
  const { user, store, refresh } = useDiary();
  const [id] = useState(randomUUID);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(localDate());
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  async function save() {
    if (saving.current) return;
    if (!weight.trim() || !isLocalDate(date)) {
      setError('Enter a weight and a valid date.');
      return;
    }
    setError(null);
    setBusy(true);
    saving.current = true;
    try {
      await store.saveWeight(user.id, {
        id,
        userId: user.id,
        weightKg: Number(weight) / (unit === 'lb' ? 2.2046226218 : 1),
        localDate: date,
        measuredAt: new Date(`${date}T12:00:00`).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await refresh();
      router.back();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save weight.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Row>
        <IconButton name="close" label="Close weight entry" onPress={() => router.back()} />
        <Label size="title">A weight note</Label>
      </Row>
      <Label muted>One measurement is just one moment.</Label>
      <Card>
        <Choice
          label="Weight unit"
          options={[
            { value: 'kg', label: 'Kilograms' },
            { value: 'lb', label: 'Pounds' },
          ]}
          value={unit}
          onChange={(nextUnit) => {
            if (nextUnit !== unit && weight.trim() && Number.isFinite(Number(weight))) {
              const converted =
                Number(weight) * (nextUnit === 'lb' ? 2.2046226218 : 1 / 2.2046226218);
              setWeight(String(Math.round(converted * 1000) / 1000));
            }
            setUnit(nextUnit);
          }}
        />
        <Field
          label={`Weight (${unit})`}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} maxLength={10} />
        <Label size="small" muted>
          This won't change your calorie targets. You can recalculate them in your profile.
        </Label>
      </Card>
      <ErrorMessage message={error} />
      <Button
        disabled={busy}
        title={busy ? 'Saving…' : 'Save weight'}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
