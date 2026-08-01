/**
 * PremiumGate — mirrors app/frontend/src/components/PremiumGate.tsx's
 * tier-level comparison, adapted to RN's modal-based lock pattern (the same
 * one family-budget.tsx already uses via LockedFeatureModal) instead of
 * web's blurred inline overlay.
 */
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PageHeader } from './ui';
import LockedFeatureModal from './LockedFeatureModal';
import { FONT_UI, FONT_UI_BOLD } from '../theme/fonts';

const TIER_LEVELS: Record<string, number> = { free: 0, balanced: 1, family: 2 };

interface PremiumGateProps {
  requiredTier: 'balanced' | 'family';
  screenIcon: string;
  screenTitle: string;
  screenTitleAr: string;
  children: React.ReactNode;
}

export default function PremiumGate({ requiredTier, screenIcon, screenTitle, screenTitleAr, children }: PremiumGateProps) {
  const { tier, loading } = useSubscription();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);
  const isAr = language === 'ar';

  if (loading) return null;

  const userLevel = TIER_LEVELS[tier] ?? 0;
  const requiredLevel = TIER_LEVELS[requiredTier] ?? 1;

  if (userLevel >= requiredLevel) return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon={screenIcon} title={isAr ? screenTitleAr : screenTitle} />
      <LockedFeatureModal
        visible={modalOpen}
        onClose={() => { setModalOpen(false); router.push('/(tabs)/subscription' as any); }}
        requiredPlan={requiredTier}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontFamily: FONT_UI_BOLD, marginBottom: 6 }}>
          {isAr ? 'ميزة مدفوعة' : 'Premium Feature'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: 'center' }}>
          {isAr
            ? `${screenTitleAr} متاحة في خطة الحياة المتوازنة.`
            : `${screenTitle} is available in the Balanced Life plan.`}
        </Text>
      </View>
    </View>
  );
}
