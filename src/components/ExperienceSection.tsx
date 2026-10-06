import React, { useState } from 'react';
import { Atmosphere } from './fx';
import { ArrowUpRight, Mic2, Music2, Play, Sparkles } from 'lucide-react';
import punchImage from '../assets/images/artist-punch-worakarn.png';
import thaiImage from '../assets/images/artist-thai-thanawut.png';
import shamaImage from '../assets/images/artist-shama.png';

interface Artist {
  id: string;
  no: string;
  label: string;
  title: string;
  meta: string;
  description: string;
  image: string;
  accent: string;
  imageClass: string;
}

const ARTISTS: Artist[] = [
  {
    id: 'artist-01',
    no: '01',
    label: 'LIVE ARTIST',
    title: 'พั้นช์ วรกาญจน์',
    meta: 'VOCAL · ELEGANT POP · LIVE',
    description: 'เสียงร้องอบอุ่นและเสน่ห์เฉพาะตัวที่จะพาค่ำคืนนี้ไปในบรรยากาศที่ละมุนและน่าจดจำ',
    image: punchImage,
    accent: '#F0C866',
    imageClass: 'artist-punch',
  },
  {
    id: 'artist-02',
    no: '02',
    label: 'LIVE ARTIST',
    title: 'ฌามา',
    meta: 'VOCAL · BOHEMIAN · FOLK',
    description: 'คาแรกเตอร์ bohemian / folk ที่มีเอกลักษณ์ เติมสีสันและกลิ่นอายอิสระให้เวทีท่ามกลางขุนเขา',
    image: shamaImage,
    accent: '#D8A934',
    imageClass: 'artist-shama',
  },
  {
    id: 'artist-03',
    no: '03',
    label: 'LIVE ARTIST',
    title: 'ไท ธนาวุฒิ',
    meta: 'VOCAL · GUITAR · ROCK · LIVE',
    description: 'พลัง performance พร้อมกีตาร์สด ปลุกอารมณ์ rock / live music ให้ค่ำคืนนี้มีพลังจนถึงเพลงสุดท้าย',
    image: thaiImage,
    accent: '#E9B649',
    imageClass: 'artist-thai',
  },
];

export const ExperienceSection: React.FC = () => {
  const [active, setActive] = useState('artist-01');
  const activeArtist = ARTISTS.find((artist) => artist.id === active) ?? ARTISTS[0];

  return (
    <section id="experience" className="isolate section-experience relative overflow-hidden py-24 sm:py-28 lg:py-32">
      <Atmosphere fireflies={16} embers={10} rise={900} />
      <div className="pointer-events-none absolute inset-0">
        <div className="experience-noise absolute inset-0" />
        <div className="artist-aurora artist-aurora-one" />
        <div className="artist-aurora artist-aurora-two" />
        <div className="artist-orbit artist-orbit-one" />
        <div className="artist-orbit artist-orbit-two" />
        <div className="artist-star artist-star-a" />
        <div className="artist-star artist-star-b" />
        <div className="artist-star artist-star-c" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <span className="section-index">02</span>
              <p className="eyebrow">LIVE MUSIC FESTIVAL</p>
            </div>
            <h2 className="font-display text-5xl font-bold uppercase leading-[0.86] tracking-[-0.045em] text-[#FFF9ED] sm:text-7xl lg:text-[6.8rem]">
              MUSIC
              <span className="block">MAKES</span>
              <span className="block text-[#D8A934]">THE NIGHT.</span>
            </h2>
          </div>

          <div className="flex flex-col items-start gap-5 lg:items-end lg:text-right">
            <p className="max-w-xl text-sm leading-7 text-[#F3E7C8]/76 sm:text-base">
              พบกับ 3 ศิลปินที่จะมาร่วมสร้างบรรยากาศของ Royal Hills Fest 2026 ตั้งแต่ช่วงแสงสุดท้ายของวันไปจนถึงค่ำคืนกลางขุนเขา
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="glass-label flex items-center gap-2 px-4 py-2 text-[9px] font-semibold tracking-[0.28em] text-[#FFF9ED]/78">
                <Music2 className="h-3.5 w-3.5 text-[#D8A934]" />
                14 NOV 2026
              </div>
              <div className="glass-label flex items-center gap-2 px-4 py-2 text-[9px] font-semibold tracking-[0.28em] text-[#FFF9ED]/78">
                <Sparkles className="h-3.5 w-3.5 text-[#D8A934]" />
                ROYAL HILLS · LIVE STAGE
              </div>
            </div>
          </div>
        </div>

        <div className="artist-showcase mt-10 overflow-hidden rounded-[32px] border border-[#D8A934]/20 sm:mt-14">
          <div className="relative min-h-[620px] sm:min-h-[720px] lg:min-h-[690px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,169,52,0.23),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(255,220,130,0.08),transparent_35%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0A0E0A] via-[#0B100B]/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(8,12,8,0.96),transparent)]" />

            <div className="artist-stage-glow absolute left-1/2 top-[30%] h-[34vw] w-[34vw] max-h-[520px] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full" />

            <div className="artist-stage-line line-a absolute left-1/2 top-[13%] h-[72%] w-[1px] -translate-x-1/2 opacity-70" />
            <div className="artist-stage-line line-b absolute left-[20%] top-[50%] h-[1px] w-[60%] opacity-40" />

            <div className="absolute inset-x-0 bottom-0 flex h-[88%] items-end justify-center px-3 sm:px-8 lg:px-12">
              {ARTISTS.map((artist, index) => {
                const isActive = active === artist.id;
                return (
                  <button
                    type="button"
                    key={artist.id}
                    onMouseEnter={() => setActive(artist.id)}
                    onFocus={() => setActive(artist.id)}
                    onClick={() => setActive(artist.id)}
                    className={`artist-figure relative flex h-full w-1/3 items-end justify-center outline-none transition-all duration-700 ${
                      isActive ? 'z-30 -translate-y-2' : 'z-10 translate-y-1 opacity-[0.88]'
                    }`}
                    aria-label={`เลือก ${artist.title}`}
                  >
                    <div
                      className={`artist-halo absolute left-1/2 bottom-[11%] h-[58%] w-[64%] -translate-x-1/2 rounded-full ${
                        isActive ? 'opacity-100' : 'opacity-35'
                      }`}
                      style={{ boxShadow: `0 0 95px 20px ${artist.accent}22` }}
                    />
                    <div className={`artist-beam absolute bottom-0 left-1/2 h-[80%] w-[46%] -translate-x-1/2 rounded-full bg-gradient-to-t from-transparent via-white/4 to-white/0 blur-3xl ${isActive ? 'opacity-100' : 'opacity-40'}`} />
                    <img
                      src={artist.image}
                      alt={artist.title}
                      className={`relative z-20 h-[89%] w-auto max-w-[116%] object-contain object-bottom drop-shadow-[0_28px_30px_rgba(0,0,0,0.48)] transition-transform duration-700 ${artist.imageClass} ${
                        isActive ? 'scale-[1.02]' : 'scale-[0.96]'
                      }`}
                    />
                    {isActive && <span className="artist-ping absolute bottom-[17%] left-1/2 z-30 h-3 w-3 -translate-x-1/2 rounded-full bg-[#F0C866] shadow-[0_0_0_7px_rgba(240,200,102,0.08),0_0_24px_rgba(240,200,102,0.75)]" />}
                    <span className="sr-only">{artist.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-4 sm:left-8 sm:right-8 sm:top-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D8A934]/45 bg-black/20 text-[#D8A934] backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.38em] text-[#D8A934]">ROYAL HILLS FEST 2026</p>
                  <p className="mt-1 text-[9px] tracking-[0.24em] text-[#FFF9ED]/62">ONE NIGHT · A THOUSAND MEMORIES</p>
                </div>
              </div>

              <div className="glass-label hidden items-center gap-2 px-4 py-2 sm:flex">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D8A934]/50 text-[#D8A934]">
                  <Play className="ml-0.5 h-3 w-3 fill-current" />
                </span>
                <span className="text-[9px] font-semibold tracking-[0.3em] text-[#FFF9ED]/80">WATCH TRAILER</span>
              </div>
            </div>

            <div className="absolute left-5 top-[26%] hidden flex-col gap-3 text-[8px] font-semibold tracking-[0.46em] text-[#F3E7C8]/42 lg:flex">
              <span>MUSIC</span>
              <span>NATURE</span>
              <span>PEOPLE</span>
              <span>GOOD VIBES</span>
            </div>

            <div className="absolute bottom-5 right-5 hidden text-right sm:bottom-7 sm:right-8 lg:block">
              <p className="font-display text-5xl leading-none text-[#D8A934]/92">03</p>
              <p className="mt-1 text-[9px] font-semibold tracking-[0.38em] text-[#FFF9ED]/55">ARTISTS</p>
            </div>
          </div>

          <div className="grid gap-px border-t border-white/10 bg-white/8 md:grid-cols-3">
            {ARTISTS.map((artist) => {
              const isActive = active === artist.id;
              return (
                <button
                  type="button"
                  key={artist.id}
                  onMouseEnter={() => setActive(artist.id)}
                  onFocus={() => setActive(artist.id)}
                  onClick={() => setActive(artist.id)}
                  className={`experience-tile group relative min-h-[250px] overflow-hidden p-6 text-left transition-all duration-500 sm:min-h-[275px] sm:p-7 ${
                    isActive ? 'bg-[#121A12]' : 'bg-[#0E140F] hover:bg-[#111811]'
                  }`}
                >
                  <div className="absolute inset-0 opacity-20 transition-all duration-700 group-hover:opacity-30">
                    <img src={artist.image} alt="" className="h-full w-full object-cover object-[50%_20%] scale-[1.08] blur-[0.2px] transition-transform duration-700 group-hover:scale-[1.12]" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B100C] via-[#0B100C]/88 to-[#0B100C]/42" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D8A934] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-[0.28em] text-[#D8A934]">{artist.no}</span>
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${isActive ? 'border-[#D8A934] bg-[#D8A934]/10 text-[#D8A934] rotate-0' : 'border-white/15 text-white/50'}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>

                    <div>
                      <p className="mb-2 text-[9px] font-semibold tracking-[0.26em] text-[#FFF9ED]/58">{artist.label}</p>
                      <h4 className="font-display text-[1.9rem] font-bold leading-none text-[#FFF9ED] sm:text-[2.1rem]">{artist.title}</h4>
                      <p className="mt-3 text-[9px] font-semibold tracking-[0.24em] text-[#D8A934]">{artist.meta}</p>
                      <p className={`mt-4 max-w-md text-xs leading-6 text-[#F3E7C8]/70 transition-all duration-500 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-75'}`}>
                        {artist.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="experience-now-card rounded-3xl border border-white/10 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8A934]/25 bg-[#D8A934]/8 text-[#D8A934]">
                <Mic2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#D8A934]">Featured artist</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#FFF9ED]">{activeArtist.title}</p>
                <p className="mt-1 text-xs text-[#F3E7C8]/60">{activeArtist.meta} · ROYAL HILLS FEST 2026</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#D8A934]/20 bg-[#D8A934]/7 px-6 py-5 sm:px-8 sm:py-6">
            <p className="text-[9px] font-semibold tracking-[0.3em] text-[#D8A934]">LINEUP</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#FFF9ED]">03 ARTISTS</p>
          </div>
        </div>
      </div>
    </section>
  );
};
