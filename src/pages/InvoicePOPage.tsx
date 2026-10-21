import { useState } from 'react';
import { useAccounting } from '../store/accounting';
import { formatRupiah, generateId } from '../data/accounting';
import { generateJurnalPenjualanKredit, generateJurnalPembelianKredit } from '../utils/accounting';
import { Invoice, InvoiceItem, PurchaseOrder, POItem } from '../types/accounting';
import { FileText, Plus, Eye, CheckCircle } from 'lucide-react';

export default function InvoicePOPage() {
  const { state, dispatch } = useAccounting();
  const [activeTab, setActiveTab] = useState<'invoice' | 'po'>('invoice');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | PurchaseOrder | null>(null);

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    pelanggan: '',
    tanggal: new Date().toISOString().split('T')[0],
    jatuh_tempo: '',
    items: [{ deskripsi: '', qty: 1, harga: 0, subtotal: 0 }] as InvoiceItem[],
    diskon: 0,
    ppn: 0,
  });

  // PO form
  const [poForm, setPOForm] = useState({
    supplier: '',
    tanggal: new Date().toISOString().split('T')[0],
    items: [{ deskripsi: '', qty: 1, harga: 0, subtotal: 0 }] as POItem[],
    ppn: 0,
  });

  const handleAddInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { deskripsi: '', qty: 1, harga: 0, subtotal: 0 }]
    });
  };

  const handleUpdateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'harga') {
      newItems[index].subtotal = newItems[index].qty * newItems[index].harga;
    }
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const handleRemoveInvoiceItem = (index: number) => {
    setInvoiceForm({
      ...invoiceForm,
      items: invoiceForm.items.filter((_, i) => i !== index)
    });
  };

  const handleAddPOItem = () => {
    setPOForm({
      ...poForm,
      items: [...poForm.items, { deskripsi: '', qty: 1, harga: 0, subtotal: 0 }]
    });
  };

  const handleUpdatePOItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...poForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'harga') {
      newItems[index].subtotal = newItems[index].qty * newItems[index].harga;
    }
    setPOForm({ ...poForm, items: newItems });
  };

  const handleRemovePOItem = (index: number) => {
    setPOForm({
      ...poForm,
      items: poForm.items.filter((_, i) => i !== index)
    });
  };

  const handleSaveInvoice = () => {
    const subtotal = invoiceForm.items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal - invoiceForm.diskon + invoiceForm.ppn;

    const newInvoice: Invoice = {
      id: generateId('INV', state.invoice),
      no_invoice: `INV-${new Date().getFullYear()}-${String(state.invoice.length + 1).padStart(3, '0')}`,
      tanggal: invoiceForm.tanggal,
      jatuh_tempo: invoiceForm.jatuh_tempo,
      pelanggan: invoiceForm.pelanggan,
      items: invoiceForm.items,
      subtotal,
      diskon: invoiceForm.diskon,
      ppn: invoiceForm.ppn,
      total,
      status: 'Sent',
    };

    dispatch({ type: 'ADD_INVOICE', payload: newInvoice });

    // Auto-generate jurnal
    const jurnalData = generateJurnalPenjualanKredit(
      invoiceForm.tanggal,
      `Penjualan kredit - ${invoiceForm.pelanggan}`,
      subtotal,
      invoiceForm.ppn
    );

    const newJurnal = {
      id: generateId('J', state.jurnal),
      no_jurnal: `JU-${new Date().getFullYear()}-${String(state.jurnal.length + 1).padStart(3, '0')}`,
      status: 'Posted' as const,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      referensi: newInvoice.no_invoice,
      ...jurnalData,
    };

    dispatch({ type: 'ADD_JURNAL', payload: newJurnal });

    alert('Invoice berhasil dibuat! Jurnal otomatis tergenerate.');
    setShowForm(false);
    setInvoiceForm({
      pelanggan: '',
      tanggal: new Date().toISOString().split('T')[0],
      jatuh_tempo: '',
      items: [{ deskripsi: '', qty: 1, harga: 0, subtotal: 0 }],
      diskon: 0,
      ppn: 0,
    });
  };

  const handleSavePO = () => {
    const subtotal = poForm.items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + poForm.ppn;

    const newPO: PurchaseOrder = {
      id: generateId('PO', state.purchaseOrder),
      no_po: `PO-${new Date().getFullYear()}-${String(state.purchaseOrder.length + 1).padStart(3, '0')}`,
      tanggal: poForm.tanggal,
      supplier: poForm.supplier,
      items: poForm.items,
      subtotal,
      ppn: poForm.ppn,
      total,
      status: 'Sent',
    };

    dispatch({ type: 'ADD_PO', payload: newPO });

    // Auto-generate jurnal
    const jurnalData = generateJurnalPembelianKredit(
      poForm.tanggal,
      `Pembelian kredit - ${poForm.supplier}`,
      subtotal,
      poForm.ppn
    );

    const newJurnal = {
      id: generateId('J', state.jurnal),
      no_jurnal: `JU-${new Date().getFullYear()}-${String(state.jurnal.length + 1).padStart(3, '0')}`,
      status: 'Posted' as const,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      referensi: newPO.no_po,
      ...jurnalData,
    };

    dispatch({ type: 'ADD_JURNAL', payload: newJurnal });

    alert('Purchase Order berhasil dibuat! Jurnal otomatis tergenerate.');
    setShowForm(false);
    setPOForm({
      supplier: '',
      tanggal: new Date().toISOString().split('T')[0],
      items: [{ deskripsi: '', qty: 1, harga: 0, subtotal: 0 }],
      ppn: 0,
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Paid': return 'bg-emerald-100 text-emerald-800';
      case 'Received': return 'bg-emerald-100 text-emerald-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-indigo-500" />
            Invoice & Purchase Order
          </h1>
          <p className="text-gray-500 mt-1">Kelola invoice pelanggan dan purchase order supplier</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus size={18} />
          {activeTab === 'invoice' ? 'Buat Invoice' : 'Buat PO'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'invoice'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoice ({state.invoice.length})
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'po'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Purchase Order ({state.purchaseOrder.length})
          </button>
        </div>

        {/* Invoice List */}
        {activeTab === 'invoice' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">No Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pelanggan</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.invoice.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{inv.no_invoice}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.tanggal}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.pelanggan}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(inv.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setShowDetail(inv)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PO List */}
        {activeTab === 'po' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">No PO</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.purchaseOrder.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{po.no_po}</td>
                    <td className="px-4 py-3 text-gray-600">{po.tanggal}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{po.supplier}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(po.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setShowDetail(po)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'invoice' ? 'Buat Invoice Baru' : 'Buat Purchase Order'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {activeTab === 'invoice' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Pelanggan *</label>
                      <input
                        type="text"
                        value={invoiceForm.pelanggan}
                        onChange={e => setInvoiceForm({ ...invoiceForm, pelanggan: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tanggal *</label>
                      <input
                        type="date"
                        value={invoiceForm.tanggal}
                        onChange={e => setInvoiceForm({ ...invoiceForm, tanggal: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Jatuh Tempo *</label>
                      <input
                        type="date"
                        value={invoiceForm.jatuh_tempo}
                        onChange={e => setInvoiceForm({ ...invoiceForm, jatuh_tempo: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Items *</label>
                    {invoiceForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Deskripsi"
                          value={item.deskripsi}
                          onChange={e => handleUpdateInvoiceItem(index, 'deskripsi', e.target.value)}
                          className="col-span-5 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.qty || ''}
                          onChange={e => handleUpdateInvoiceItem(index, 'qty', Number(e.target.value))}
                          className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Harga"
                          value={item.harga || ''}
                          onChange={e => handleUpdateInvoiceItem(index, 'harga', Number(e.target.value))}
                          className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <div className="col-span-1 text-sm text-gray-600 flex items-center">
                          {formatRupiah(item.subtotal)}
                        </div>
                        <button
                          onClick={() => handleRemoveInvoiceItem(index)}
                          className="col-span-1 text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddInvoiceItem}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      + Tambah Item
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Diskon (Rp)</label>
                      <input
                        type="number"
                        value={invoiceForm.diskon || ''}
                        onChange={e => setInvoiceForm({ ...invoiceForm, diskon: Number(e.target.value) })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">PPN (Rp)</label>
                      <input
                        type="number"
                        value={invoiceForm.ppn || ''}
                        onChange={e => setInvoiceForm({ ...invoiceForm, ppn: Number(e.target.value) })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-800">
                      <strong>Total:</strong> {formatRupiah(
                        invoiceForm.items.reduce((sum, item) => sum + item.subtotal, 0) - invoiceForm.diskon + invoiceForm.ppn
                      )}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">
                      Jurnal akan otomatis tergenerate saat invoice disimpan
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Supplier *</label>
                      <input
                        type="text"
                        value={poForm.supplier}
                        onChange={e => setPOForm({ ...poForm, supplier: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tanggal *</label>
                      <input
                        type="date"
                        value={poForm.tanggal}
                        onChange={e => setPOForm({ ...poForm, tanggal: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Items *</label>
                    {poForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Deskripsi"
                          value={item.deskripsi}
                          onChange={e => handleUpdatePOItem(index, 'deskripsi', e.target.value)}
                          className="col-span-5 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.qty || ''}
                          onChange={e => handleUpdatePOItem(index, 'qty', Number(e.target.value))}
                          className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Harga"
                          value={item.harga || ''}
                          onChange={e => handleUpdatePOItem(index, 'harga', Number(e.target.value))}
                          className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <div className="col-span-1 text-sm text-gray-600 flex items-center">
                          {formatRupiah(item.subtotal)}
                        </div>
                        <button
                          onClick={() => handleRemovePOItem(index)}
                          className="col-span-1 text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddPOItem}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      + Tambah Item
                    </button>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">PPN (Rp)</label>
                    <input
                      type="number"
                      value={poForm.ppn || ''}
                      onChange={e => setPOForm({ ...poForm, ppn: Number(e.target.value) })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-800">
                      <strong>Total:</strong> {formatRupiah(
                        poForm.items.reduce((sum, item) => sum + item.subtotal, 0) + poForm.ppn
                      )}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">
                      Jurnal akan otomatis tergenerate saat PO disimpan
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={activeTab === 'invoice' ? handleSaveInvoice : handleSavePO}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Simpan
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
