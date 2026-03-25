import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function BookingConfirmationModal({ open, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm booking" size="sm">
      <p className="text-slate-700 dark:text-slate-300">
        Do you want to book a tutor for this time?
      </p>
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Yes</Button>
      </div>
    </Modal>
  );
}

