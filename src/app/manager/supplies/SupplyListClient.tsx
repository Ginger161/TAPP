'use client'

import { useState } from 'react'
import { acceptSupply, rejectSupply, submitStockTransfer } from './actions'
import { CheckCircle, XCircle, Clock, PackageCheck, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'
import CustomDropdown from '@/components/CustomDropdown'

type SupplyTransaction = {
  id: string
  quantity: number
  cost_price: number
  supplier: string
  date: string
  status: string
  products: { name: string } | null
}

export default function SupplyListClient({ 
  pendingTransactions,
  acceptedTransactions,
  products
}: { 
  pendingTransactions: SupplyTransaction[]
  acceptedTransactions: SupplyTransaction[]
  products: { id: string, name: string }[]
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'received'>('pending')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Modal state
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<SupplyTransaction | null>(null)

  // Transfer Out Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferData, setTransferData] = useState({
    productId: products.length > 0 ? products[0].id : '',
    volume: '',
    destination: '',
    managerInCharge: '',
    comment: ''
  })

  const handleOpenAcceptModal = (tx: SupplyTransaction) => {
    setSelectedTx(tx)
    setIsAcceptModalOpen(true)
  }

  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx) return

    setIsSubmitting(true)
    setProcessingId(selectedTx.id)
    
    const result = await catchNetworkError(acceptSupply(selectedTx.id))
    
    setProcessingId(null)
    setIsSubmitting(false)
    setIsAcceptModalOpen(false)
    setSelectedTx(null)

    if (result && result.error) {
      toast.error(result.error)
    } else {
      toast.success('Supply accepted successfully!')
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('Supply Activated', {
            body: `${selectedTx.quantity.toLocaleString()}L of ${selectedTx.products?.name} has been successfully logged into inventory.`,
            icon: '/icon.png'
          })
        })
      }
    }
  }

  const handleReject = async (id: string) => {
    setIsSubmitting(true)
    setProcessingId(id)
    const result = await catchNetworkError(rejectSupply(id))
    setProcessingId(null)
    setIsSubmitting(false)

    if (result && result.error) {
      toast.error(result.error)
    } else {
      toast.success('Supply rejected successfully.')
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const volumeNum = parseFloat(transferData.volume)
    if (isNaN(volumeNum) || volumeNum <= 0) {
      toast.error('Please enter a valid volume greater than 0.')
      setIsSubmitting(false)
      return
    }

    const result = await catchNetworkError(submitStockTransfer(
      transferData.productId,
      volumeNum,
      transferData.destination,
      transferData.managerInCharge,
      transferData.comment
    ))

    setIsSubmitting(false)

    if (result && result.error) {
      toast.error(result.error)
    } else {
      toast.success('Stock transfer logged successfully.')
      setIsTransferModalOpen(false)
      setTransferData({
        productId: products.length > 0 ? products[0].id : '',
        volume: '',
        destination: '',
        managerInCharge: '',
        comment: ''
      })
    }
  }

  const transactions = activeTab === 'pending' ? pendingTransactions : acceptedTransactions

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'pending' 
                ? 'border-tycoon-navy text-tycoon-navy' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Deliveries ({pendingTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'received' 
                ? 'border-tycoon-navy text-tycoon-navy' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            Received History
          </button>
        </div>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-tycoon-navy hover:bg-tycoon-navy/90 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Transfer Out Stock
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'pending' ? 'No pending supply deliveries found for your station.' : 'No received supplies history.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="py-4 px-6 font-medium text-gray-500 dark:text-slate-100">Date</th>
                  <th className="py-4 px-6 font-medium text-gray-500 dark:text-slate-100">Product</th>
                  <th className="py-4 px-6 font-medium text-gray-500 dark:text-slate-100">Volume</th>
                  <th className="py-4 px-6 font-medium text-gray-500 dark:text-slate-100">Supplier</th>
                  <th className="py-4 px-6 font-medium text-gray-500 dark:text-slate-100">Status</th>
                  {activeTab === 'pending' && <th className="py-4 px-6 font-medium text-gray-500 dark:text-slate-100 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-6 dark:text-slate-100">{tx.date}</td>
                    <td className="py-4 px-6 font-medium dark:text-slate-100">{tx.products?.name}</td>
                    <td className="py-4 px-6 dark:text-slate-100">{tx.quantity.toLocaleString()} L</td>
                    <td className="py-4 px-6 text-gray-500 dark:text-slate-300">{tx.supplier}</td>
                    <td className="py-4 px-6">
                      {tx.status === 'pending' ? (
                        <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Pending</span>
                      ) : (
                        <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Received</span>
                      )}
                    </td>
                    {activeTab === 'pending' && (
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenAcceptModal(tx)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {isSubmitting && processingId === tx.id ? '...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleReject(tx.id)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            {isSubmitting && processingId === tx.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAcceptModalOpen && selectedTx && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Reconcile Delivery
              </h3>
              <button onClick={() => setIsAcceptModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleConfirmAccept} className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 p-4 rounded-xl text-sm mb-4">
                You are about to accept <strong className="font-semibold">{selectedTx.quantity.toLocaleString()} L</strong> of {selectedTx.products?.name} into your station's stock.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm Received'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TransferOutModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        products={products}
        transferData={transferData}
        setTransferData={setTransferData}
        onSubmit={handleTransferSubmit}
        isSubmitting={isSubmitting}
      />

    </>
  )
}

function TransferOutModal({
  isOpen,
  onClose,
  products,
  transferData,
  setTransferData,
  onSubmit,
  isSubmitting
}: {
  isOpen: boolean
  onClose: () => void
  products: { id: string, name: string }[]
  transferData: any
  setTransferData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-tycoon-navy" />
            Transfer Out Stock
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
            <CustomDropdown
              required
              value={transferData.productId}
              onChange={(val) => setTransferData({...transferData, productId: val})}
              options={products.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Volume (Liters)</label>
            <input
              type="number"
              required
              min="0.1"
              step="any"
              value={transferData.volume}
              onChange={(e) => setTransferData({...transferData, volume: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination Station</label>
            <input
              type="text"
              required
              value={transferData.destination}
              onChange={(e) => setTransferData({...transferData, destination: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
              placeholder="e.g. Main Branch"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manager in Charge</label>
            <input
              type="text"
              required
              value={transferData.managerInCharge}
              onChange={(e) => setTransferData({...transferData, managerInCharge: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
              placeholder="Name of Manager"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comments (Optional)</label>
            <input
              type="text"
              value={transferData.comment}
              onChange={(e) => setTransferData({...transferData, comment: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
              placeholder="Any additional details"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-tycoon-navy hover:bg-tycoon-navy/90 text-white font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Log Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
