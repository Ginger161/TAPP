'use client'

import React, { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { reassignManagerWithAuth } from './actions'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'

type Station = {
  id: string
  name: string
  assignedManagerIds: string[]
}

type Manager = {
  id: string
  email: string
}

function ManagerCard({ manager, id }: { manager: Manager, id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing mb-2"
    >
      <div className="text-sm font-medium">{manager.email}</div>
    </div>
  )
}

function StationZone({ station, managers }: { station: Station, managers: Manager[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: station.id })

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-xl border-2 transition-all duration-200 min-h-[120px] flex flex-col hover:shadow-md hover:border-gray-400 cursor-pointer ${
        isOver ? 'border-tycoon-red bg-gray-50 dark:bg-tycoon-red/20 shadow-md' : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
      }`}
    >
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">{station.name}</h3>
      <SortableContext items={managers.map(m => m.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {managers.map(manager => (
            <ManagerCard key={manager.id} manager={manager} id={manager.id} />
          ))}
        </div>
      </SortableContext>
      {managers.length === 0 && (
        <div className="text-sm text-gray-400 italic flex-grow flex items-center justify-center min-h-[60px]">
          Drop manager here
        </div>
      )}
    </div>
  )
}

function UnassignedZone({ managers }: { managers: Manager[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'unassigned' })
  
  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-xl border-2 min-h-[400px] sticky top-4 ${
        isOver ? 'border-tycoon-red bg-gray-50 dark:bg-tycoon-red/20 shadow-md' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm'
      }`}
    >
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b pb-2">Unassigned Managers</h3>
      <SortableContext items={managers.map(m => m.id)} strategy={verticalListSortingStrategy}>
        {managers.length === 0 ? (
          <div className="text-sm text-gray-400 italic text-center mt-8">No unassigned managers</div>
        ) : (
          managers.map(m => (
            <ManagerCard key={m.id} manager={m} id={m.id} />
          ))
        )}
      </SortableContext>
    </div>
  )
}

export default function StationAssignmentsDndClient({
  stations,
  managers
}: {
  stations: Station[]
  managers: Manager[]
}) {
  const [isMounted, setIsMounted] = useState(false)
  
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    stationId: string | null,
    managerId: string,
    description: string
  } | null>(null)
  
  const [adminPassword, setAdminPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeManager = activeId ? managers.find(m => m.id === activeId) : null

  const assignedManagerIds = stations.flatMap(s => s.assignedManagerIds)
  const unassignedManagers = managers.filter(m => !assignedManagerIds.includes(m.id))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const managerId = active.id as string
    const overId = over.id as string
    
    // Find current station if any
    const currentStation = stations.find(s => s.assignedManagerIds.includes(managerId))
    const currentStationId = currentStation ? currentStation.id : 'unassigned'

    let resolvedOverId = overId

    // If overId is a manager ID (dropped onto a sortable item), find its container
    if (overId !== 'unassigned' && !stations.find(s => s.id === overId)) {
      if (unassignedManagers.some(m => m.id === overId)) {
        resolvedOverId = 'unassigned'
      } else {
        const foundStation = stations.find(s => s.assignedManagerIds.includes(overId))
        if (foundStation) resolvedOverId = foundStation.id
      }
    }

    if (currentStationId === resolvedOverId) return // Dropped in same place

    const manager = managers.find(m => m.id === managerId)!
    
    let description = ''
    let targetStationId: string | null = null

    if (resolvedOverId === 'unassigned') {
      description = `Remove Manager ${manager.email} from ${currentStation?.name}`
    } else {
      const targetStation = stations.find(s => s.id === resolvedOverId)!
      description = `Assign Manager ${manager.email} to ${targetStation.name}`
      targetStationId = resolvedOverId
    }

    setPendingAction({
      stationId: targetStationId,
      managerId,
      description
    })
    setAdminPassword('')
    setIsModalOpen(true)
  }

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingAction || !adminPassword) return

    setIsSubmitting(true)

    const result = await catchNetworkError(reassignManagerWithAuth(
      pendingAction.stationId,
      pendingAction.managerId,
      adminPassword,
      pendingAction.description
    ))

    setIsSubmitting(false)

    if (result && 'success' in result && result.success) {
      toast.success('Manager reassigned successfully!')
      setIsModalOpen(false)
      setPendingAction(null)
    } else if (result && 'error' in result) {
      toast.error(result.error as string || 'Failed to authenticate')
    } else {
      toast.error('Failed to authenticate')
    }
  }

  if (!isMounted) {
    return null // Avoid hydration mismatch on server render
  }

  return (
    <>
      <DndContext 
        id="dnd-context"
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <UnassignedZone managers={unassignedManagers} />
          </div>
          
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stations.map(station => {
                const assignedManagers = managers.filter(m => station.assignedManagerIds.includes(m.id))
                return (
                  <StationZone 
                    key={station.id} 
                    station={station} 
                    managers={assignedManagers} 
                  />
                )
              })}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeManager ? (
            <div className="p-3 bg-white dark:bg-gray-800 border border-tycoon-red rounded-lg shadow-xl opacity-90 scale-105">
              <div className="text-sm font-medium text-tycoon-red">{activeManager.email}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Re-Authentication Modal */}
      {isModalOpen && pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verify Action</h3>
            </div>
            
            <form onSubmit={handleConfirmAction} className="p-6">
              <div className="mb-6 p-4 bg-gray-50 dark:bg-tycoon-red/20 text-tycoon-red dark:text-gray-300 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-800/30">
                {pendingAction.description}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Admin Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-tycoon-red bg-white dark:bg-gray-800 dark:border-gray-700"
                    placeholder="Enter your password to confirm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-tycoon-red hover:bg-red-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
