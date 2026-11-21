import React, { useEffect, useRef, useState } from 'react';
import { formatHour, formatHourShort } from '../domain.mjs';
import { chartScale } from '../lib/planning.mjs';

const PADDING = Object.freeze({ left: 37, right: 13, top: 12, bottom: 27 });
const COLORS = Object.freeze({
  label: '#636761', grid: '#e5e6df', best: '#96ad52', bestFade: '#96ad524d', hover: '#232821', bestOutline: '#5e7433'
});
const AXIS_HOURS = [0, 6, 12, 18];

const clampIndex = (value, length) => Math.max(0, Math.min(length - 1, value));

function drawChart(element, { air, best, hover }) {
  const width = element.clientWidth;
  const height = element.clientHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  element.width = width * ratio;
  element.height = height * ratio;
  const context = element.getContext('2d');
  context.scale(ratio, ratio);

  const { hours } = air;
  const max = Math.max(40, ...hours.map(point => point.pm));
  const { step, ceiling } = chartScale(max);
  const x = index => PADDING.left + index / (hours.length - 1) * (width - PADDING.left - PADDING.right);
  const y = pm => height - PADDING.bottom - pm / ceiling * (height - PADDING.bottom - PADDING.top);

  context.font = '10px "IBM Plex Mono", monospace';
  context.textBaseline = 'middle';
  context.fillStyle = COLORS.label;
  for (let value = 0; value <= ceiling; value += step) {
    context.strokeStyle = COLORS.grid;
    context.setLineDash(value ? [3, 4] : []);
    context.beginPath();
    context.moveTo(PADDING.left, y(value));
    context.lineTo(width - PADDING.right, y(value));
    context.stroke();
    context.fillText(String(value), 1, y(value));
  }
  context.setLineDash([]);

  const axis = [...new Set([...AXIS_HOURS, hours.length - 1])].filter(index => index < hours.length);
  for (const index of axis) {
    context.textAlign = index === 0 ? 'left' : index === axis.at(-1) ? 'right' : 'center';
    context.fillText(formatHourShort(hours[index].hour), x(index), height - 7);
  }

  const bestIndex = best ? hours.findIndex(point => point.hour === best.hour && point.day === best.day) : -1;
  const columnWidth = Math.min(18, (width - PADDING.left - PADDING.right) / hours.length * 0.65);
  const base = y(0);
  hours.forEach((point, index) => {
    const barTop = y(point.pm);
    const share = point.pm / max;
    const hue = 30 - 46 * share;
    const gradient = context.createLinearGradient(0, barTop, 0, base + 1);
    gradient.addColorStop(0, index === bestIndex ? COLORS.best : `hsl(${hue} ${47 - 18 * share}% 61%)`);
    gradient.addColorStop(1, index === bestIndex ? COLORS.bestFade : `hsl(${hue} 28% 62% / .28)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(x(index) - columnWidth / 2, barTop, columnWidth, Math.max(1, base - barTop), [3, 3, 0, 0]);
    context.fill();
    if (hover === index || bestIndex === index) {
      context.strokeStyle = hover === index ? COLORS.hover : COLORS.bestOutline;
      context.lineWidth = 1;
      context.stroke();
    }
  });
}

/** Canvas bar chart of hourly PM₂.₅, inspectable by pointer or arrow keys. */
export function ForecastChart({ air, best }) {
  const canvas = useRef(null);
  const [hover, setHover] = useState(null);
  const plotted = hover === null ? null : air.hours[hover];
  const count = air.hours.length;

  useEffect(() => {
    const element = canvas.current;
    const paint = () => drawChart(element, { air, best, hover });
    const observer = new ResizeObserver(paint);
    observer.observe(element);
    paint();
    return () => observer.disconnect();
  }, [air, best, hover]);

  const pointAt = event => {
    const bounds = canvas.current.getBoundingClientRect();
    const scaled = (event.clientX - bounds.left - PADDING.left) / (bounds.width - PADDING.left - PADDING.right);
    setHover(clampIndex(Math.round(scaled * (count - 1)), count));
  };
  const stepWithKeys = event => {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    setHover(value => clampIndex((value ?? (direction > 0 ? -1 : 1)) + direction, count));
  };

  return (
    <div className="chart-box">
      <canvas
        ref={canvas}
        aria-label="Hourly PM2.5 chart. Use arrow keys to inspect hourly values."
        tabIndex={0}
        onPointerMove={pointAt}
        onPointerLeave={() => setHover(null)}
        onClick={pointAt}
        onBlur={() => setHover(null)}
        onKeyDown={stepWithKeys}
      />
      {plotted && (
        <div className="chart-tooltip" role="status">
          {air.mode === 'live' && `${plotted.day} · `}{formatHour(plotted.hour)} · {plotted.pm} µg/m³
        </div>
      )}
    </div>
  );
}
