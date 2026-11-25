import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Label, Screen } from '../../ui/components';
import { Mascot } from '../../ui/mascot';
import { colors } from '../../ui/theme';

export default function Log() {
  return (
    <Screen>
      <Label size="title">Mogu</Label>
      <Label size="eyebrow" muted>
        ONE MEAL AT A TIME
      </Label>
      <View style={{ alignItems: 'center', paddingVertical: 25, gap: 20 }}>
        <Mascot size={215} />
        <Label size="title">What did you eat today?</Label>
        <Label muted>
          Start with what you know. You can adjust the portion and nutrition before saving.
        </Label>
      </View>
      <Card style={{ backgroundColor: colors.card }}>
        <Label>Let's make a little note.</Label>
        <Label size="small" muted>
          Add calories and macros from a label, a recipe, or your own estimate.
        </Label>
        <Button title="＋  Add a meal manually" onPress={() => router.push('/meal')} />
      </Card>
      <Label size="small" muted>
        Stored on your phone. No account needed.
      </Label>
    </Screen>
  );
}
