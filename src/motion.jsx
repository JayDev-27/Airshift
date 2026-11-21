import React, { useLayoutEffect, useRef } from 'react';

export function AirMark({ className = '', active = false }) {
  return <span className={`air-mark ${className}${active ? ' mark-active' : ''}`} aria-hidden="true"><i /><i /><i /></span>;
}

export function useSlidingIndicator(selected, selector) {
  const track = useRef(null);
  useLayoutEffect(() => {
    const node = track.current;
    const button = node?.querySelector(selector);
    if (!node || !button) return;
    const measure = () => {
      const root = node.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      if (!target.width || !target.height) return;
      node.style.setProperty('--thumb-x', `${target.left - root.left - node.clientLeft}px`);
      node.style.setProperty('--thumb-y', `${target.top - root.top - node.clientTop}px`);
      node.style.setProperty('--thumb-width', `${target.width}px`);
      node.style.setProperty('--thumb-height', `${target.height}px`);
      node.dataset.indicated = '';
    };
    measure();
    const size = new ResizeObserver(measure);
    size.observe(node);
    size.observe(button);
    return () => size.disconnect();
  }, [selected, selector]);
  return track;
}

export function MotionSwitch({ label, value, options, onChange, className = '' }) {
  const track = useSlidingIndicator(value, 'button[aria-pressed="true"]');
  function moveSelection(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const available = options.filter(option => !option.disabled);
    if (available.length < 2) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const selected = available.findIndex(option => option.key === value);
    const next = available[(selected + direction + available.length) % available.length];
    onChange(next.key);
    track.current.querySelectorAll('button')[options.indexOf(next)].focus();
  }
  // Arrow keys move between the group's buttons (roving focus); each option stays a native button.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  return <div ref={track} className={`segmented motion-switch ${className}`} role="group" aria-label={label} onKeyDown={moveSelection}>
    <span className="sliding-thumb" aria-hidden="true" />
    {options.map(({ key, label: text, icon: Icon, disabled }) => <button key={key} type="button" className="segment"
      aria-pressed={key === value} disabled={disabled} onClick={() => onChange(key)}>
      {Icon && <Icon size={14} strokeWidth={1.7} />}<span>{text}</span>
    </button>)}
  </div>;
}
