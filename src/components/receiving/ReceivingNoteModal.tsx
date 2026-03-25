'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ReceivingNoteModalProps {
  open: boolean
  initialNote: string
  onClose: () => void
  onSave: (note: string) => Promise<void>
}

export function ReceivingNoteModal({ open, initialNote, onClose, onSave }: ReceivingNoteModalProps) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setNote(initialNote)
  }, [open, initialNote])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(note.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="📝 Add Receiving Note" className="sm:max-w-md">
      <p className="text-[11px] text-gray-500 mb-3">This note appears on due-date reminders and order screens.</p>
      <textarea
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[100px]"
        placeholder="e.g. Own goods — COG aprons x12. Check before pickup."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
