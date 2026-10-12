import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const OPERATORS = {
  '+': (left, right) => left + right,
  '-': (left, right) => left - right,
  'x': (left, right) => left * right,
  '/': (left, right) => (right === 0 ? null : left / right),
};

const OPERATOR_LABELS = {
  '+': '+',
  '-': '-',
  'x': 'x',
  '/': '/',
};

const formatAmount = (value) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const rounded = Math.round((value + Number.EPSILON) * 100000000) / 100000000;
  return String(rounded)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace('.', ',');
};

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const parseDisplay = (value) => {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const describeVat = ({ base, vat, total, rate, title }) =>
  `${title} ${rate}%: база ${formatMoney(base)}, НДС ${formatMoney(vat)}, итог ${formatMoney(total)}`;

export default function App() {
  const [display, setDisplay] = useState('0');
  const [storedValue, setStoredValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [vatRate, setVatRate] = useState(20);
  const [history, setHistory] = useState([]);
  const [vatResult, setVatResult] = useState({
    title: 'НДС не рассчитан',
    base: 0,
    vat: 0,
    total: 0,
  });

  const expression = useMemo(() => {
    if (storedValue === null || !operator) {
      return 'Введите сумму или расчет';
    }

    return `${formatAmount(storedValue)} ${OPERATOR_LABELS[operator]}`;
  }, [operator, storedValue]);

  const addHistory = (line) => {
    setHistory((current) => [line, ...current].slice(0, 6));
  };

  const inputDigit = (digit) => {
    if (waitingForNext) {
      setDisplay(digit);
      setWaitingForNext(false);
      return;
    }

    setDisplay((current) => (current === '0' ? digit : `${current}${digit}`));
  };

  const inputDecimal = () => {
    if (waitingForNext) {
      setDisplay('0,');
      setWaitingForNext(false);
      return;
    }

    setDisplay((current) => (current.includes(',') ? current : `${current},`));
  };

  const clearAll = () => {
    setDisplay('0');
    setStoredValue(null);
    setOperator(null);
    setWaitingForNext(false);
    setVatResult({
      title: 'НДС не рассчитан',
      base: 0,
      vat: 0,
      total: 0,
    });
  };

  const backspace = () => {
    if (waitingForNext) {
      setDisplay('0');
      setWaitingForNext(false);
      return;
    }

    setDisplay((current) => {
      if (current.length <= 1 || (current.length === 2 && current.startsWith('-'))) {
        return '0';
      }

      return current.slice(0, -1);
    });
  };

  const toggleSign = () => {
    setDisplay((current) => {
      if (current === '0') {
        return current;
      }

      return current.startsWith('-') ? current.slice(1) : `-${current}`;
    });
  };

  const chooseOperator = (nextOperator) => {
    const currentValue = parseDisplay(display);

    if (storedValue !== null && operator && !waitingForNext) {
      const result = OPERATORS[operator](storedValue, currentValue);

      if (result === null) {
        setDisplay('0');
        setStoredValue(null);
        setOperator(null);
        addHistory('Деление на ноль отменено');
        return;
      }

      setStoredValue(result);
      setDisplay(formatAmount(result));
      addHistory(
        `${formatAmount(storedValue)} ${OPERATOR_LABELS[operator]} ${formatAmount(currentValue)} = ${formatAmount(result)}`
      );
    } else {
      setStoredValue(currentValue);
    }

    setOperator(nextOperator);
    setWaitingForNext(true);
  };

  const calculate = () => {
    if (storedValue === null || !operator) {
      return;
    }

    const currentValue = parseDisplay(display);
    const result = OPERATORS[operator](storedValue, currentValue);

    if (result === null) {
      setDisplay('0');
      setStoredValue(null);
      setOperator(null);
      addHistory('Деление на ноль отменено');
      return;
    }

    addHistory(
      `${formatAmount(storedValue)} ${OPERATOR_LABELS[operator]} ${formatAmount(currentValue)} = ${formatAmount(result)}`
    );
    setDisplay(formatAmount(result));
    setStoredValue(null);
    setOperator(null);
    setWaitingForNext(true);
  };

  const calculateVat = (type) => {
    const amount = parseDisplay(display);
    const rate = vatRate / 100;
    const result =
      type === 'add'
        ? {
            title: 'Начислить НДС',
            base: amount,
            vat: amount * rate,
            total: amount * (1 + rate),
          }
        : {
            title: 'Выделить НДС',
            base: amount / (1 + rate),
            vat: amount - amount / (1 + rate),
            total: amount,
          };

    setVatResult(result);
    setDisplay(formatAmount(result.total));
    setStoredValue(null);
    setOperator(null);
    setWaitingForNext(true);
    addHistory(describeVat({ ...result, rate: vatRate }));
  };

  const clearHistory = () => setHistory([]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Оффлайн-утилита</Text>
            <Text style={styles.title}>НДС Калькулятор РФ</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>RU</Text>
          </View>
        </View>

        <View style={styles.displayPanel}>
          <Text style={styles.expression}>{expression}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.display}>
            {display}
          </Text>
        </View>

        <View style={styles.vatPanel}>
          <View style={styles.rateRow}>
            <Text style={styles.sectionTitle}>НДС</Text>
            <View style={styles.segment}>
              {[20, 10].map((rate) => (
                <Pressable
                  key={rate}
                  onPress={() => setVatRate(rate)}
                  style={[styles.segmentButton, vatRate === rate && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentText, vatRate === rate && styles.segmentTextActive]}>
                    {rate}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={() => calculateVat('add')} style={[styles.actionButton, styles.actionButtonPrimary]}>
              <Text style={styles.actionButtonText}>Начислить</Text>
            </Pressable>
            <Pressable onPress={() => calculateVat('extract')} style={styles.actionButton}>
              <Text style={styles.actionButtonTextMuted}>Выделить</Text>
            </Pressable>
          </View>

          <View style={styles.resultGrid}>
            <View style={styles.resultCell}>
              <Text style={styles.resultLabel}>База</Text>
              <Text style={styles.resultValue}>{formatMoney(vatResult.base)}</Text>
            </View>
            <View style={styles.resultCell}>
              <Text style={styles.resultLabel}>НДС</Text>
              <Text style={styles.resultValue}>{formatMoney(vatResult.vat)}</Text>
            </View>
            <View style={styles.resultCellStrong}>
              <Text style={styles.resultLabelStrong}>Итого</Text>
              <Text style={styles.resultValueStrong}>{formatMoney(vatResult.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.keypad}>
          <Key label="C" tone="danger" onPress={clearAll} />
          <Key label="±" tone="utility" onPress={toggleSign} />
          <Key label="⌫" tone="utility" onPress={backspace} />
          <Key label="/" tone="operator" onPress={() => chooseOperator('/')} />
          <Key label="7" onPress={() => inputDigit('7')} />
          <Key label="8" onPress={() => inputDigit('8')} />
          <Key label="9" onPress={() => inputDigit('9')} />
          <Key label="x" tone="operator" onPress={() => chooseOperator('x')} />
          <Key label="4" onPress={() => inputDigit('4')} />
          <Key label="5" onPress={() => inputDigit('5')} />
          <Key label="6" onPress={() => inputDigit('6')} />
          <Key label="-" tone="operator" onPress={() => chooseOperator('-')} />
          <Key label="1" onPress={() => inputDigit('1')} />
          <Key label="2" onPress={() => inputDigit('2')} />
          <Key label="3" onPress={() => inputDigit('3')} />
          <Key label="+" tone="operator" onPress={() => chooseOperator('+')} />
          <Key label="0" wide onPress={() => inputDigit('0')} />
          <Key label="," onPress={inputDecimal} />
          <Key label="=" tone="equals" onPress={calculate} />
        </View>

        <View style={styles.historyPanel}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>История</Text>
            <Pressable onPress={clearHistory} style={styles.clearHistoryButton}>
              <Text style={styles.clearHistoryText}>Очистить</Text>
            </Pressable>
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>Расчеты появятся здесь до закрытия приложения.</Text>
          ) : (
            history.map((item, index) => (
              <Text key={`${item}-${index}`} numberOfLines={2} style={styles.historyItem}>
                {item}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Key({ label, onPress, tone = 'default', wide = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        wide && styles.keyWide,
        tone === 'operator' && styles.keyOperator,
        tone === 'equals' && styles.keyEquals,
        tone === 'danger' && styles.keyDanger,
        tone === 'utility' && styles.keyUtility,
        pressed && styles.keyPressed,
      ]}
    >
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[
          styles.keyText,
          tone === 'operator' && styles.keyTextOperator,
          tone === 'equals' && styles.keyTextEquals,
          tone === 'danger' && styles.keyTextDanger,
          tone === 'utility' && styles.keyTextUtility,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    padding: 18,
    paddingBottom: 34,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  kicker: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  badgeText: {
    color: '#075985',
    fontSize: 16,
    fontWeight: '800',
  },
  displayPanel: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 18,
  },
  expression: {
    color: '#A7F3D0',
    fontSize: 14,
    fontWeight: '600',
    minHeight: 22,
  },
  display: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 58,
    textAlign: 'right',
  },
  vatPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  rateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  segment: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 3,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    minWidth: 66,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  segmentButtonActive: {
    backgroundColor: '#0F172A',
  },
  segmentText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#16A34A',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionButtonTextMuted: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  resultGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  resultCell: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flex: 1,
    minHeight: 72,
    padding: 10,
  },
  resultCellStrong: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 72,
    padding: 10,
  },
  resultLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  resultLabelStrong: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '800',
  },
  resultValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  resultValueStrong: {
    color: '#9A3412',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  key: {
    alignItems: 'center',
    aspectRatio: 1.2,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '22%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 64,
  },
  keyWide: {
    aspectRatio: 2.55,
    flexBasis: '47%',
  },
  keyOperator: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  keyEquals: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  keyDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  keyUtility: {
    backgroundColor: '#F1F5F9',
  },
  keyPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  keyText: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  keyTextOperator: {
    color: '#1D4ED8',
  },
  keyTextEquals: {
    color: '#FFFFFF',
  },
  keyTextDanger: {
    color: '#B91C1C',
  },
  keyTextUtility: {
    color: '#334155',
  },
  historyPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clearHistoryButton: {
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearHistoryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyHistory: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  historyItem: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    paddingVertical: 9,
  },
});
