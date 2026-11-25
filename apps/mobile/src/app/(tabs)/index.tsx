import { View } from 'react-native';
import { router } from 'expo-router';
import { goalForDate, sumNutrition } from '@mogu/domain';
import { useDiary } from '../../data/provider';
import { Button, Card, IconButton, Label, NutritionCard, Row, Screen } from '../../ui/components';
import { Mascot } from '../../ui/mascot';
import { MealList } from '../../ui/meal-list';
import { colors } from '../../ui/theme';

export default function Today() {
  const { user, meals, goals, today } = useDiary();
  const entries = meals.filter((meal) => meal.localDate === today);
  const goal = goalForDate(goals, today);
  return (
    <Screen>
      <Row>
        <View>
          <Label size="eyebrow" muted>
            YOUR DAILY COMPANION
          </Label>
          <Label size="title">Mogu</Label>
        </View>
        <IconButton
          name="settings-outline"
          label="Profile and settings"
          onPress={() => router.push('/settings')}
        />
      </Row>
      <Row>
        <View style={{ flex: 1, gap: 6 }}>
          <Label size="title">
            A little check-in{user.displayName ? `, ${user.displayName}` : ''}.
          </Label>
          <Label muted>Make room for the everyday.</Label>
        </View>
        <Mascot size={112} />
      </Row>
      <Label size="small" muted>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Label>
      <NutritionCard
        total={sumNutrition(entries.flatMap((meal) => meal.items))}
        goal={goal?.nutrients}
        empty={!entries.length}
      />
      <Button title="＋  Log a meal" onPress={() => router.push('/log')} />
      <Row>
        <Label size="title">Your meals</Label>
        <IconButton
          name="calendar-outline"
          label="Open history"
          onPress={() => router.push('/history')}
        />
      </Row>
      {entries.length ? (
        <MealList meals={entries} />
      ) : (
        <Card style={{ backgroundColor: colors.limePale }}>
          <Label>Every meal is a place to start.</Label>
          <Label size="small" muted>
            Your meals will appear here after you save them. No need to make it perfect.
          </Label>
        </Card>
      )}
      <Button secondary title="Log your weight" onPress={() => router.push('/weight')} />
    </Screen>
  );
}
