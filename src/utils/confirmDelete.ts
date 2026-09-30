import { Modal, message } from "antd";
import { t } from "@/i18n";

type ConfirmDeleteOptions = {
  name: string;
  description?: string;
  onOk: () => Promise<void>;
};

/** Confirms a list deletion, then archives the record through the existing DELETE API. */
export function confirmDelete({ name, description, onOk }: ConfirmDeleteOptions): void {
  Modal.confirm({
    title: t.common.deleteConfirmTitle.replace("{name}", name),
    content: description ?? t.common.deleteConfirmDesc,
    okText: t.common.delete,
    okButtonProps: { danger: true },
    cancelText: t.common.cancel,
    onOk: async () => {
      try {
        await onOk();
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        return Promise.reject(e);
      }
    },
  });
}
