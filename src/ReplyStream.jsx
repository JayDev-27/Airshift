import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ClipboardList, Share2 } from 'lucide-react';
import { recommendedWindow, sources } from './domain.mjs';
import { AirMark } from './motion.jsx';

const split = text => text.match(/\S+\s*/gu) ?? [];
const constraintNames = {
  'no-purifier': 'no air purifier', 'no-transit': 'no practical public transport',
  'fixed-time': 'a fixed schedule', sensitive: 'sensitivity to air pollution'
};

export function replyIntro(answer, city, air) {
  const first = answer.cards[0]?.id;
  if (answer.format === 'group') return `Here’s a short plan you can share with your group in ${city.name}.`;
  if (answer.format === 'schedule') return `Let’s put this into a schedule you can use in ${city.name}.`;
  if (first === 'windows') {
    const { best } = recommendedWindow(air, answer.profile);
    return best?.pm > 60 ? 'Even the lower-pollution window still has elevated particles. I’d wait for conditions to improve before airing out.'
      : 'For airing out, I’d go by the closest station and what’s happening inside your home.';
  }
  if (first === 'kitchen') return 'For cooking, I’d start by cutting the smoke at the stove.';
  if (first === 'home') return 'The quickest place to start is the room you spend the most time in.';
  if (first === 'transport') return 'Let’s look at a trip you can change and what that would save.';
  if (first === 'activity' && air.mean > 250) return 'The particle level shown is severe. I’d start with your time outdoors, then work around what you can’t move.';
  return `Here’s what I’d prioritize for your day in ${city.name}.`;
}

export function ReplyStream({ result, immediate, onApply, onShare }) {
  const words = useMemo(() => [result.intro, ...result.cards.map(action => action.description)].map(split), [result]);
  const total = words.reduce((sum, sentence) => sum + sentence.length, 0);
  // Word offsets where each paragraph starts, so rendering never mutates a running total.
  const offsets = useMemo(() => words.reduce((starts, sentence, index) =>
    [...starts, starts[index] + sentence.length], [0]), [words]);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(0);
  const complete = immediate || reducedMotion || visible >= total;
  useEffect(() => {
    if (immediate || reducedMotion) return;
    let count = 0;
    const interval = window.setInterval(() => {
      count += 1;
      setVisible(current => Math.max(current, count));
      if (count >= total) window.clearInterval(interval);
    }, 44);
    return () => window.clearInterval(interval);
  }, [immediate, reducedMotion, total]);

  const count = complete ? total : visible;
  const read = (index, consumed) => words[index].slice(0, Math.max(0, count - consumed)).join('');
  const introEnd = offsets[1];
  return <div className="assistant-result" role="group" aria-label="Airshift reply" aria-busy={!complete}>
    <div className="reply-byline"><AirMark className="reply-mark" active={!complete} /><strong>Airshift</strong><span>{result.mode === 'gemini' ? 'Gemini' : 'Guided mode'}</span></div>
    <p className={`reply-intro${count < introEnd ? ' typing-line' : ''}`} aria-hidden={!complete}>{read(0, 0)}</p>
    {result.constraints.length > 0 && count >= introEnd && <p className="question-constraints">I planned around {result.constraints.map(flag => constraintNames[flag]).join(', ')}.</p>}
    {result.cards.map((action, index) => {
      const start = offsets[index + 1];
      if (count <= start) return null;
      const finished = count >= offsets[index + 2];
      return <article className="answer-card" key={action.id}>
        <div className="action-meta">{result.format === 'schedule' ? action.when : action.category}</div>
        <h3>{action.title}</h3>
        <p className={finished ? '' : 'typing-line'} aria-hidden={!finished}>{read(index + 1, start)}</p>
        {finished && <div className="reply-detail"><p className="answer-impact">{action.impact}</p><a href={sources[action.sources[0]].url} target="_blank" rel="noreferrer">{sources[action.sources[0]].name}<ArrowUpRight size={12} /></a></div>}
      </article>;
    })}
    {complete ? <div className="button-row reply-actions">
      <button className="quiet-btn" onClick={onApply} disabled={result.applied}>{result.applied ? <Check size={16} /> : <ClipboardList size={16} />}{result.applied ? 'Added to daily plan' : 'Use in my daily plan'}</button>
      {result.format === 'group' && <button className="quiet-btn" onClick={onShare}><Share2 size={16} /> Copy for group</button>}
    </div> : <button className="text-btn reply-skip" onClick={() => setVisible(total)}>Show full reply <ArrowUpRight size={13} /></button>}
  </div>;
}
