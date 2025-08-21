// 📁 Location: /src/components/ScanResultsModal.tsx
import React from 'react';
import Modal from './Modal';
import TriggerCard from './TriggerCard';
import { ScanMatchResult } from '@data/ScanTypes';

interface ScanResultsModalProps {
  open: boolean;
  onClose: () => void;
  scanName: string;
  results: ScanMatchResult[];
  loading?: boolean;
}

const ScanResultsModal: React.FC<ScanResultsModalProps> = ({
  open,
  onClose,
  scanName,
  results,
  loading = false,
}) => {
  return (
    <Modal title={`Results for ${scanName}`} isOpen={open} onClose={onClose}>
      {loading ? (
        <p className="text-center py-8 text-[#B0B0B0] animate-fadeIn">Loading results...</p>
      ) : results.length === 0 ? (
        <p className="text-center py-8 text-[#B0B0B0] animate-fadeIn">
          No matches found.
        </p>
      ) : (
        <div className="animate-fadeIn space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {results.map((result) => (
            <TriggerCard
              key={`${result.symbol}-${result.scanId}-${result.timestamp}`}
              result={result}
            />
          ))}
        </div>
      )}
    </Modal>
  );
};

export default ScanResultsModal;
