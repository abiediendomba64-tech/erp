import { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  timestamp: string;
  requestedBy: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  oldData?: Record<string, any>;
  newData: Record<string, any>;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
}

interface ApprovalSystemProps {
  requests: ApprovalRequest[];
  onApprove: (id: string, approver: string) => void;
  onReject: (id: string, approver: string, reason: string) => void;
  currentRole: string;
}

export default function ApprovalSystem({ requests, onApprove, onReject, currentRole }: ApprovalSystemProps) {
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  const handleReject = (id: string) => {
    if (rejectReason.trim()) {
      onReject(id, currentRole, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
    }
  };

  if (pendingRequests.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <Check size={48} className="mx-auto text-emerald-500 mb-3" />
        <p className="text-gray-600">Tidak ada permintaan approval</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-800">
              {pendingRequests.length} Permintaan Approval Menunggu
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Perubahan data sensitif memerlukan approval sebelum diterapkan
            </p>
          </div>
        </div>
      </div>

      {pendingRequests.map(request => (
        <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  request.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                  request.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.action}
                </span>
                <span className="text-xs font-mono text-gray-500">{request.table}</span>
                <span className="text-xs font-mono text-gray-400">#{request.recordId}</span>
              </div>
              <p className="text-sm text-gray-600">
                Diminta oleh <strong>{request.requestedBy}</strong> pada{' '}
                {new Date(request.timestamp).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Alasan:</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{request.reason}</p>
          </div>

          {request.oldData && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Perubahan Data:</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-1">
                {Object.keys(request.newData).map(key => {
                  const oldValue = request.oldData?.[key];
                  const newValue = request.newData[key];
                  const changed = oldValue !== newValue;
                  return (
                    <div key={key} className={changed ? 'text-amber-700' : 'text-gray-600'}>
                      <span className="text-gray-500">{key}:</span>{' '}
                      {changed && <span className="line-through text-red-600">{String(oldValue)}</span>}
                      {changed && ' → '}
                      <span className={changed ? 'text-emerald-600 font-medium' : ''}>
                        {String(newValue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => onApprove(request.id, currentRole)}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm"
            >
              <Check size={16} />
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(request.id)}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
            >
              <X size={16} />
              Reject
            </button>
          </div>
        </div>
      ))}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tolak Permintaan</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Alasan penolakan..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReject(showRejectModal)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
              >
                Tolak
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ApprovalRequest };
