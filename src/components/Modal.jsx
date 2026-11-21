import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/** Native modal dialog with focus trapping, Escape to close and backdrop dismissal. */
export function Modal({ title, onClose, children, drawer = false }) {
  const dialog = useRef(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    // Escape is handled natively through onCancel; the click handler only adds backdrop dismissal for pointer users.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialog}
      className={drawer ? 'dialog drawer' : 'dialog'}
      aria-labelledby={heading}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="dialog-inner">
        <header className="dialog-head">
          <h2 id={heading}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
