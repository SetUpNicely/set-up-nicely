// 📁 /src/screens/ScanBuilderScreen.tsx

import React, { useEffect, useState } from 'react';
import { useUser } from '@context/UserContext';
import { useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@services/firebase';
import timeframeOptions from '@data/timeframeOptions';
import ScanInputRow from '@components/ScanInputRow';
import Button from '@components/Button';
import { ScanDirection } from '@shared/data/ScanTypes';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ScanBuilderScreen = () => {
  const { firebaseUser, userSettings } = useUser();
  const query = useQuery();
  const editId = query.get('edit');

  const [isEditing, setIsEditing] = useState(false);
  const [scanId, setScanId] = useState('');
  const [scanName, setScanName] = useState('');
  const [timeframe, setTimeframe] = useState<string>(userSettings?.defaultTimeframe ?? '5m');
  const [direction, setDirection] = useState<ScanDirection>('bullish');
  const [logicRows, setLogicRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!firebaseUser || !editId) return;

    const loadScan = async () => {
      const ref = doc(firestore, 'users', firebaseUser.uid, 'customScans', editId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const scan = snap.data();
      setIsEditing(true);
      setScanId(editId);
      setScanName(scan.name ?? '');
      setTimeframe(scan.timeframe ?? '5m');
      setDirection(scan.direction ?? 'bullish');

      const loadedRows: any[] = [];

      Object.entries(scan.logic ?? {}).forEach(([key, val]: any) => {
        if (key.startsWith('trigger_')) {
          loadedRows.push({
            id: Date.now() + Math.random(),
            type: 'trigger',
            field: val,
            operator: '>',
            value: '',
            isIndicatorValue: false,
          });
        } else if (key.startsWith('condition_')) {
          loadedRows.push({
            id: Date.now() + Math.random(),
            type: 'custom',
            field: val.field,
            operator: val.operator,
            value: val.value?.indicator ?? val.value,
            isIndicatorValue: typeof val.value === 'object',
          });
        }
      });

      setLogicRows(loadedRows);
    };

    loadScan();
  }, [firebaseUser, editId]);

  const addRow = () => {
    setLogicRows([
      ...logicRows,
      {
        id: Date.now(),
        type: 'custom',
        field: '',
        operator: '>',
        value: '',
        isIndicatorValue: false,
      },
    ]);
  };

  const updateRow = (id: number, field: string, value: any) => {
    setLogicRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (id: number) => {
    setLogicRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSave = async () => {
    if (!firebaseUser || !scanName || logicRows.length === 0) return;

    setSaving(true);
    setSuccessMessage('');

    const logic: Record<string, any> = {};
    logicRows.forEach((row, index) => {
      if (!row.field) return;

      if (row.type === 'trigger') {
        logic[`trigger_${index}`] = row.field;
      } else {
        logic[`condition_${index}`] = {
          field: row.field,
          operator: row.operator,
          value: row.isIndicatorValue ? { indicator: row.value } : Number(row.value),
        };
      }
    });

    const scan = {
      name: scanName,
      timeframe,
      direction,
      logic,
      updatedAt: Date.now(),
    };

    const id = isEditing ? scanId : `${firebaseUser.uid}_${Date.now()}`;
    const ref = doc(firestore, 'users', firebaseUser.uid, 'customScans', id);

    if (isEditing) {
      await updateDoc(ref, scan);
      setSuccessMessage('✅ Scan updated successfully!');
    } else {
      await setDoc(ref, {
        ...scan,
        id,
        createdAt: Date.now(),
        createdBy: firebaseUser.uid,
      });
      setSuccessMessage('✅ Scan saved successfully!');
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-blue-400">
          {isEditing ? 'Edit Custom Scan' : 'Custom Scan Builder'}
        </h1>

        <input
          className="w-full bg-gray-800 p-2 rounded text-white"
          placeholder="Scan Name"
          value={scanName}
          onChange={(e) => setScanName(e.target.value)}
        />

        <div className="flex gap-4">
          <select
            className="flex-1 bg-gray-800 p-2 rounded"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            {timeframeOptions.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>

          <select
            className="flex-1 bg-gray-800 p-2 rounded"
            value={direction}
            onChange={(e) => setDirection(e.target.value as ScanDirection)}
          >
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
          </select>
        </div>

        <div className="space-y-3">
          {logicRows.map((row) => (
            <ScanInputRow
              key={row.id}
              id={row.id}
              type={row.type}
              field={row.field}
              operator={row.operator}
              value={row.value}
              isIndicatorValue={row.isIndicatorValue}
              onTypeChange={(val) => updateRow(row.id, 'type', val)}
              onFieldChange={(val) => updateRow(row.id, 'field', val)}
              onOperatorChange={(val) => updateRow(row.id, 'operator', val)}
              onValueChange={(val) => updateRow(row.id, 'value', val)}
              onIsIndicatorValueChange={(val) => updateRow(row.id, 'isIndicatorValue', val)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
          <button
            onClick={addRow}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            + Add Condition
          </button>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !scanName || logicRows.length === 0}
        >
          {saving ? 'Saving...' : isEditing ? 'Update Scan' : 'Save Scan'}
        </Button>

        {successMessage && (
          <div className="text-green-400 text-sm mt-2">{successMessage}</div>
        )}
      </div>
    </div>
  );
};

export default ScanBuilderScreen;
