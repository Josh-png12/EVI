import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvi } from '../../src/hooks/use-evi';
import { buildHistoryEntries } from '../../src/domain/history';
import { mealMeta } from '../../src/types';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { EviCard } from '../../src/components/EviCard';
import { PillBadge } from '../../src/components/PillBadge';

export default function HistoryScreen() {
  const { data } = useEvi();
  const { medications, doseLogs } = data;

  const historyMap = buildHistoryEntries(medications, doseLogs, 30);
  const dateKeys = Object.keys(historyMap);

  const formatHeaderDate = (dateStr: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    if (dateStr === today) return 'Hoy';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toLocaleDateString('en-CA')) return 'Ayer';

    // Format like "Miércoles, 4 de Septiembre"
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (occurredAt?: string) => {
    if (!occurredAt) return '';
    const d = new Date(occurredAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Historial 📖</Text>
          <Text style={styles.subtitle}>Tus tomas registradas en los últimos 30 días</Text>
        </View>

        {dateKeys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyTitle}>Aún no hay tomas registradas</Text>
            <Text style={styles.emptyText}>
              A medida que vayas usando "Estoy por comer", aquí verás el registro de tus momentos.
            </Text>
          </View>
        ) : (
          <FlatList
            data={dateKeys}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: dateStr }) => {
              const entries = historyMap[dateStr];
              return (
                <View style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>{formatHeaderDate(dateStr)}</Text>
                  {entries.map((entry, idx) => (
                    <EviCard
                      key={`${entry.medicationId}-${entry.mealType}-${idx}`}
                      variant={entry.status === 'taken' ? 'white' : 'blush'}
                      style={styles.entryCard}
                    >
                      <View style={styles.entryRow}>
                        <View style={styles.entryInfo}>
                          <View style={styles.entryMealTag}>
                            <Text style={styles.entryMealEmoji}>
                              {mealMeta[entry.mealType].emoji}
                            </Text>
                            <Text style={styles.entryMealLabel}>
                              {mealMeta[entry.mealType].label}
                            </Text>
                            {entry.occurredAt && (
                              <Text style={styles.entryTime}>
                                · {formatTime(entry.occurredAt)}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.entryMedName}>{entry.medicationName}</Text>
                          {entry.note ? (
                            <Text style={styles.entryNote}>Nota: "{entry.note}"</Text>
                          ) : null}
                        </View>

                        <PillBadge status={entry.status} />
                      </View>
                    </EviCard>
                  ))}
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.plum,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: 2,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.roseDark,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  entryCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 4,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  entryMealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  entryMealEmoji: {
    fontSize: fontSize.sm,
  },
  entryMealLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.muted,
  },
  entryTime: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: '500',
  },
  entryMedName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.plum,
  },
  entryNote: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
