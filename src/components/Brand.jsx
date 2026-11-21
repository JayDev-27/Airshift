import React from 'react';
import { AirMark } from './motion.jsx';

/** Airshift wordmark with the animated airflow mark. */
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark"><AirMark /></span>airshift<span className="brand-period">.</span>
    </span>
  );
}
