import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvi } from '../../src/hooks/use-evi';
import { MealType, Medication, MedicationSchedule, mealMeta, mealTypes } from '../../src/types';
import { isValidTime } from '../../src/domain/date';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { EviCard } from '../../src/components/EviCard';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { GhostButton } from '../../src/components/GhostButton';
import { MedicationScheduleForm, scheduleLabel } from '../../src/components/MedicationScheduleForm';
import {
  areNativeNotificationsAvailable,
  requestNotificationPermissions,
} from '../../src/services/notifications/notification-service';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    data,
    updateSettings,
    addMedication,
    updateMedication,
    toggleMedicationActive,
    deleteMedication,
    reset,
    syncNotifications,
  } = useEvi();
  const { settings, medications, mealEvents } = data;

  // Name state
  const [name, setName] = useState(settings.name || 'Evi');
  const [isEditingName, setIsEditingName] = useState(false);

  // Time state
  const [times, setTimes] = useState<Record<MealType, string>>(settings.referenceTimes);

  // Add Med Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [newMedName, setNewMedName] = useState('');
  const [newDoseLabel, setNewDoseLabel] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newSchedule, setNewSchedule] = useState<MedicationSchedule>();

  const handleSaveName = async () => {
    await updateSettings({ name: name.trim() || 'Evi' });
    setIsEditingName(false);
  };

  const handleSaveTime = async (meal: MealType, val: string) => {
    const updated = { ...times, [meal]: val };
    setTimes(updated);
    if (!isValidTime(val)) return;
    await updateSettings({ referenceTimes: updated });
  };

  const isScheduleComplete = (value?: MedicationSchedule) => {
    if (!value) return false;
    if ((value.type === 'BEFORE_MEAL' || value.type === 'AFTER_MEAL' || value.type === 'WITH_MEAL') && !value.mealTypes?.length) return false;
    if (value.type === 'INTERVAL' && (!value.intervalHours || !isValidTime(value.time))) return false;
    if (value.type === 'TIME' && !isValidTime(value.time)) return false;
    if (value.type === 'WEEKDAYS' && !value.weekdays?.length) return false;
    if (value.type === 'CUSTOM' && !value.customText?.trim()) return false;
    return true;
  };

  const openCreateMedication = () => {
    setEditingMedicationId(null);
    setNewMedName('');
    setNewDoseLabel('');
    setNewInstructions('');
    setNewSchedule(undefined);
    setModalVisible(true);
  };

  const openEditMedication = (medication: Medication) => {
    setEditingMedicationId(medication.id);
    setNewMedName(medication.name);
    setNewDoseLabel(medication.doseLabel ?? '');
    setNewInstructions(medication.instructions);
    setNewSchedule(medication.schedule);
    setModalVisible(true);
  };

  const handleCreateMed = async () => {
    if (!newMedName.trim()) {
      Alert.alert('Falta nombre', 'Por favor escribe el nombre del medicamento.');
      return;
    }
    if (!isScheduleComplete(newSchedule)) {
      Alert.alert('Falta la pauta', 'Selecciona y completa la pauta registrada para este medicamento.');
      return;
    }

    const medicationValues = {
      name: newMedName.trim(),
      instructions: newInstructions.trim() || 'Tomar según indicación médica',
      doseLabel: newDoseLabel.trim() || undefined,
      schedule: newSchedule,
      mealTypes: newSchedule?.mealTypes ?? [],
    };

    if (editingMedicationId) {
      await updateMedication(editingMedicationId, medicationValues);
    } else {
      await addMedication({ ...medicationValues, active: true });
    }

    setNewMedName('');
    setNewDoseLabel('');
    setNewInstructions('');
    setNewSchedule(undefined);
    setEditingMedicationId(null);
    setModalVisible(false);
  };

  const handleSyncNotifications = async () => {
    if (!areNativeNotificationsAvailable()) {
      Alert.alert(
        'Notificaciones no disponibles',
        'Expo Go no incluye notificaciones nativas en Android. Estarán disponibles en un Development Build.'
      );
      return;
    }

    const result = await requestNotificationPermissions();
    if (result.granted) {
      await syncNotifications();
      Alert.alert('Notificaciones listas ✨', 'Tus recordatorios locales han sido reprogramados con éxito.');
    } else {
      Alert.alert(
        'Permisos no concedidos',
        'Por favor activa los permisos de notificación para EVI en los Ajustes de tu dispositivo.'
      );
    }
  };

  const handleResetData = () => {
    Alert.alert(
      '¿Restablecer EVI?',
      'Se borrarán todos tus medicamentos, horarios y registros de tomas locales. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar todo',
          style: 'destructive',
          onPress: async () => {
            await reset();
            router.replace('/onboarding/step-name');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes ⚙️</Text>
          <Text style={styles.subtitle}>Personaliza tus preferencias y medicamentos</Text>
        </View>

        {/* Profile Card */}
        <EviCard variant="white" style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Tu nombre</Text>
          {isEditingName ? (
            <View style={styles.rowEdit}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.nameInput}
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.saveSmallBtn}>
                <Text style={styles.saveSmallBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.rowDisplay}>
              <Text style={styles.nameValue}>{settings.name}</Text>
              <TouchableOpacity onPress={() => setIsEditingName(true)}>
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            </View>
          )}
        </EviCard>

        {/* Reference Times */}
        <EviCard variant="white" style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Horarios aproximados de referencia</Text>
          <Text style={styles.sectionHelp}>
            Sirven para calcular los recordatorios locales antes de cada comida.
          </Text>

          {mealTypes.map((meal) => (
            <View key={meal} style={styles.timeSettingRow}>
              <View style={styles.timeMealTag}>
                <Text style={styles.timeMealEmoji}>{mealMeta[meal].emoji}</Text>
                <Text style={styles.timeMealName}>{mealMeta[meal].label}</Text>
              </View>
              <TextInput
                value={times[meal]}
                onChangeText={(val) => handleSaveTime(meal, val)}
                style={styles.timeInput}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          ))}
        </EviCard>

        {/* Medications Management */}
        <EviCard variant="white" style={styles.sectionCard}>
          <View style={styles.medsHeader}>
            <Text style={styles.sectionLabel}>Tus medicamentos indicados</Text>
            <TouchableOpacity onPress={openCreateMedication}>
              <Text style={styles.addMedText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {medications.length === 0 ? (
            <Text style={styles.emptyMedsText}>No tienes medicamentos configurados aún.</Text>
          ) : (
            medications.map((med) => (
              <View key={med.id} style={styles.medItem}>
                <View style={styles.medItemInfo}>
                  <View style={styles.medItemTitleRow}>
                    <Text
                      style={[
                        styles.medItemTitle,
                        !med.active && styles.medItemInactive,
                      ]}
                    >
                      {med.name}
                    </Text>
                    {!med.active && (
                      <View style={styles.inactiveTag}>
                        <Text style={styles.inactiveTagText}>Inactivo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.medItemInstructions}>{med.instructions}</Text>
                  {med.doseLabel && <Text style={styles.medItemInstructions}>Dosis: {med.doseLabel}</Text>}
                  <Text style={styles.medItemMeals}>{scheduleLabel(med.schedule)}</Text>
                </View>

                <View style={styles.medActions}>
                  <TouchableOpacity
                    onPress={() => openEditMedication(med)}
                    style={styles.actionIconBtn}
                  >
                    <Text style={styles.toggleBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleMedicationActive(med.id)}
                    style={styles.actionIconBtn}
                  >
                    <Text style={styles.toggleBtnText}>
                      {med.active ? 'Pausar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Eliminar medicamento',
                        `¿Deseas eliminar "${med.name}"?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Eliminar',
                            style: 'destructive',
                            onPress: () => deleteMedication(med.id),
                          },
                        ]
                      );
                    }}
                    style={styles.actionIconBtn}
                  >
                    <Text style={styles.deleteBtnText}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </EviCard>

        {/* Notifications & Health */}
        <EviCard variant="lavender" style={styles.sectionCard}>
          <Text style={styles.notifTitle}>🔔 Recordatorios locales</Text>
          <Text style={styles.notifText}>
            EVI recalcula tus horarios y notificaciones automáticamente sin necesidad de conexión a internet.
          </Text>
          <ConfirmButton
            title="Sincronizar recordatorios"
            icon="✨"
            variant="secondary"
            onPress={handleSyncNotifications}
            style={styles.syncBtn}
          />
        </EviCard>

        {/* App Philosophy */}
        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>EVI · Eva Luna 🌸🌙</Text>
          <Text style={styles.aboutText}>
            "El cerebro de EVI es código. Gemini es solamente un pequeño extra."
          </Text>
          <Text style={styles.aboutVersion}>Versión MVP 0.1.0 · 100% Local & Privada</Text>
        </View>

        {/* Reset / Delete data */}
        <GhostButton
          title="Borrar todos los datos y reiniciar"
          color={colors.roseDark}
          onPress={handleResetData}
          style={styles.resetBtn}
        />
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingMedicationId ? 'Editar medicamento 💊' : 'Nuevo medicamento 💊'}</Text>

            <Text style={styles.modalLabel}>Nombre</Text>
            <TextInput
              value={newMedName}
              onChangeText={setNewMedName}
              placeholder="Ej. Magnesio, Omega 3..."
              placeholderTextColor={colors.muted}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Dosis registrada (opcional)</Text>
            <TextInput
              value={newDoseLabel}
              onChangeText={setNewDoseLabel}
              placeholder="Ej. 1 comprimido"
              placeholderTextColor={colors.muted}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Instrucciones médicas</Text>
            <TextInput
              value={newInstructions}
              onChangeText={setNewInstructions}
              placeholder="Ej. 1 cápsula después de comer"
              placeholderTextColor={colors.muted}
              style={[styles.modalInput, { minHeight: 60 }]}
              multiline
            />

            <MedicationScheduleForm schedule={newSchedule} onChange={setNewSchedule} />

            <View style={styles.modalButtons}>
              <GhostButton
                title="Cancelar"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <ConfirmButton
                title="Guardar"
                onPress={handleCreateMed}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
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
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.plum,
  },
  sectionHelp: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  rowDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  nameValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.plum,
  },
  editText: {
    fontSize: fontSize.sm,
    color: colors.roseDark,
    fontWeight: '600',
  },
  rowEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  nameInput: {
    flex: 1,
    backgroundColor: colors.blush,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    fontSize: fontSize.md,
    color: colors.plum,
  },
  saveSmallBtn: {
    backgroundColor: colors.rose,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    borderRadius: radius.sm,
  },
  saveSmallBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  timeSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  timeMealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeMealEmoji: {
    fontSize: fontSize.lg,
  },
  timeMealName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.plum,
  },
  timeInput: {
    backgroundColor: colors.blush,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    fontWeight: '700',
    color: colors.plum,
    textAlign: 'center',
    width: 70,
  },
  medsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addMedText: {
    fontSize: fontSize.sm,
    color: colors.roseDark,
    fontWeight: '700',
  },
  emptyMedsText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontStyle: 'italic',
    marginVertical: spacing.xs,
  },
  medItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  medItemInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  medItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  medItemTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.plum,
  },
  medItemInactive: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  inactiveTag: {
    backgroundColor: colors.line,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  inactiveTagText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
  },
  medItemInstructions: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  medItemMeals: {
    fontSize: fontSize.xs,
    color: colors.lavenderDark,
    marginTop: 4,
    fontWeight: '500',
  },
  medActions: {
    gap: 4,
  },
  actionIconBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  toggleBtnText: {
    fontSize: fontSize.xs,
    color: colors.lavenderDark,
    fontWeight: '600',
  },
  deleteBtnText: {
    fontSize: fontSize.xs,
    color: colors.roseDark,
    fontWeight: '600',
  },
  notifTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.lavenderDark,
  },
  notifText: {
    fontSize: fontSize.xs + 1,
    color: colors.plum,
    marginTop: 2,
    lineHeight: 18,
  },
  syncBtn: {
    marginTop: spacing.md,
    height: 44,
  },
  aboutBox: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  aboutTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: '700',
    color: colors.plum,
  },
  aboutText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
  aboutVersion: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
  },
  resetBtn: {
    marginBottom: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(73, 55, 71, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.plum,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.plum,
  },
  modalMealsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  modalMealBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  modalMealBtnSelected: {
    borderColor: colors.rose,
    backgroundColor: colors.blush,
  },
  modalMealBtnText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  modalMealBtnTextSelected: {
    color: colors.roseDark,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
