import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

/**
 * ConfirmDialog - Document 05 "Delete Confirmation":
 * display confirmation before deleting, prevent mistakes.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      {description && (
        <p className="mb-6 text-body text-text-secondary">{description}</p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={isDestructive ? "primary" : "primary"}
          onClick={onConfirm}
          isLoading={isLoading}
          className={isDestructive ? "!bg-danger !text-white" : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
