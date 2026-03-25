import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function BookingRejectedModal({
  open,
  onClose,
  onSelectAnotherTutor,
  onChooseAnotherTime,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Tutor unavailable" size="sm">
      <p className="text-slate-700 dark:text-slate-300">
        Unfortunately, this tutor is unavailable for the selected time.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onSelectAnotherTutor}>Select Another Tutor for the Same Time</Button>
        <Button variant="secondary" onClick={onChooseAnotherTime}>
          Choose Another Time Slot
        </Button>
      </div>
    </Modal>
  );
}

