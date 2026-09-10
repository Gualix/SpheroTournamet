import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Tournament, PodiumPlace } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import {
  Trophy,
  Download,
  Share2,
  Sparkles,
  X,
  Check,
  Medal,
  Crown,
  Flame,
  Award,
} from 'lucide-react';
import { playChampionFanfare, playClickSfx } from '../utils/audio';
import { getTopThreePodium } from '../utils/tournamentEngine';

interface ChampionModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
}

export const ChampionModal: React.FC<ChampionModalProps> = ({
  tournament,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const podium = getTopThreePodium(tournament);
  const firstPlace = podium[0];
  const secondPlace = podium[1];
  const thirdPlace = podium[2];

  // Trigger confetti burst on open
  useEffect(() => {
    if (isOpen && firstPlace) {
      playChampionFanfare();

      const duration = 4 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors: ['#f59e0b', '#e2e8f0', '#b45309', '#06b6d4', '#ffffff'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors: ['#f59e0b', '#e2e8f0', '#b45309', '#06b6d4', '#ffffff'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen, firstPlace]);

  if (!isOpen || podium.length === 0) return null;

  const handleShare = () => {
    playClickSfx();
    let text = `🏆 ¡PODIO OFICIAL DE GANADORES — ${tournament.title}! 🏁\n\n`;
    if (firstPlace) {
      text += `🥇 1er LUGAR (Oro): ${firstPlace.participant.name} (${firstPlace.participant.animal.emoji} ${firstPlace.participant.animal.name})\n   • ${firstPlace.scoreSummary} — ${firstPlace.details}\n\n`;
    }
    if (secondPlace) {
      text += `🥈 2do LUGAR (Plata): ${secondPlace.participant.name} (${secondPlace.participant.animal.emoji} ${secondPlace.participant.animal.name})\n   • ${secondPlace.scoreSummary} — ${secondPlace.details}\n\n`;
    }
    if (thirdPlace) {
      text += `🥉 3er LUGAR (Bronce): ${thirdPlace.participant.name} (${thirdPlace.participant.animal.emoji} ${thirdPlace.participant.animal.name})\n   • ${thirdPlace.scoreSummary} — ${thirdPlace.details}\n\n`;
    }
    text += `¡Competencia de Robótica y Programación STEM de Akamai Costa Rica!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadCard = () => {
    playClickSfx();
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 900, 1100);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.3, '#0f172a');
    bgGrad.addColorStop(0.7, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 900, 1100);

    // Decorative outer & inner borders
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 840, 1040);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, 816, 1016);

    // Header Title
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ CERTIFICADO OFICIAL DE PREMIACIÓN ⭐', 450, 95);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(tournament.title.toUpperCase(), 450, 130);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CUADRO DE HONOR — PODIO DE LOS 3 PRIMEROS LUGARES', 450, 160);

    // Helper to draw a podium position on canvas
    const drawPodiumEntity = (
      pItem: PodiumPlace,
      centerX: number,
      centerY: number,
      radius: number,
      borderColor: string,
      placeLabel: string,
      isFirst: boolean
    ) => {
      // Pedestal base
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isFirst ? 8 : 5;
      ctx.stroke();

      // Emoji
      ctx.font = `${radius * 0.9}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(pItem.participant.animal.emoji, centerX, centerY + radius * 0.35);

      // Place Medal Banner
      ctx.fillStyle = borderColor;
      ctx.beginPath();
      ctx.roundRect(centerX - 60, centerY + radius - 15, 120, 28, 8);
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(placeLabel, centerX, centerY + radius + 4);

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = isFirst ? 'bold 24px sans-serif' : 'bold 19px sans-serif';
      ctx.fillText(pItem.participant.name, centerX, centerY + radius + 48);

      // Animal Species
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText(pItem.participant.animal.name, centerX, centerY + radius + 68);

      // Score / details
      ctx.fillStyle = borderColor;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(pItem.scoreSummary, centerX, centerY + radius + 90);
    };

    // Draw 1st place in center (elevated)
    if (firstPlace) {
      // Crown above 1st
      ctx.font = '46px sans-serif';
      ctx.fillText('👑', 450, 215);
      drawPodiumEntity(firstPlace, 450, 310, 80, '#f59e0b', '🥇 1º LUGAR', true);
    }

    // Draw 2nd place on left
    if (secondPlace) {
      drawPodiumEntity(secondPlace, 190, 370, 65, '#cbd5e1', '🥈 2º LUGAR', false);
    }

    // Draw 3rd place on right
    if (thirdPlace) {
      drawPodiumEntity(thirdPlace, 710, 395, 60, '#d97706', '🥉 3º LUGAR', false);
    }

    // Detailed Ranking Table Cards at bottom
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(70, 560, 760, 370);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(70, 560, 760, 370);

    // Section title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DETALLE DEL PODIO Y RENDIMIENTO EN PISTA', 95, 600);

    podium.slice(0, 3).forEach((item, idx) => {
      const rowY = 640 + idx * 95;

      // Row background
      ctx.fillStyle = idx === 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.5)';
      ctx.fillRect(95, rowY - 25, 710, 75);
      ctx.strokeStyle =
        idx === 0
          ? 'rgba(245, 158, 11, 0.5)'
          : idx === 1
          ? 'rgba(203, 213, 225, 0.3)'
          : 'rgba(217, 119, 6, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(95, rowY - 25, 710, 75);

      // Medal and Place
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.medal, 135, rowY + 22);

      // Name & Animal
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText(`${item.place}º Lugar: ${item.participant.name}`, 180, rowY + 5);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText(
        `Animal: ${item.participant.animal.name} (${item.participant.animal.speciesName}) • Semilla #${item.participant.seed}`,
        180,
        rowY + 30
      );

      // Points Badge
      ctx.textAlign = 'right';
      ctx.fillStyle = idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : '#d97706';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(item.scoreSummary, 780, rowY + 10);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.details, 780, rowY + 32);
    });

    // Seal & Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `Akamai Costa Rica • Torneo STEM Sphero • Certificado emitido el ${new Date().toLocaleDateString(
        'es-ES',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )}`,
      450,
      980
    );

    // Download image
    const link = document.createElement('a');
    link.download = `podio-top3-${tournament.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl sm:max-w-3xl bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Glow bar */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse shrink-0" />

        {/* Close button */}
        <button
          onClick={() => {
            playClickSfx();
            onClose();
          }}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div ref={cardRef} className="p-5 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Header Banner */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Podio de Campeones STEM • Top 3</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ¡Gran Ceremonia de Premiación!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Reconocimiento oficial a los tres mejores competidores en pista de{' '}
              <span className="text-amber-300 font-semibold">{tournament.title}</span>.
            </p>
          </div>

          {/* Olympic 3D Visual Podium (2nd - 1st - 3rd) */}
          <div className="pt-8 pb-4 px-2 bg-gradient-to-b from-slate-950/60 to-slate-900/90 border border-slate-800 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-slate-400 via-amber-400 to-amber-700" />

            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-xl mx-auto">
              {/* 2nd PLACE (PLATA) */}
              <div className="flex flex-col items-center text-center">
                {secondPlace ? (
                  <>
                    <div className="relative mb-2 group">
                      <div className="relative p-1 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-500 shadow-[0_0_20px_rgba(203,213,225,0.35)]">
                        <AnimalAvatar
                          animal={secondPlace.participant.animal}
                          size={64}
                          className="ring-2 ring-slate-950"
                        />
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xl filter drop-shadow">
                        🥈
                      </span>
                    </div>

                    <div className="w-full mb-2">
                      <h4 className="text-xs sm:text-sm font-black text-white truncate px-1">
                        {secondPlace.participant.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono font-bold">
                        {secondPlace.scoreSummary}
                      </p>
                    </div>

                    {/* Pedestal Step 2 */}
                    <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-900 to-slate-800/90 border-t-4 border-slate-300 rounded-t-2xl flex flex-col items-center justify-center shadow-lg shadow-slate-950/50">
                      <span className="text-3xl sm:text-4xl font-black text-slate-300 font-mono opacity-80">
                        2
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Plata
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-24 sm:h-32 flex items-center justify-center text-slate-600 text-xs font-mono">
                    —
                  </div>
                )}
              </div>

              {/* 1st PLACE (ORO - CAMPEÓN) */}
              <div className="flex flex-col items-center text-center -mt-6">
                {firstPlace ? (
                  <>
                    <div className="text-3xl sm:text-4xl animate-bounce filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)] -mb-2 z-10">
                      👑
                    </div>

                    <div className="relative mb-2">
                      <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-[0_0_35px_rgba(245,158,11,0.6)]">
                        <AnimalAvatar
                          animal={firstPlace.participant.animal}
                          size={82}
                          isChampion={true}
                          className="ring-4 ring-slate-950"
                        />
                      </div>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-2xl filter drop-shadow">
                        🥇
                      </span>
                    </div>

                    <div className="w-full mb-2">
                      <h3 className="text-sm sm:text-base font-black text-amber-300 truncate px-1">
                        {firstPlace.participant.name}
                      </h3>
                      <p className="text-[11px] font-black text-amber-400 font-mono">
                        {firstPlace.scoreSummary}
                      </p>
                    </div>

                    {/* Pedestal Step 1 (Highest) */}
                    <div className="w-full h-36 sm:h-48 bg-gradient-to-t from-amber-950/80 via-amber-900/60 to-amber-800/80 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-center shadow-xl shadow-amber-500/20">
                      <span className="text-4xl sm:text-5xl font-black text-amber-300 font-mono">
                        1
                      </span>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Oro
                      </span>
                    </div>
                  </>
                ) : null}
              </div>

              {/* 3rd PLACE (BRONCE) */}
              <div className="flex flex-col items-center text-center">
                {thirdPlace ? (
                  <>
                    <div className="relative mb-2 group">
                      <div className="relative p-1 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-900 shadow-[0_0_20px_rgba(180,83,9,0.35)]">
                        <AnimalAvatar
                          animal={thirdPlace.participant.animal}
                          size={56}
                          className="ring-2 ring-slate-950"
                        />
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xl filter drop-shadow">
                        🥉
                      </span>
                    </div>

                    <div className="w-full mb-2">
                      <h4 className="text-xs sm:text-sm font-black text-white truncate px-1">
                        {thirdPlace.participant.name}
                      </h4>
                      <p className="text-[10px] text-amber-600 font-mono font-bold">
                        {thirdPlace.scoreSummary}
                      </p>
                    </div>

                    {/* Pedestal Step 3 */}
                    <div className="w-full h-20 sm:h-26 bg-gradient-to-t from-slate-950 to-stone-900 border-t-4 border-amber-700/90 rounded-t-2xl flex flex-col items-center justify-center shadow-lg shadow-stone-950/60">
                      <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono opacity-90">
                        3
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                        Bronce
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-20 sm:h-26 flex items-center justify-center text-slate-600 text-xs font-mono">
                    —
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top 3 Breakdown Detailed Cards */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Detalle de Clasificación & Premiación</span>
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {podium.slice(0, 3).map(item => {
                const isGold = item.place === 1;
                const isSilver = item.place === 2;
                const isBronze = item.place === 3;

                return (
                  <div
                    key={item.participant.id}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isGold
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/20'
                        : isSilver
                        ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        : 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl sm:text-3xl shrink-0">{item.medal}</div>
                      <div className="shrink-0">
                        <AnimalAvatar animal={item.participant.animal} size={42} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white truncate">
                            {item.participant.name}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isGold
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : isSilver
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                                : 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{item.participant.animal.emoji}</span>
                          <span>{item.participant.animal.name}</span>
                          <span>• Semilla #{item.participant.seed}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base sm:text-lg font-black font-mono ${
                          isGold
                            ? 'text-amber-400'
                            : isSilver
                            ? 'text-slate-200'
                            : 'text-amber-500'
                        }`}
                      >
                        {item.scoreSummary}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{item.details}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Download Official Certificate & Share Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadCard}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Certificado Top 3</span>
            </button>

            <button
              onClick={handleShare}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">¡Podio Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Compartir Podio Completo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
