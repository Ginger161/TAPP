'use client'

import { useState } from 'react'
import { createSupply } from './actions'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { catchNetworkError } from '@/utils/network'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { parseISOToDate, getLocalWATDateString } from '@/utils/dateFormatter'
import CustomDropdown from '@/components/CustomDropdown'

export default function NewSupplyFormClient({ 
  stations, 
  products 
}: { 
  stations: { id: string, name: string }[] | null,
  products: { id: string, name: string }[] | null
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [supplyDate, setSupplyDate] = useState(getLocalWATDateString())
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    const result = await catchNetworkError(createSupply(formData))
    setIsSubmitting(false)

    if (result && result.error) {
      toast.error(result.error)
    } else {
      toast.success('Supply initiated successfully!')
      router.push('/dashboard')
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="stationId">Station</label>
          <CustomDropdown 
            required 
            id="stationId" 
            name="stationId" 
            placeholder="Select Station..."
            options={stations?.map(s => ({ value: s.id, label: s.name })) || []} 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="productId">Product</label>
          <CustomDropdown 
            required 
            id="productId" 
            name="productId" 
            placeholder="Select Product..."
            options={products?.map(p => ({ value: p.id, label: p.name })) || []} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="quantity">Quantity (Liters)</label>
          <input required id="quantity" name="quantity" type="number" inputMode="decimal" pattern="[0-9]*" inputMode="decimal" pattern="[0-9]*" step="0.01" min="0" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tycoon-red" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="costPrice">Total Cost Price (₦)</label>
          <input required id="costPrice" name="costPrice" type="number" inputMode="decimal" pattern="[0-9]*" inputMode="decimal" pattern="[0-9]*" step="0.01" min="0" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tycoon-red" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="supplier">Supplier</label>
        <input required id="supplier" name="supplier" type="text" placeholder="e.g., NNPC" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tycoon-red" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="datePicker">Date</label>
        <DatePicker
          id="datePicker"
          selected={parseISOToDate(supplyDate)}
          onChange={(date: Date | null) => {
            if (date) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              setSupplyDate(`${year}-${month}-${day}`);
            }
          }}
          dateFormat="dd/MM/yyyy"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tycoon-red"
          maxDate={new Date()}
          required
        />
        <input type="hidden" name="date" value={supplyDate} />
      </div>

      <button disabled={isSubmitting} type="submit" className="w-full bg-tycoon-red hover:bg-red-800 text-white font-medium py-3 rounded-lg transition-colors mt-6 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
        {isSubmitting ? 'Submitting...' : 'Submit Supply'}
      </button>
    </form>
  )
}
