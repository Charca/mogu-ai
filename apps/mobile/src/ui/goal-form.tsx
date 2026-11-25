import { useState } from 'react';
import { calculateTargets, nutrientKeys, type Nutrients, type ProfileInput } from '@mogu/domain';
import { Button, Card, Choice, ErrorMessage, Field, Label, Row } from './components';

export function GoalForm({
  initial,
  onSave,
  submitLabel,
}: {
  initial?: Nutrients;
  onSave: (nutrients: Nutrients, inputs: ProfileInput | null) => Promise<void>;
  submitLabel: string;
}) {
  const [mode, setMode] = useState<'manual' | 'calculate'>(initial ? 'manual' : 'calculate');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [coefficient, setCoefficient] = useState<'male' | 'female' | ''>('');
  const [activity, setActivity] = useState<ProfileInput['activity']>('sedentary');
  const [goal, setGoal] = useState<ProfileInput['goal']>('maintain');
  const [fields, setFields] = useState(
    () =>
      Object.fromEntries(
        nutrientKeys.map((key) => [
          key,
          initial?.[key] == null ? '' : String(Math.round(initial[key]! * 10) / 10),
        ]),
      ) as Record<keyof Nutrients, string>,
  );
  const [calculation, setCalculation] = useState<{
    nutrients: Nutrients;
    inputs: ProfileInput;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function calculate() {
    try {
      if (!age.trim() || !height.trim() || !weight.trim() || !coefficient)
        throw new Error('Enter your measurements and select an equation.');
      const inputs: ProfileInput = {
        age: Number(age),
        heightCm: Number(height),
        weightKg: Number(weight),
        coefficient,
        activity,
        goal,
      };
      const nutrients = calculateTargets(inputs);
      setCalculation({ nutrients, inputs });
      setFields(
        Object.fromEntries(
          nutrientKeys.map((key) => [key, String(Math.round(nutrients[key]! * 10) / 10)]),
        ) as Record<keyof Nutrients, string>,
      );
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Check your profile.');
    }
  }

  async function save() {
    setError(null);
    if (mode === 'calculate' && !calculation) {
      setError('Calculate a suggestion first, or choose manual targets.');
      return;
    }
    if (nutrientKeys.some((key) => !fields[key].trim())) {
      setError('Enter calories and all three macro targets.');
      return;
    }
    const nutrients =
      calculation?.nutrients ??
      (Object.fromEntries(nutrientKeys.map((key) => [key, Number(fields[key])])) as Nutrients);
    setBusy(true);
    try {
      await onSave(nutrients, calculation?.inputs ?? null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save targets.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Choice
        label="Your daily targets"
        value={mode}
        options={[
          { value: 'calculate', label: 'Help me calculate' },
          { value: 'manual', label: 'Set manually' },
        ]}
        onChange={(value) => {
          setMode(value);
          setCalculation(null);
          setError(null);
        }}
      />
      {mode === 'calculate' && (
        <Card>
          <Label>Start with a suggestion</Label>
          <Label size="small" muted>
            For adults. These are estimates, and you can adjust every target.
          </Label>
          <Row>
            <Field
              label="Age (years)"
              value={age}
              onChangeText={(v) => {
                setAge(v);
                setCalculation(null);
              }}
              keyboardType="number-pad"
            />
            <Field
              label="Height (cm)"
              value={height}
              onChangeText={(v) => {
                setHeight(v);
                setCalculation(null);
              }}
              keyboardType="decimal-pad"
            />
          </Row>
          <Field
            label="Current weight (kg)"
            value={weight}
            onChangeText={(v) => {
              setWeight(v);
              setCalculation(null);
            }}
            keyboardType="decimal-pad"
          />
          <Choice
            label="Resting-energy equation"
            options={[
              { value: 'male', label: 'Male equation' },
              { value: 'female', label: 'Female equation' },
            ]}
            value={coefficient}
            onChange={(value) => {
              setCoefficient(value);
              setCalculation(null);
            }}
          />
          <Label size="small" muted>
            This selects a Mifflin–St Jeor formula coefficient. You can use manual targets instead.
          </Label>
          <Choice
            label="Typical activity"
            options={[
              { value: 'sedentary', label: 'Sedentary' },
              { value: 'light', label: 'Light' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'very', label: 'Very active' },
            ]}
            value={activity}
            onChange={(value) => {
              setActivity(value);
              setCalculation(null);
            }}
          />
          <Choice
            label="Your goal"
            options={[
              { value: 'maintain', label: 'Maintain' },
              { value: 'lose', label: 'Lose' },
              { value: 'gain', label: 'Gain' },
            ]}
            value={goal}
            onChange={(value) => {
              setGoal(value);
              setCalculation(null);
            }}
          />
          <Button secondary title="Calculate suggestion" onPress={calculate} />
        </Card>
      )}
      <Card>
        <Label>Review your daily targets</Label>
        {nutrientKeys.map((key) => (
          <Field
            key={key}
            label={
              key === 'caloriesKcal'
                ? 'Calories (kcal)'
                : key === 'proteinG'
                  ? 'Protein (g)'
                  : key === 'carbsG'
                    ? 'Carbs (g)'
                    : 'Fat (g)'
            }
            keyboardType="decimal-pad"
            value={fields[key]}
            onChangeText={(value) => {
              setFields((previous) => ({ ...previous, [key]: value }));
              if (calculation) {
                setMode('manual');
                setCalculation(null);
              }
            }}
          />
        ))}
        <Label size="small" muted>
          Your targets guide the diary. They aren't a score, and a logged day may still be
          incomplete.
        </Label>
      </Card>
      <ErrorMessage message={error} />
      <Button
        title={busy ? 'Saving…' : submitLabel}
        onPress={() => {
          void save();
        }}
        disabled={busy}
      />
    </>
  );
}
