/**
 * Receipt Scanner — real implementation, migrated from
 * app/frontend/src/pages/ReceiptScanner.tsx (Phase I, Phase D decision,
 * 2026-08). Calls the real app_11941c8fec_receipt_scan Edge Function
 * (Claude vision-backed) with a camera or gallery photo - the previous
 * scaffold here was an honest "Not implemented yet" placeholder with no
 * backend, replaced with a working scan → review → add-to-finance flow
 * matching web's.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import PremiumGate from '../../src/components/PremiumGate';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { supabase } from '../../src/lib/supabase';
import { functionUrl } from '../../src/lib/config';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

const RECEIPT_SCAN_ENDPOINT = functionUrl('app_11941c8fec_receipt_scan');
const RECEIPTS_KEY = 'amanah_receipts';
const FINANCE_KEY = 'amanah_finance';

interface ParsedItem { name: string; amount: number; }
interface ScannedReceipt {
  id: string;
  date: string;
  storeName: string;
  items: ParsedItem[];
  total: number;
  category: string;
  addedToFinance: boolean;
}

const EXPENSE_CATEGORIES = ['food', 'transport', 'housing', 'healthcare', 'entertainment', 'utilities', 'other'] as const;
const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  food: { en: 'Food', ar: 'الطعام' },
  transport: { en: 'Transport', ar: 'المواصلات' },
  housing: { en: 'Housing', ar: 'السكن' },
  healthcare: { en: 'Healthcare', ar: 'الصحة' },
  entertainment: { en: 'Entertainment', ar: 'الترفيه' },
  utilities: { en: 'Utilities', ar: 'المرافق' },
  other: { en: 'Other', ar: 'أخرى' },
};

export default function ReceiptScannerScreen() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const userId = user?.id ?? null;

  const [scanning, setScanning] = useState(false);
  const [parsedReceipt, setParsedReceipt] = useState<ScannedReceipt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [recentScans, setRecentScans] = useState<ScannedReceipt[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    migrateLegacyKeyIfNeeded(RECEIPTS_KEY, userId).then(() => {
      getUserItem(RECEIPTS_KEY, userId).then((stored) => {
        if (stored) {
          try { setRecentScans(JSON.parse(stored)); } catch { /* ignore */ }
        }
      });
    });
  }, [userId]);

  function saveReceipts(receipts: ScannedReceipt[]) {
    setRecentScans(receipts);
    setUserItem(RECEIPTS_KEY, userId, JSON.stringify(receipts));
  }

  async function scanImage(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64 || !asset.mimeType) {
      toast.error(isAr ? 'تعذّر قراءة الصورة' : "Couldn't read that image");
      return;
    }

    setScanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
        return;
      }

      const response = await fetch(RECEIPT_SCAN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ imageBase64: asset.base64, mimeType: asset.mimeType, language: isAr ? 'ar' : 'en' }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        if (data.error === 'not_a_receipt') {
          toast.error(isAr ? 'لا تبدو هذه الصورة كإيصال' : "This doesn't look like a receipt");
        } else if (data.error === 'unreadable') {
          toast.error(isAr ? 'تعذّرت قراءة الإيصال - جرّب صورة أوضح' : "Couldn't read this receipt clearly - try a clearer photo");
        } else {
          toast.error(isAr ? 'ماسح الإيصالات غير متاح حالياً' : 'Receipt scanner is currently unavailable');
        }
        return;
      }

      setParsedReceipt({
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        storeName: data.storeName,
        items: data.items,
        total: data.total,
        category: 'food',
        addedToFinance: false,
      });
      setSelectedCategory('food');
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء مسح الإيصال' : 'Something went wrong scanning the receipt');
    } finally {
      setScanning(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error(isAr ? 'يلزم إذن الكاميرا لمسح الإيصالات' : 'Camera permission is needed to scan receipts');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) await scanImage(result.assets[0]);
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(isAr ? 'يلزم إذن الوصول للصور لمسح الإيصالات' : 'Photo library permission is needed to scan receipts');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) await scanImage(result.assets[0]);
  }

  function addToFinance() {
    if (!parsedReceipt) return;
    getUserItem(FINANCE_KEY, userId).then((stored) => {
      const transactions = stored ? JSON.parse(stored) : [];
      transactions.push({
        id: Date.now().toString(),
        type: 'expense',
        category: selectedCategory,
        amount: parsedReceipt.total,
        description: `${parsedReceipt.storeName} (${isAr ? 'ماسح' : 'scanned'})`,
        date: new Date().toISOString().split('T')[0],
      });
      setUserItem(FINANCE_KEY, userId, JSON.stringify(transactions));

      const updatedReceipt = { ...parsedReceipt, category: selectedCategory, addedToFinance: true };
      saveReceipts([updatedReceipt, ...recentScans].slice(0, 20));
      setParsedReceipt(null);
      toast.success(isAr ? 'أُضيف إلى المالية' : 'Added to Finance');
    });
  }

  return (
    <PremiumGate requiredTier="balanced" screenIcon="📸" screenTitle="Receipt Scanner" screenTitleAr="ماسح الإيصالات">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <PageHeader icon="📸" title={isAr ? 'ماسح الإيصالات' : 'Receipt Scanner'} />

        <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={[styles.historyBtn, { borderColor: colors.teal + '4D' }]}>
            <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'السجل' : 'History'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!parsedReceipt && !showHistory && (
            <Card style={{ alignItems: 'center', padding: 24, borderStyle: 'dashed' }}>
              {scanning ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.teal} />
                  <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, marginTop: 16 }}>
                    {isAr ? 'جاري المسح...' : 'Scanning...'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, fontFamily: FONT_UI }}>
                    {isAr ? 'تحليل الإيصال بالذكاء الاصطناعي' : 'AI analyzing receipt'}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>📷</Text>
                  <Text style={{ color: colors.text, fontSize: 16, fontFamily: FONT_UI_BOLD, marginBottom: 6, textAlign: 'center' }}>
                    {isAr ? 'مسح إيصال' : 'Scan a Receipt'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: 'center', marginBottom: 16 }}>
                    {isAr ? 'التقط صورة أو ارفع صورة لإيصال لتحليله تلقائياً' : 'Take a photo or upload an image of a receipt for automatic analysis'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={takePhoto} style={[styles.actionBtn, { backgroundColor: colors.teal }]}>
                      <Text style={{ color: '#04211C', fontFamily: FONT_UI_BOLD, fontSize: 13 }}>📷 {isAr ? 'التقاط صورة' : 'Take Photo'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickFromLibrary} style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.teal + '4D' }]}>
                      <Text style={{ color: colors.teal, fontFamily: FONT_UI_BOLD, fontSize: 13 }}>📁 {isAr ? 'رفع ملف' : 'Upload'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Card>
          )}

          {parsedReceipt && !showHistory && (
            <Card>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 15 }}>🧾 {parsedReceipt.storeName}</Text>
                <TouchableOpacity onPress={() => setParsedReceipt(null)}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {parsedReceipt.items.map((item, i) => (
                <View key={i} style={[styles.itemRow, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI }}>{item.name}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{item.amount.toFixed(2)}</Text>
                </View>
              ))}
              <View style={[styles.itemRow, { backgroundColor: colors.teal + '1A', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{isAr ? 'المجموع' : 'Total'}</Text>
                <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{parsedReceipt.total.toFixed(2)}</Text>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI_MEDIUM, marginTop: 16, marginBottom: 8 }}>
                {isAr ? 'التصنيف' : 'Category'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.catChip,
                      { borderColor: selectedCategory === cat ? colors.teal : colors.border, backgroundColor: selectedCategory === cat ? colors.teal + '26' : colors.bg },
                    ]}
                  >
                    <Text style={{ color: selectedCategory === cat ? colors.teal : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>
                      {isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={addToFinance} style={[styles.addBtn, { backgroundColor: colors.teal }]}>
                <Text style={{ color: '#04211C', fontFamily: FONT_UI_BOLD, fontSize: 14 }}>💰 {isAr ? 'إضافة للمالية' : 'Add to Finance'}</Text>
              </TouchableOpacity>
            </Card>
          )}

          {showHistory && (
            <Card>
              <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 15, marginBottom: 12 }}>
                📋 {isAr ? 'السجل الأخير' : 'Recent Scans'}
              </Text>
              {recentScans.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 16, fontFamily: FONT_UI }}>
                  {isAr ? 'لا توجد إيصالات ممسوحة بعد' : 'No scanned receipts yet'}
                </Text>
              ) : (
                recentScans.slice(0, 10).map((scan) => (
                  <View key={scan.id} style={[styles.historyRow, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View>
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{scan.storeName}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>
                        {new Date(scan.date).toLocaleDateString()} • {isAr ? CATEGORY_LABELS[scan.category]?.ar ?? scan.category : CATEGORY_LABELS[scan.category]?.en ?? scan.category}
                      </Text>
                    </View>
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{scan.total.toFixed(2)}</Text>
                      {scan.addedToFinance && (
                        <Text style={{ color: colors.teal, fontSize: 10, fontFamily: FONT_UI }}>✓ {isAr ? 'مضاف' : 'Added'}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity onPress={() => setShowHistory(false)} style={[styles.backBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'العودة للماسح' : 'Back to Scanner'}</Text>
              </TouchableOpacity>
            </Card>
          )}

          {!parsedReceipt && !showHistory && (
            <Card style={{ marginTop: 14 }}>
              <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 14, marginBottom: 10 }}>
                💡 {isAr ? 'نصائح للمسح' : 'Scanning Tips'}
              </Text>
              {[
                isAr ? 'تأكد من إضاءة جيدة عند التصوير' : 'Ensure good lighting when taking photos',
                isAr ? 'ضع الإيصال على سطح مستوٍ' : 'Place receipt on a flat surface',
                isAr ? 'تأكد أن النص واضح وغير مطوي' : 'Make sure text is clear and not folded',
                isAr ? 'التقط الإيصال كاملاً في إطار واحد' : 'Capture the full receipt in one frame',
              ].map((tip, i) => (
                <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, paddingVertical: 4 }}>
                  <Text style={{ color: colors.teal }}>•</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, flex: 1 }}>{tip}</Text>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  historyBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  actionBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  itemRow: { justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginBottom: 6 },
  catChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  addBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  historyRow: { justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  backBtn: { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
});
