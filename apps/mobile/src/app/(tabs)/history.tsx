import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { dateOffset, formatNumber, localDate, sumNutrition } from '@mogu/domain';
import { useDiary } from '../../data/provider';
import { Button, Card, IconButton, Label, Row, Screen } from '../../ui/components';
import { MealList } from '../../ui/meal-list';
import { colors } from '../../ui/theme';

export default function History() {
  const { meals } = useDiary();
  const [selected, setSelected] = useState(localDate());
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const first = new Date(`${month}-01T12:00:00`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const loggedDates = new Set(meals.map((meal) => meal.localDate));
  const selectedMeals = meals.filter((meal) => meal.localDate === selected);
  function moveMonth(delta: number) {
    const date = new Date(first);
    date.setMonth(date.getMonth() + delta);
    setMonth(localDate(date).slice(0, 7));
  }
  return (
    <Screen>
      <Row>
        <Label size="title">A little look back</Label>
        <IconButton
          name="today-outline"
          label="Jump to today"
          onPress={() => {
            setSelected(localDate());
            setMonth(localDate().slice(0, 7));
          }}
        />
      </Row>
      <Card style={{ padding: 12 }}>
        <Row>
          <IconButton name="chevron-back" label="Previous month" onPress={() => moveMonth(-1)} />
          <Label>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Label>
          <IconButton name="chevron-forward" label="Next month" onPress={() => moveMonth(1)} />
        </Row>
        <View style={{ flexDirection: 'row' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={index} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
              <Label size="small" muted>
                {day}
              </Label>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: first.getDay() + days }, (_, index) => {
            const day = index - first.getDay() + 1;
            if (day < 1) return <View key={index} style={{ width: `${100 / 7}%`, height: 48 }} />;
            const date = `${month}-${String(day).padStart(2, '0')}`;
            const logged = loggedDates.has(date);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selected === date }}
                accessibilityLabel={`${date}${logged ? ', meals logged' : ', no meals logged'}`}
                key={index}
                onPress={() => setSelected(date)}
                style={{
                  width: `${100 / 7}%`,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor:
                      selected === date ? colors.dark : logged ? colors.lime : colors.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <DayNumber day={day} selected={selected === date} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Label size="small" muted>
          Lime marks a day with a saved meal, not a complete day of eating.
        </Label>
      </Card>
      <Row>
        <IconButton
          name="chevron-back"
          label="Previous day"
          onPress={() => {
            const date = dateOffset(selected, -1);
            setSelected(date);
            setMonth(date.slice(0, 7));
          }}
        />
        <Label>{selected}</Label>
        <IconButton
          name="chevron-forward"
          label="Next day"
          onPress={() => {
            const date = dateOffset(selected, 1);
            setSelected(date);
            setMonth(date.slice(0, 7));
          }}
        />
      </Row>
      {selectedMeals.length ? (
        <>
          <Label>
            {formatNumber(
              sumNutrition(selectedMeals.flatMap((meal) => meal.items)).values.caloriesKcal,
            )}{' '}
            kcal logged
          </Label>
          <MealList meals={selectedMeals} />
        </>
      ) : (
        <Card>
          <Label>No meals saved for this date.</Label>
          <Label size="small" muted>
            A blank diary date doesn't mean you ate nothing.
          </Label>
        </Card>
      )}
      <Button
        title="＋  Log a meal for this day"
        onPress={() => router.push({ pathname: '/meal', params: { date: selected } })}
      />
    </Screen>
  );
}

function DayNumber({ day, selected }: { day: number; selected: boolean }) {
  return (
    <Text style={{ color: selected ? colors.card : colors.ink, fontSize: 12, fontWeight: '600' }}>
      {day}
    </Text>
  );
}
