/**
 * Family Dashboard — real implementation, migrated from
 * app/frontend/src/pages/FamilySharedDashboard.tsx (Phase D decision
 * follow-up, 2026-08). Membership (who's in the family, role, age group) is
 * REAL - backed by app_11941c8fec_families/family_members via the
 * app_11941c8fec_family_invite Edge Function, matching web's implementation.
 * Shared Goals stay device-local only (out of scope for this pass, carries
 * its own disclaimer). The previous version of this screen was an honest
 * "Not implemented yet" placeholder, unreachable from nav.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PageHeader, Card } from '../../src/components/ui';
import LockedFeatureModal from '../../src/components/LockedFeatureModal';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { supabase } from '../../src/lib/supabase';
import { functionUrl } from '../../src/lib/config';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

const FAMILIES_TABLE = 'app_11941c8fec_families';
const MEMBERS_TABLE = 'app_11941c8fec_family_members';
const FAMILY_INVITE_ENDPOINT = functionUrl('app_11941c8fec_family_invite');
const SHARED_GOALS_KEY = 'amanah_family_shared_goals';

type AgeGroup = 'adult' | 'minor';

interface FamilyMember {
  id: string;
  user_id: string | null;
  display_name: string;
  member_role: 'owner' | 'member';
  age_group: AgeGroup;
  household_role: string | null;
}

interface FamilyRecord {
  id: string;
  name: string;
  join_code: string;
  owner_user_id: string;
}

interface SharedGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  category: string;
}

export default function FamilyDashboardScreen() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { tier, isTrialActive, loading: subLoading } = useSubscription();
  const router = useRouter();
  const isAr = language === 'ar';
  const userId = user?.id ?? null;
  const hasAccess = tier === 'family' || isTrialActive;
  const [lockedModalOpen, setLockedModalOpen] = useState(true);

  const [familyLoading, setFamilyLoading] = useState(true);
  const [family, setFamily] = useState<FamilyRecord | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [myMembership, setMyMembership] = useState<FamilyMember | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinAgeGroup, setJoinAgeGroup] = useState<AgeGroup>('adult');
  const [joinHouseholdRole, setJoinHouseholdRole] = useState('');
  const [joining, setJoining] = useState(false);

  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const loadFamily = useCallback(async () => {
    if (!user) return;
    setFamilyLoading(true);
    try {
      const { data: myRows } = await supabase
        .from(MEMBERS_TABLE)
        .select('id, user_id, display_name, member_role, age_group, household_role, family_id')
        .eq('user_id', user.id);

      if (!myRows || myRows.length === 0) {
        setFamily(null);
        setMembers([]);
        setMyMembership(null);
        return;
      }

      const mine = myRows[0] as FamilyMember & { family_id: string };
      setMyMembership(mine);

      const [{ data: familyRow }, { data: roster }] = await Promise.all([
        supabase.from(FAMILIES_TABLE).select('id, name, join_code, owner_user_id').eq('id', mine.family_id).maybeSingle(),
        supabase.from(MEMBERS_TABLE).select('id, user_id, display_name, member_role, age_group, household_role').eq('family_id', mine.family_id),
      ]);

      setFamily(familyRow ?? null);
      setMembers(roster ?? []);
    } finally {
      setFamilyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFamily();
    migrateLegacyKeyIfNeeded(SHARED_GOALS_KEY, userId).then(() => {
      getUserItem(SHARED_GOALS_KEY, userId).then((stored) => {
        if (stored) {
          try { setSharedGoals(JSON.parse(stored)); } catch { /* ignore */ }
        }
      });
    });
  }, [loadFamily, userId]);

  const saveGoals = (updated: SharedGoal[]) => {
    setSharedGoals(updated);
    setUserItem(SHARED_GOALS_KEY, userId, JSON.stringify(updated));
  };

  async function handleSendInvite() {
    if (!inviteEmail.trim() || sendingInvite) return;
    setSendingInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first'); return; }

      const response = await fetch(FAMILY_INVITE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'send', email: inviteEmail.trim(), language: isAr ? 'ar' : 'en' }),
      });
      const data = await response.json();

      if (!response.ok || data.error === 'family_plan_required') {
        toast.error(isAr ? 'دعوة أفراد العائلة متاحة في خطة أمانة العائلة' : 'Inviting family members requires the Family Plan');
        return;
      }
      if (data.error) {
        toast.error(isAr ? 'تعذّر إرسال الدعوة' : 'Could not send the invite');
        return;
      }

      toast.success(
        data.emailSent
          ? (isAr ? 'تم إرسال الدعوة' : 'Invite sent')
          : (isAr ? `شارك هذا الرمز: ${data.joinCode}` : `Share this code: ${data.joinCode}`)
      );
      setInviteEmail('');
      setShowInvite(false);
      loadFamily();
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء إرسال الدعوة' : 'Something went wrong sending the invite');
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim() || !joinDisplayName.trim() || joining) return;
    setJoining(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first'); return; }

      const response = await fetch(FAMILY_INVITE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'accept',
          joinCode: joinCode.trim(),
          displayName: joinDisplayName.trim(),
          ageGroup: joinAgeGroup,
          householdRole: joinHouseholdRole.trim() || undefined,
          language: isAr ? 'ar' : 'en',
        }),
      });
      const data = await response.json();

      if (data.error === 'invalid_code') {
        toast.error(isAr ? 'رمز الانضمام غير صحيح' : 'Invalid join code');
        return;
      }
      if (data.error === 'already_member') {
        toast.error(isAr ? 'أنت عضو بالفعل في هذه العائلة' : "You're already a member of this family");
        loadFamily();
        return;
      }
      if (!response.ok || data.error) {
        toast.error(isAr ? 'تعذّر الانضمام إلى العائلة' : 'Could not join the family');
        return;
      }

      toast.success(isAr ? 'تم الانضمام إلى العائلة' : 'Joined the family');
      setShowJoin(false);
      setJoinCode('');
      setJoinDisplayName('');
      setJoinHouseholdRole('');
      loadFamily();
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء الانضمام' : 'Something went wrong joining');
    } finally {
      setJoining(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    const { error } = await supabase.from(MEMBERS_TABLE).delete().eq('id', memberId);
    if (error) {
      toast.error(isAr ? 'تعذّرت الإزالة' : 'Could not remove member');
      return;
    }
    loadFamily();
  }

  function handleAddGoal() {
    if (!goalTitle.trim() || !goalTarget) return;
    const newGoal: SharedGoal = { id: Date.now().toString(), title: goalTitle.trim(), target: Number(goalTarget), current: 0, category: 'savings' };
    saveGoals([...sharedGoals, newGoal]);
    setGoalTitle('');
    setGoalTarget('');
    setShowAddGoal(false);
  }

  const isOwner = myMembership?.member_role === 'owner';
  const roleLabel = (m: FamilyMember) => {
    if (m.household_role) return m.household_role;
    return m.member_role === 'owner' ? (isAr ? 'المسؤول' : 'Admin') : (isAr ? 'عضو' : 'Member');
  };
  const ageGroupLabel = (g: AgeGroup) => (g === 'minor' ? (isAr ? 'قاصر' : 'Minor') : (isAr ? 'بالغ' : 'Adult'));

  const accountabilityScore = useMemo(() => {
    const goalsProgress = sharedGoals.length > 0
      ? sharedGoals.reduce((sum, g) => sum + (g.target > 0 ? g.current / g.target : 0), 0) / sharedGoals.length
      : 0;
    return Math.round(goalsProgress * 50);
  }, [sharedGoals]);

  const inputStyle = { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: FONT_UI };

  if (subLoading) return null;

  if (!hasAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <PageHeader icon="👨‍👩‍👧" title={isAr ? 'لوحة العائلة' : 'Family Dashboard'} />
        <LockedFeatureModal
          visible={lockedModalOpen}
          onClose={() => { setLockedModalOpen(false); router.push('/(tabs)/subscription' as any); }}
          requiredPlan="family"
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontFamily: FONT_UI_BOLD, marginBottom: 6 }}>
            {isAr ? 'ميزة مدفوعة' : 'Premium Feature'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: 'center' }}>
            {isAr ? 'لوحة العائلة متاحة في خطة أمانة العائلة.' : 'Family Dashboard is available in the Family Plan.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="👨‍👩‍👧" title={isAr ? 'لوحة العائلة' : 'Family Dashboard'} />

      {!familyLoading && family && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={() => setShowInvite(true)} style={[styles.pillBtn, { backgroundColor: colors.teal }]}>
            <Text style={{ color: '#04211C', fontSize: 12, fontFamily: FONT_UI_BOLD }}>{isAr ? '+ دعوة' : '+ Invite'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {familyLoading && (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24, fontFamily: FONT_UI }}>
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </Text>
        )}

        {!familyLoading && !family && (
          <Card>
            <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 16, marginBottom: 4 }}>
              {isAr ? 'ابدأ عائلتك' : 'Start Your Family'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, marginBottom: 10 }}>
              {isAr ? 'ادعُ فرداً من العائلة بالبريد الإلكتروني لإنشاء عائلتك.' : 'Invite a family member by email to create your family.'}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginBottom: 16 }}>
              <TextInput
                placeholder={isAr ? 'البريد الإلكتروني' : 'Email'}
                placeholderTextColor={colors.textSecondary}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[inputStyle, { flex: 1 }]}
              />
              <TouchableOpacity onPress={handleSendInvite} disabled={sendingInvite} style={[styles.pillBtn, { backgroundColor: colors.teal }]}>
                <Text style={{ color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD }}>{isAr ? 'دعوة' : 'Invite'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
              <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 13, marginBottom: 8 }}>
                {isAr ? 'لديك رمز دعوة؟' : 'Have an invite code?'}
              </Text>
              {!showJoin ? (
                <TouchableOpacity onPress={() => setShowJoin(true)} style={[styles.outlineBtn, { borderColor: colors.teal + '4D' }]}>
                  <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'الانضمام إلى عائلة' : 'Join a Family'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 8 }}>
                  <TextInput placeholder={isAr ? 'رمز الانضمام' : 'Join code'} placeholderTextColor={colors.textSecondary} value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" style={inputStyle} />
                  <TextInput placeholder={isAr ? 'اسمك' : 'Your name'} placeholderTextColor={colors.textSecondary} value={joinDisplayName} onChangeText={setJoinDisplayName} style={inputStyle} />
                  <TextInput placeholder={isAr ? 'صلة القرابة (اختياري)' : 'Relationship (optional)'} placeholderTextColor={colors.textSecondary} value={joinHouseholdRole} onChangeText={setJoinHouseholdRole} style={inputStyle} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setJoinAgeGroup('adult')}
                      style={[styles.toggleBtn, { borderColor: joinAgeGroup === 'adult' ? colors.teal : colors.border, backgroundColor: joinAgeGroup === 'adult' ? colors.teal + '26' : 'transparent' }]}
                    >
                      <Text style={{ color: joinAgeGroup === 'adult' ? colors.teal : colors.textSecondary, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'بالغ' : 'Adult'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setJoinAgeGroup('minor')}
                      style={[styles.toggleBtn, { borderColor: joinAgeGroup === 'minor' ? colors.teal : colors.border, backgroundColor: joinAgeGroup === 'minor' ? colors.teal + '26' : 'transparent' }]}
                    >
                      <Text style={{ color: joinAgeGroup === 'minor' ? colors.teal : colors.textSecondary, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'قاصر' : 'Minor'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={handleJoin} disabled={joining} style={[styles.pillBtn, { backgroundColor: colors.teal }]}>
                      <Text style={{ color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD }}>{isAr ? 'انضمام' : 'Join'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowJoin(false)} style={[styles.outlineBtn, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </Card>
        )}

        {!familyLoading && family && (
          <>
            {showInvite && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 14, marginBottom: 4 }}>{isAr ? 'دعوة فرد من العائلة' : 'Invite a Family Member'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginBottom: 10 }}>
                  {isAr ? 'سيتلقون بريداً إلكترونياً برمز انضمام حقيقي.' : "They'll receive a real email with a join code."}
                </Text>
                <TextInput placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} placeholderTextColor={colors.textSecondary} value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" keyboardType="email-address" style={[inputStyle, { marginBottom: 10 }]} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={handleSendInvite} disabled={sendingInvite} style={[styles.pillBtn, { backgroundColor: colors.teal }]}>
                    <Text style={{ color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD }}>{isAr ? 'إرسال' : 'Send'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowInvite(false)} style={[styles.outlineBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            <Card style={{ marginBottom: 12, backgroundColor: colors.teal + '1A', borderColor: colors.teal + '4D' }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{isAr ? 'نقاط مسؤوليتك' : 'Your Accountability Score'}</Text>
                  <Text style={{ color: colors.teal, fontSize: 28, fontFamily: FONT_UI_BOLD, marginTop: 2 }}>{accountabilityScore}%</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI, marginTop: 2 }}>{isAr ? 'استناداً إلى الأهداف المشتركة' : 'Based on shared goals'}</Text>
                </View>
                <Text style={{ fontSize: 32 }}>🏆</Text>
              </View>
            </Card>

            <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 15, marginBottom: 8 }}>
              {isAr ? 'أفراد العائلة' : 'Family Members'} ({members.length})
            </Text>
            {members.map((member) => (
              <Card key={member.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.teal + '26', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>👤</Text>
                    </View>
                    <View>
                      <Text style={{ color: colors.text, fontFamily: FONT_UI_MEDIUM, fontSize: 13 }}>
                        {member.user_id === userId ? (isAr ? 'أنا' : 'You') : member.display_name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>
                        {roleLabel(member)} · {ageGroupLabel(member.age_group)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: colors.teal + '26', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ color: colors.teal, fontSize: 10, fontFamily: FONT_UI_MEDIUM }}>
                        {member.member_role === 'owner' ? (isAr ? 'مسؤول' : 'Owner') : (isAr ? 'عضو' : 'Member')}
                      </Text>
                    </View>
                    {(isOwner || member.user_id === userId) && member.member_role !== 'owner' && (
                      <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                        <Text style={{ color: '#EF4444', fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إزالة' : 'Remove'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}

            {members.length > 1 && (
              <Card style={{ marginTop: 4, marginBottom: 16, borderStyle: 'dashed' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: FONT_UI_MEDIUM }}>
                  🕌 {isAr ? 'غير متاح بعد' : 'Not yet available'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 6, lineHeight: 16, fontFamily: FONT_UI }}>
                  {isAr ? 'لا تتم مزامنة بيانات الصلاة بين أفراد العائلة بعد.' : "Prayer data isn't synced between family members yet."}
                </Text>
              </Card>
            )}
          </>
        )}

        {/* Shared Goals - device-local only, not actually shared yet even
            though membership above is real. See file header comment. */}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 15 }}>🎯 {isAr ? 'الأهداف المشتركة' : 'Shared Goals'}</Text>
          <TouchableOpacity onPress={() => setShowAddGoal(true)} style={[styles.outlineBtn, { borderColor: colors.teal + '4D' }]}>
            <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{isAr ? '+ هدف' : '+ Goal'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginTop: 4, marginBottom: 10 }}>
          {isAr ? 'تُحفظ هذه الأهداف على هذا الجهاز فقط ولا تُشارك مع أفراد العائلة بعد.' : "These goals are saved on this device only and aren't actually shared with family members yet."}
        </Text>

        {showAddGoal && (
          <Card style={{ marginBottom: 10 }}>
            <TextInput placeholder={isAr ? 'عنوان الهدف' : 'Goal title'} placeholderTextColor={colors.textSecondary} value={goalTitle} onChangeText={setGoalTitle} style={[inputStyle, { marginBottom: 8 }]} />
            <TextInput placeholder={isAr ? 'المبلغ المستهدف' : 'Target amount'} placeholderTextColor={colors.textSecondary} value={goalTarget} onChangeText={setGoalTarget} keyboardType="numeric" style={[inputStyle, { marginBottom: 10 }]} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={handleAddGoal} style={[styles.pillBtn, { backgroundColor: colors.teal }]}>
                <Text style={{ color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD }}>{isAr ? 'إضافة' : 'Add'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddGoal(false)} style={[styles.outlineBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {sharedGoals.map((goal) => (
          <Card key={goal.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{goal.title}</Text>
              <Text style={{ color: colors.teal, fontSize: 10, fontFamily: FONT_UI_MEDIUM }}>{goal.category}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0}%`, backgroundColor: colors.teal }} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginTop: 4 }}>{goal.current} / {goal.target}</Text>
          </Card>
        ))}
        {sharedGoals.length === 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 16, fontFamily: FONT_UI }}>
            {isAr ? 'لا توجد أهداف مشتركة بعد' : 'No shared goals yet'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  pillBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  outlineBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  toggleBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
});
