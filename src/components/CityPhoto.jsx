import React, { useState } from 'react';
import { Camera, ArrowUpRight } from 'lucide-react';
import { photoCredits } from '../city-photos.mjs';

export default function CityPhoto({ city }) {
  const [layers, setLayers] = useState({ current: null, previous: null });
  const [unavailable, setUnavailable] = useState(null);
  const credit = photoCredits[city.id];
  const behind = layers.current === city.id ? layers.previous : layers.current;
  return <>
    <div className="city-photo-stage">
      {behind && <img key={`background-${behind}`} className="city-photo prior" src={`${import.meta.env.BASE_URL}cities/${behind}.webp`} alt="" aria-hidden="true" />}
      <img key={city.id} className={`city-photo${layers.current === city.id ? ' visible' : ''}`} src={`${import.meta.env.BASE_URL}cities/${city.id}.webp`}
        alt={`${credit.landmark}, ${city.name}`} fetchPriority="high"
        onLoad={() => setLayers(previous => previous.current === city.id ? previous : { current: city.id, previous: previous.current })}
        onError={() => setUnavailable(city.id)} />
    </div>
    {unavailable === city.id ? <div className="model-credit"><Camera size={13} /> City photo unavailable</div> :
      <a className="model-credit city-photo-credit" href={credit.link} target="_blank" rel="noreferrer"
        title={credit.author && credit.license ? `${credit.author} · ${credit.license} · Photo credit` : 'Photo credit on Wikimedia Commons'}>
        <Camera size={13} /> {credit.landmark} <ArrowUpRight size={12} />
      </a>}
  </>;
}
