import React, { useMemo, useState } from 'react';
import { ArrowRight, Instagram, MapPin, Music2, Play, Ticket, Youtube } from 'lucide-react';
import punchImage from '../assets/images/artist-punch-worakarn.png';
import thaiImage from '../assets/images/artist-thai-thanawut.png';
import shamaImage from '../assets/images/artist-shama.png';
import concertBackdrop from '../assets/images/concert-festival-backdrop.webp';

interface Artist {
  id: string;
  no: string;
  label: string;
  title: string;
  shortTitle: string;
  meta: string;
  description: string;
  image: string;
  className: string;
}

const ARTISTS: Artist[] = [
  {
    id: 'artist-01', no: '01', label: 'LIVE ARTIST', title: 'พั้นช์ วรกาญจน์', shortTitle: 'พั้นช์',
    meta: 'VOCAL · LIVE PERFORMANCE',
    description: 'เสียงร้องอบอุ่นและเสน่ห์เฉพาะตัวที่จะพาค่ำคืนนี้ให้ละมุนและน่าจดจำ',
    image: punchImage, className: 'artist-punch',
  },
  {
    id: 'artist-02', no: '02', label: 'LIVE ARTIST', title: 'ไท ธนาวุฒิ', shortTitle: 'ไท ธนาวุฒิ',
    meta: 'VOCAL · GUITAR · ROCK · LIVE',
    description: 'พลังเสียงและดนตรีสดที่จะเชื่อมความคิดถึงให้ดังไปทั่วขุนเขาในค่ำคืนนี้',
    image: thaiImage, className: 'artist-thai',
  },
  {
    id: 'artist-03', no: '03', label: 'LIVE ARTIST', title: 'ฌามา', shortTitle: 'ฌามา',
    meta: 'VOCAL · LIVE PERFORMANCE',
    description: 'เอกลักษณ์ทางดนตรีและการแสดงสดที่ถ่ายทอดอารมณ์ของค่ำคืนกลางขุนเขา',
    image: shamaImage, className: 'artist-shama',
  },
];

export const ExperienceSection: React.FC = () => {
  const [active, setActive] = useState('artist-01');
  const activeArtist = useMemo(() => ARTISTS.find((artist) => artist.id === active) ?? ARTISTS[0], [active]);

  return (
    <section
      id="experience"
      className={`artist-festival-section relative isolate overflow-hidden active-${active}`}
      data-motion-scene="artists"
    >
      <div className="artist-festival-backdrop" aria-hidden="true">
        <img src={concertBackdrop} alt="" className="artist-festival-backdrop-image" />
        <div className="artist-festival-overlay" />
        <div className="artist-festival-vignette" />
        <div className="artist-festival-grain" />
      </div>

      <div className="artist-festival-orbits" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <span className="orbit orbit-three" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
        <header className="artist-festival-header rh-motion-block">
          <div className="artist-festival-header-main">
            <div className="artist-festival-eyebrow">LIVE MUSIC FESTIVAL · 14 NOV 2026</div>
            <div className="artist-festival-heading-row">
              <h2 className="artist-festival-title" aria-label="Music Makes The Night">
                <span>MUSIC MAKES</span>
                <span className="gold">THE NIGHT.</span>
              </h2>
              <div className="artist-festival-now-playing" aria-live="polite">
                <span className="artist-festival-now-dot" />
                <div>
                  <span className="artist-festival-now-label">NOW PLAYING</span>
                  <strong>{activeArtist.shortTitle}</strong>
                </div>
              </div>
            </div>
            <div className="artist-festival-intro-row">
              <p className="artist-festival-copy">
                3 ศิลปิน · 1 คืน · เสียงเพลงกลางขุนเขา
                <span>ROYAL HILLS LIVE STAGE · NAKHON NAYOK</span>
              </p>
              <button type="button" className="artist-festival-trailer" data-cursor="interactive">
                <span className="artist-festival-play"><Play className="h-4 w-4 fill-current" /></span>
                <span>WATCH TRAILER</span>
              </button>
            </div>
          </div>

          <div className="artist-festival-header-side" aria-hidden="true">
            <div className="artist-festival-mark">
              <span className="artist-festival-mark-star">✦</span>
              <div><strong>ROYAL HILLS</strong><span>FEST 2026</span></div>
            </div>
            <div className="artist-festival-words">
              <span>MUSIC</span><span>NATURE</span><span>PEOPLE</span><span>GOOD VIBES</span>
            </div>
          </div>
        </header>

        <div className="artist-festival-stage rh-motion-block">
          <div className="artist-festival-stage-light" aria-hidden="true" />
          <div className="artist-festival-stage-light-secondary" aria-hidden="true" />
          <div className="artist-festival-stage-floor" aria-hidden="true" />
          <div className="artist-festival-figures" aria-label="ศิลปินหลัก 3 คน">
            {ARTISTS.map((artist) => {
              const isActive = active === artist.id;
              return (
                <button
                  key={artist.id}
                  type="button"
                  className={`artist-festival-figure ${artist.className} ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(artist.id)}
                  onFocus={() => setActive(artist.id)}
                  onClick={() => setActive(artist.id)}
                  aria-label={`เลือก ${artist.title}`}
                  data-cursor="artist"
                >
                  <span className="artist-festival-figure-halo" aria-hidden="true" />
                  <span className="artist-festival-figure-beam" aria-hidden="true" />
                  <span className="artist-festival-figure-rim" aria-hidden="true" />
                  <img src={artist.image} alt={artist.title} />
                  <span className="artist-festival-figure-name">{artist.shortTitle}</span>
                </button>
              );
            })}
          </div>
          <div className="artist-festival-stage-caption" aria-hidden="true">
            <span><Music2 className="h-3.5 w-3.5" /> {activeArtist.title.toUpperCase()} · LIVE STAGE</span>
            <span>03 ARTISTS</span>
          </div>
        </div>

        <div className="artist-festival-cards rh-motion-block" aria-label="รายละเอียดศิลปิน">
          {ARTISTS.map((artist) => {
            const isActive = active === artist.id;
            return (
              <button
                key={artist.id}
                type="button"
                className={`artist-festival-card ${isActive ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(artist.id)}
                onFocus={() => setActive(artist.id)}
                onClick={() => setActive(artist.id)}
                data-cursor="artist"
              >
                <div className="artist-festival-card-image" style={{ backgroundImage: `url(${artist.image})` }} />
                <div className="artist-festival-card-shade" />
                <div className="artist-festival-card-content">
                  <div className="artist-festival-card-topline">
                    <div className="artist-festival-card-number-wrap">
                      <span className="artist-festival-card-number">{artist.no}</span>
                      <span className="artist-festival-card-label">{artist.label}</span>
                    </div>
                    <span className="artist-festival-card-arrow"><ArrowRight className="h-4 w-4" /></span>
                  </div>
                  <div>
                    <h3>{artist.title}</h3>
                    <p className="artist-festival-card-meta">{artist.meta}</p>
                    <p className="artist-festival-card-description">{artist.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="artist-festival-meta-bar">
          <div className="artist-festival-location">
            <MapPin className="h-5 w-5 text-[#f4c95b]" />
            <div><strong>ROYAL HILLS</strong><span>NAKHON NAYOK, THAILAND</span></div>
          </div>
          <span className="artist-festival-divider" />
          <span className="artist-festival-meta-date">14 NOV 2026</span>
          <span className="artist-festival-divider" />
          <div className="artist-festival-socials" aria-label="social links">
            <span><Instagram className="h-4 w-4" /></span><span><Youtube className="h-4 w-4" /></span><span>f</span><span>♪</span>
          </div>
          <div className="artist-festival-count"><strong>03</strong><span>ARTISTS</span></div>
          <button
            type="button"
            className="artist-festival-meta-cta"
            onClick={() => document.getElementById('tickets-preview')?.scrollIntoView({ behavior: 'smooth' })}
            data-cursor="interactive"
          >
            <Ticket className="h-3.5 w-3.5" /> EXPERIENCE THE NIGHT
          </button>
        </div>
      </div>
    </section>
  );
};
