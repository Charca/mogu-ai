import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, macroColors } from './theme';
import { formatNumber, type NutritionTotal, type Nutrients } from '@mogu/domain';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.screen}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Label({
  children,
  size = 'body',
  muted = false,
}: {
  children: ReactNode;
  size?: 'body' | 'small' | 'title' | 'hero' | 'eyebrow';
  muted?: boolean;
}) {
  return (
    <Text style={[styles.text, styles[size], muted && { color: colors.muted }]}>{children}</Text>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && { backgroundColor: '#FCE6EC' },
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, danger && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconButton}
    >
      <Ionicons name={name} size={22} color={colors.ink} />
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ flex: 1, gap: 7 }}>
      <Label size="small" muted>
        {label}
      </Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Label size="small" muted>
        {label}
      </Label>
      <View style={styles.choices}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value }}
            accessibilityLabel={`${label}: ${option.label}`}
            onPress={() => onChange(option.value)}
            style={[styles.choice, value === option.value && { backgroundColor: colors.lime }]}
          >
            <Text style={styles.choiceText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 22 }}>
      {message}
    </Text>
  );
}
export function NutritionCard({
  total,
  goal,
  empty = false,
}: {
  total: NutritionTotal;
  goal?: Nutrients;
  empty?: boolean;
}) {
  const consumed = total.values.caloriesKcal;
  const target = goal?.caloriesKcal;
  const ratio = target ? Math.min(consumed / target, 1) : 0;
  return (
    <Card>
      <Row>
        <Label size="small" muted>
          CALORIES {empty ? 'TODAY' : 'LOGGED'}
        </Label>
        <View style={styles.badge}>
          <Label size="small">✦ A little awareness</Label>
        </View>
      </Row>
      <Row style={{ alignItems: 'baseline', justifyContent: 'flex-start', gap: 6 }}>
        <Label size="hero">
          {formatNumber(consumed)}
          {total.incomplete.caloriesKcal ? '+' : ''}
        </Label>
        <Label muted>kcal</Label>
      </Row>
      {target ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
          </View>
          <Label size="small" muted>
            of {formatNumber(target)} kcal daily goal
            {consumed > target ? ' · Above your target' : ''}
          </Label>
        </>
      ) : (
        <Label size="small" muted>
          No target set for this date
        </Label>
      )}
      <Row style={{ alignItems: 'stretch', gap: 8 }}>
        {(['proteinG', 'fatG', 'carbsG'] as const).map((key) => (
          <View key={key} style={[styles.macro, { backgroundColor: macroColors[key] }]}>
            <Label size="small">
              {key === 'proteinG' ? 'Protein' : key === 'fatG' ? 'Fat' : 'Carbs'}
            </Label>
            <Label>
              {formatNumber(total.values[key], 1)}
              {total.incomplete[key] ? '+' : ''} g
            </Label>
          </View>
        ))}
      </Row>
      {Object.values(total.incomplete).some(Boolean) && (
        <Label size="small" muted>
          + Some nutrients are unknown. Totals include known values.
        </Label>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { padding: 20, paddingBottom: 40, gap: 20, flexGrow: 1 },
  text: { color: colors.ink, fontFamily: 'System', flexShrink: 1 },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 12, lineHeight: 18 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 34, letterSpacing: -0.7 },
  hero: { fontSize: 42, fontWeight: '800', letterSpacing: -1.5 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: '0px 4px 16px rgba(35, 30, 70, 0.035)',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  button: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondary: { backgroundColor: colors.line },
  buttonText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  input: {
    minHeight: 50,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  choiceText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  track: { height: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.line },
  fill: { height: '100%', backgroundColor: colors.lime, borderRadius: 10 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.limePale,
    borderRadius: 10,
  },
  macro: { flex: 1, borderRadius: 15, padding: 10, gap: 3 },
});
