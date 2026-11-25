import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { goalForDate, localDate } from '@mogu/domain';
import { useDiary } from '../data/provider';
import { Card, IconButton, Label, Row, Screen } from '../ui/components';
import { GoalForm } from '../ui/goal-form';
import { Mascot } from '../ui/mascot';

export default function Settings() {
  const { user, goals, store, refresh } = useDiary();
  const goal = goalForDate(goals, localDate());
  return (
    <Screen>
      <Row>
        <IconButton name="chevron-back" label="Back" onPress={() => router.back()} />
        <Label size="title">Your profile</Label>
        <Mascot size={54} />
      </Row>
      <Card>
        <Label>{user.displayName || 'Hello, friend'}</Label>
        <Label size="small" muted>
          A local diary, just for you. No account connected.
        </Label>
      </Card>
      <GoalForm
        initial={goal?.nutrients}
        submitLabel="Apply targets from today"
        onSave={async (nutrients, inputs) => {
          await store.saveGoal(user.id, {
            id: randomUUID(),
            userId: user.id,
            effectiveLocalDate: localDate(),
            nutrients,
            source: inputs ? 'calculated' : 'manual',
            inputs,
          });
          await refresh();
          router.back();
        }}
      />
      <Label size="small" muted>
        New targets apply from today. Earlier diary goals stay as they were. Weight changes never
        update targets automatically.
      </Label>
      <Card>
        <Label>About this early build</Label>
        <Label size="small" muted>
          Manual logging, local history, daily goals, and weight tracking are ready to try. Gemini
          photo/text analysis, barcode lookup, and export/restore are the next milestones.
        </Label>
      </Card>
    </Screen>
  );
}
