import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { dateOffset, formatNumber, goalForDate, sumNutrition } from '@mogu/domain';
import { useDiary } from '../../data/provider';
import { Button, Card, Choice, IconButton, Label, Row, Screen } from '../../ui/components';
import { colors } from '../../ui/theme';

export default function Progress() {
  const { meals, weights, goals, today } = useDiary();
  const [range, setRange] = useState<'7' | '30'>('7');
  const dates = Array.from({ length: Number(range) }, (_, i) =>
    dateOffset(today, i - Number(range) + 1),
  );
  const days = dates.map((date) => {
    const entries = meals.filter((meal) => meal.localDate === date);
    return {
      date,
      logged: entries.length > 0,
      calories: sumNutrition(entries.flatMap((meal) => meal.items)).values.caloriesKcal,
      goal: goalForDate(goals, date)?.nutrients.caloriesKcal,
    };
  });
  const logged = days.filter((day) => day.logged);
  const average = logged.length
    ? logged.reduce((sum, day) => sum + day.calories, 0) / logged.length
    : null;
  const maximum = Math.max(1, ...days.flatMap((day) => [day.calories, day.goal ?? 0]));
  const recentWeights = weights.filter(
    (entry) => entry.localDate >= dates[0] && entry.localDate <= today,
  );
  const minWeight = Math.min(...recentWeights.map((entry) => entry.weightKg)) - 0.5;
  const maxWeight = Math.max(...recentWeights.map((entry) => entry.weightKg)) + 0.5;
  return (
    <Screen>
      <Row>
        <Label size="title">Your little picture</Label>
        <IconButton
          name="settings-outline"
          label="Profile and settings"
          onPress={() => router.push('/settings')}
        />
      </Row>
      <Choice
        label="Looking back"
        options={[
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
        ]}
        value={range}
        onChange={setRange}
      />
      <Card style={{ backgroundColor: colors.limePale }}>
        <Label>Every note adds perspective.</Label>
        <Label size="small" muted>
          These charts show what you've logged, not everything you've eaten.
        </Label>
      </Card>
      <Card>
        <Label size="small" muted>
          AVERAGE CALORIES LOGGED
        </Label>
        <Label size="hero">
          {average === null ? '—' : formatNumber(average)}
          <Label size="body"> kcal</Label>
        </Label>
        <Label size="small" muted>
          {logged.length} logged {logged.length === 1 ? 'day' : 'days'} · May include partially
          logged days
        </Label>
        <View
          accessible
          accessibilityLabel={days
            .map(
              (day) =>
                `${day.date}: ${day.logged ? `${Math.round(day.calories)} calories logged` : 'no meals logged'}`,
            )
            .join('. ')}
        >
          <Svg width="100%" height={140} viewBox="0 0 300 140" accessible={false}>
            {days.map((day, i) => {
              const x = (i * 300) / days.length + 2;
              const width = Math.max(2, 300 / days.length - 4);
              return (
                <ChartDay
                  key={day.date}
                  x={x}
                  width={width}
                  calories={day.calories}
                  goal={day.goal}
                  maximum={maximum}
                  logged={day.logged}
                />
              );
            })}
          </Svg>
        </View>
        <Row>
          <Label size="small" muted>
            {dates[0].slice(5)}
          </Label>
          <Label size="small" muted>
            {today.slice(5)}
          </Label>
        </Row>
        <Label size="small" muted>
          Lime: logged intake · Dash: dated target · Dot: no meal logged
        </Label>
      </Card>
      <Card>
        <Row>
          <Label>Weight notes</Label>
          <Label size="small" muted>
            kg
          </Label>
        </Row>
        {recentWeights.length ? (
          <>
            <View
              accessible
              accessibilityLabel={recentWeights
                .map((entry) => `${entry.localDate}: ${formatNumber(entry.weightKg, 1)} kilograms`)
                .join('. ')}
            >
              <Svg width="100%" height={120} viewBox="0 0 300 120" accessible={false}>
                {recentWeights.map((entry) => (
                  <Circle
                    key={entry.id}
                    cx={15 + (dates.indexOf(entry.localDate) * 270) / Math.max(1, dates.length - 1)}
                    cy={95 - ((entry.weightKg - minWeight) / (maxWeight - minWeight)) * 75}
                    r={5}
                    fill="#9EBF31"
                  />
                ))}
                <SvgText x={0} y={12} fontSize={10} fill={colors.muted}>
                  {formatNumber(maxWeight, 1)} kg
                </SvgText>
                <SvgText x={0} y={115} fontSize={10} fill={colors.muted}>
                  {formatNumber(minWeight, 1)} kg
                </SvgText>
              </Svg>
            </View>
            <Label size="small" muted>
              {recentWeights.length} measurements · Gaps are not filled in
            </Label>
          </>
        ) : (
          <Label muted>No weight measurements in this range.</Label>
        )}
        <Button secondary title="＋  Log weight" onPress={() => router.push('/weight')} />
      </Card>
    </Screen>
  );
}

function ChartDay({
  x,
  width,
  calories,
  goal,
  maximum,
  logged,
}: {
  x: number;
  width: number;
  calories: number;
  goal?: number | null;
  maximum: number;
  logged: boolean;
}) {
  return (
    <>
      {logged ? (
        <Rect
          x={x}
          y={125 - (calories / maximum) * 110}
          width={width}
          height={Math.max(1, (calories / maximum) * 110)}
          rx={Math.min(5, width / 2)}
          fill={colors.lime}
        />
      ) : (
        <Circle cx={x + width / 2} cy={125} r={2} fill="#D7D4E2" />
      )}
      {goal != null && (
        <Line
          x1={x}
          x2={x + width}
          y1={125 - (goal / maximum) * 110}
          y2={125 - (goal / maximum) * 110}
          stroke="#858294"
          strokeWidth={2}
        />
      )}
    </>
  );
}
