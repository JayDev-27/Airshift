import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MapPin, Send } from 'lucide-react';
import { cities } from '../domain.mjs';
import { buildReply, requestAnswer } from '../lib/assistant-client.mjs';
import { MAX_CONTEXT_QUESTIONS, MAX_QUESTION_LENGTH } from '../lib/assistant-contract.mjs';
import { FOLLOW_SCROLL_THRESHOLD_PX, GUIDED_REPLY_DELAY_MS } from '../lib/constants.mjs';
import { groupMessage } from '../lib/planning.mjs';
import { Modal } from './Modal.jsx';
import { AirMark } from './motion.jsx';
import { ReplyStream, replyIntro } from './ReplyStream.jsx';

const SUGGESTIONS = ['Can I open my windows?', 'Plan a school pickup', 'I don’t have a purifier', 'Help our neighbourhood plan'];

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

/** Keep the newest reply in view while the user stays near the bottom of the conversation. */
function useFollowScroll() {
  const bodyRef = useRef(null);
  const feedRef = useRef(null);
  const followRef = useRef(true);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (followRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    });
    observer.observe(feedRef.current);
    return () => observer.disconnect();
  }, []);
  const onScroll = event => {
    const panel = event.currentTarget;
    followRef.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < FOLLOW_SCROLL_THRESHOLD_PX;
  };
  const resumeFollowing = () => { followRef.current = true; };
  return { bodyRef, feedRef, onScroll, resumeFollowing };
}

function Welcome({ city, air, hasTurns, onAsk }) {
  return (
    <div className={hasTurns ? 'assistant-session' : 'assistant-welcome'}>
      {!hasTurns && <AirMark className="welcome-mark" active />}
      {!hasTurns && <h3>What are you planning today?</h3>}
      <span className="assistant-context">
        <MapPin size={14} /> {city.name} <i /> {air.mode === 'demo' ? 'Winter demo' : 'Current forecast'}
      </span>
      {!hasTurns && (
        <div className="suggestions">
          {SUGGESTIONS.map(sample => (
            <button className="quiet-btn tiny" key={sample} onClick={() => onAsk(sample)}>{sample}<ArrowUpRight size={12} /></button>
          ))}
        </div>
      )}
    </div>
  );
}

function Thinking() {
  return (
    <div className="assistant-thinking" role="status">
      <AirMark className="reply-mark" active /> Preparing your reply<span aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

/** Conversational drawer that turns questions into reviewed plan actions. */
export function Assistant({ profile, air, gemini, turns, setTurns, onClose, onApply, onCopy }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const requestRef = useRef(null);
  const { bodyRef, feedRef, onScroll, resumeFollowing } = useFollowScroll();
  const city = cities.find(entry => entry.id === profile.city);
  useEffect(() => () => requestRef.current?.abort(), []);

  const updateTurn = (id, change) => setTurns(previous => previous.map(turn => (turn.id === id ? change(turn) : turn)));

  async function submit(value) {
    const text = value.trim();
    if (!text || busy) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const id = crypto.randomUUID();
    const recent = turns.slice(-MAX_CONTEXT_QUESTIONS).map(turn => turn.text);
    resumeFollowing();
    setActiveReply(id);
    setTurns(previous => [...previous, { id, text }]);
    setQuestion('');
    setBusy(true);

    let answer;
    try {
      answer = await requestAnswer({ question: text, recent, profile, air, gemini, signal: controller.signal });
    } catch {
      return; // Cancelled because the drawer closed.
    }
    if (!gemini && !prefersReducedMotion()) await pause(GUIDED_REPLY_DELAY_MS);
    if (controller.signal.aborted) return;

    const reply = buildReply(answer, profile, air);
    const result = { ...answer, ...reply, intro: replyIntro({ ...answer, ...reply }, city, air) };
    updateTurn(id, turn => ({ ...turn, result }));
    setBusy(false);
  }

  function apply(turn) {
    onApply(turn.result.profile, turn.result.actions);
    updateTurn(turn.id, current => ({ ...current, result: { ...current.result, applied: true } }));
  }

  return (
    <Modal title={<><AirMark className="assistant-header-mark" active={busy} /> Ask Airshift</>} onClose={onClose} drawer>
      <div className="assistant-body" ref={bodyRef} onScroll={onScroll}>
        <div className="assistant-feed" ref={feedRef}>
          <Welcome city={city} air={air} hasTurns={turns.length > 0} onAsk={submit} />
          {turns.map(turn => (
            <div className="chat-turn" key={turn.id}>
              <p className="asked">{turn.text}</p>
              {turn.result ? (
                <ReplyStream
                  result={turn.result}
                  immediate={turn.id !== activeReply}
                  onApply={() => apply(turn)}
                  onShare={() => onCopy(groupMessage(city, air, turn.result.cards))}
                />
              ) : <Thinking />}
            </div>
          ))}
        </div>
      </div>
      <form className="assistant-form" onSubmit={event => { event.preventDefault(); submit(question); }}>
        <input
          value={question}
          placeholder="Ask about your day…"
          aria-label="Ask about your day"
          maxLength={MAX_QUESTION_LENGTH}
          onChange={event => setQuestion(event.target.value)}
        />
        <button className="primary-btn" aria-label="Send question" disabled={!question.trim() || busy}>
          <Send size={18} strokeWidth={1.7} />
        </button>
      </form>
    </Modal>
  );
}
