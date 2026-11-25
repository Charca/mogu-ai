import { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { localDate } from '@mogu/domain';
import { useDiary } from '../data/provider';
import { Card, Field, Label, Screen } from '../ui/components';
import { Mascot } from '../ui/mascot';
import { GoalForm } from '../ui/goal-form';

export default function Onboarding() {
  const { user, store, refresh } = useDiary();
  const [name, setName] = useState('');
  if (user.onboardedAt) return <Redirect href="/" />;
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Mascot size={145} />
        <Label size="eyebrow">MEET YOUR DAILY COMPANION</Label>
        <Label size="title">A little more mindful. A lot more you.</Label>
        <Label muted>Welcome to Mogu. Let's set up your diary.</Label>
      </View>
      <Card>
        <Label>Your diary stays with you.</Label>
        <Label size="small" muted>
          No account or AI key is needed to get started. Your meals and profile are stored on this
          phone.
        </Label>
        <Field
          label="What should Mogu call you? (optional)"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoComplete="given-name"
        />
      </Card>
      <GoalForm
        submitLabel="Start my diary  →"
        onSave={async (nutrients, inputs) => {
          await store.completeOnboarding(
            user.id,
            name,
            {
              id: randomUUID(),
              userId: user.id,
              effectiveLocalDate: localDate(),
              nutrients,
              source: inputs ? 'calculated' : 'manual',
              inputs,
            },
            inputs,
          );
          await refresh();
        }}
      />
    </Screen>
  );
}
