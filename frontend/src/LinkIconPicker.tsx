import { createPortal } from "react-dom";
import { IconPicker } from "./IconPicker";
import { useApp } from "./context";
import { api } from "./types";
export function LinkIconPicker({
  attrs,
  onChange,
  onClose,
}: {
  attrs: Record<string, any>;
  onChange: (attrs: Record<string, any>) => void;
  onClose: () => void;
}) {
  const app = useApp();
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="modal callout-emoji-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Icône du lien"
      >
        <header>
          <strong>Icône du lien</strong>
          <button type="button" autoFocus aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </header>
        <IconPicker
          value={{
            emoji: attrs.icon || "",
            webIcon: attrs.icon?.startsWith("lucide:") ? attrs.icon : null,
            iconId: attrs.iconId || null,
          }}
          onEmoji={(icon) => {
            onChange({ icon, iconId: "" });
            onClose();
          }}
          onWebIcon={(icon) => {
            onChange({ icon, iconId: "" });
            onClose();
          }}
          onRemove={() => {
            onChange({ icon: "", iconId: "" });
            onClose();
          }}
          onImage={(action, file) => {
            if (file) {
              const data = new FormData();
              data.append("file", file);
              void api("upload", data)
                .then(({ file }) => {
                  app.uploadedFile(file);
                  onChange({ iconId: file.id });
                  onClose();
                })
                .catch((error) => app.notify(error.message));
            } else {
              onClose();
              app.chooseImage("icon", (file) => onChange({ iconId: file.id }));
            }
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
