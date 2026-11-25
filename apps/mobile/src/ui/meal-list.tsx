import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { categories, formatNumber, sumNutrition, type Meal } from '@mogu/domain';
import { Card, Label, Row } from './components';
import { colors } from './theme';

const emoji = { breakfast: '☀️', lunch: '🥗', dinner: '🍲', snack: '🍓' };
export function MealList({ meals }: { meals: Meal[] }) {
  return (
    <View style={{ gap: 16 }}>
      {categories.map((category) => {
        const group = meals.filter((meal) => meal.category === category);
        if (!group.length) return null;
        return (
          <View key={category} style={{ gap: 10 }}>
            <Label size="eyebrow" muted>
              {category.toUpperCase()}
              {category === 'snack' ? 'S' : ''}
            </Label>
            <Card>
              {group.map((meal) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${meal.title}`}
                  key={meal.id}
                  onPress={() => router.push({ pathname: '/meal', params: { id: meal.id } })}
                  style={{ minHeight: 54, justifyContent: 'center' }}
                >
                  <Row>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: colors.limePale,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Label>{emoji[category]}</Label>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>{meal.title}</Label>
                      <Label size="small" muted>
                        {meal.items.length} {meal.items.length === 1 ? 'item' : 'items'} · Manual
                        entry
                      </Label>
                    </View>
                    <Label size="small">
                      {formatNumber(sumNutrition(meal.items).values.caloriesKcal)} kcal ›
                    </Label>
                  </Row>
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
    </View>
  );
}
