/**
 * LockedFeatureModal — mirrors app/frontend/src/components/LockedFeatureModal.tsx
 * Shown when a free-tier user opens a premium-gated screen.
 */
import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../theme/fonts';

const PLAN_NAMES: Record<'balanced' | 'family', { en: string; ar: string }> = {
  balanced: { en: 'Balanced Life', ar: 'الحياة المتوازنة' },
  family: { en: 'Family Plan', ar: 'أمانة العائلة' },
};

interface LockedFeatureModalProps {
  visible: boolean;
  onClose: () => void;
  requiredPlan: 'balanced' | 'family';
}

export default function LockedFeatureModal({ visible, onClose, requiredPlan }: LockedFeatureModalProps) {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const planName = PLAN_NAMES[requiredPlan];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {isAr ? '🔒 ميزة مدفوعة' : '🔒 Premium Feature'}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {isAr
              ? `هذه الميزة متاحة في خطة ${planName.ar}. قم بالترقية للوصول إليها.`
              : `This feature is available in the ${planName.en} plan. Upgrade to unlock it.`}
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.teal }]} onPress={onClose}>
            <Text style={{ color: '#04211C', fontSize: 14, fontFamily: FONT_UI_BOLD }}>
              {isAr ? 'عرض خطط الاشتراك' : 'View Subscription Plans'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 10 },
  title: { fontSize: 17, fontFamily: FONT_UI_BOLD },
  desc: { fontSize: 13, fontFamily: FONT_UI, lineHeight: 19, marginBottom: 4 },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
