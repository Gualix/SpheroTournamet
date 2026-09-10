import React from 'react';
import { AnimalProfile } from '../types';

interface AnimalAvatarProps {
  animal: AnimalProfile;
  size?: number;
  className?: string;
  showGlow?: boolean;
  isWinner?: boolean;
  isChampion?: boolean;
  onClick?: () => void;
}

export const AnimalAvatar: React.FC<AnimalAvatarProps> = ({
  animal,
  size = 40,
  className = '',
  showGlow = false,
  isWinner = false,
  isChampion = false,
  onClick,
}) => {
  const glowStyle = isChampion
    ? {
        filter: 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.8)) drop-shadow(0 0 20px rgba(245, 158, 11, 0.6))',
      }
    : isWinner || showGlow
    ? {
        filter: `drop-shadow(0 0 8px ${animal.glowColor})`,
      }
    : {};

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, ...glowStyle }}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none transition-transform duration-200 ${
        isChampion ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
      } ${className}`}
      title={`${animal.speciesName} - ${animal.name}`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`bg-${animal.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={animal.bgGradient[0]} />
            <stop offset="100%" stopColor={animal.bgGradient[1]} />
          </linearGradient>
          <linearGradient id={`gold-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Base Circle Background */}
        <circle cx="50" cy="50" r="48" fill={`url(#bg-${animal.id})`} stroke={animal.accentColor} strokeWidth="3" />

        {/* Vector Flat Art Animal Shapes based on animal.avatarPath */}
        {renderAnimalVector(animal.avatarPath, animal.accentColor)}

        {/* Outer Ring Accent */}
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

function renderAnimalVector(type: string, accent: string) {
  switch (type) {
    case 'fox':
      return (
        <g id="fox-avatar">
          {/* Ears */}
          <polygon points="24,42 16,14 42,28" fill="#c2410c" stroke="#fff" strokeWidth="1.5" />
          <polygon points="26,38 22,20 38,30" fill="#fed7aa" />
          <polygon points="76,42 84,14 58,28" fill="#c2410c" stroke="#fff" strokeWidth="1.5" />
          <polygon points="74,38 78,20 62,30" fill="#fed7aa" />
          {/* Head & Cheeks */}
          <polygon points="50,85 14,50 86,50" fill="#ea580c" />
          <polygon points="50,85 14,50 35,50" fill="#ffffff" />
          <polygon points="50,85 86,50 65,50" fill="#ffffff" />
          {/* Eyes */}
          <ellipse cx="36" cy="46" rx="4" ry="2.5" fill="#0f172a" transform="rotate(-8 36 46)" />
          <ellipse cx="64" cy="46" rx="4" ry="2.5" fill="#0f172a" transform="rotate(8 64 46)" />
          <circle cx="37" cy="45" r="1" fill="#fff" />
          <circle cx="63" cy="45" r="1" fill="#fff" />
          {/* Nose */}
          <circle cx="50" cy="80" r="4" fill="#0f172a" />
          <polygon points="46,78 54,78 50,83" fill="#0f172a" />
        </g>
      );

    case 'owl':
      return (
        <g id="owl-avatar">
          {/* Ear Tufts */}
          <polygon points="30,30 20,10 40,24" fill="#581c87" />
          <polygon points="70,30 80,10 60,24" fill="#581c87" />
          {/* Body */}
          <ellipse cx="50" cy="56" rx="34" ry="32" fill="#7c3aed" />
          {/* Face mask */}
          <circle cx="36" cy="48" r="16" fill="#f5f3ff" />
          <circle cx="64" cy="48" r="16" fill="#f5f3ff" />
          {/* Eyes */}
          <circle cx="36" cy="48" r="9" fill="#0f172a" />
          <circle cx="64" cy="48" r="9" fill="#0f172a" />
          <circle cx="38" cy="46" r="3" fill="#fbbf24" />
          <circle cx="62" cy="46" r="3" fill="#fbbf24" />
          <circle cx="39" cy="45" r="1.5" fill="#fff" />
          <circle cx="61" cy="45" r="1.5" fill="#fff" />
          {/* Beak */}
          <polygon points="46,54 54,54 50,68" fill="#f59e0b" />
          {/* Chest feathers */}
          <path d="M 40,76 Q 50,82 60,76" stroke="#c4b5fd" strokeWidth="2.5" fill="none" />
          <path d="M 44,82 Q 50,86 56,82" stroke="#c4b5fd" strokeWidth="2" fill="none" />
        </g>
      );

    case 'lion':
      return (
        <g id="lion-avatar">
          {/* Mane */}
          <circle cx="50" cy="50" r="38" fill="#b45309" />
          <polygon points="50,12 56,26 44,26" fill="#92400e" />
          <polygon points="78,22 74,36 64,28" fill="#92400e" />
          <polygon points="22,22 26,36 36,28" fill="#92400e" />
          {/* Ears */}
          <circle cx="26" cy="30" r="7" fill="#d97706" />
          <circle cx="26" cy="30" r="4" fill="#fed7aa" />
          <circle cx="74" cy="30" r="7" fill="#d97706" />
          <circle cx="74" cy="30" r="4" fill="#fed7aa" />
          {/* Face */}
          <ellipse cx="50" cy="55" rx="26" ry="24" fill="#fbbf24" />
          {/* Snout */}
          <ellipse cx="44" cy="65" rx="8" ry="7" fill="#fef3c7" />
          <ellipse cx="56" cy="65" rx="8" ry="7" fill="#fef3c7" />
          <polygon points="46,58 54,58 50,65" fill="#78350f" />
          {/* Eyes */}
          <circle cx="38" cy="48" r="4" fill="#0f172a" />
          <circle cx="62" cy="48" r="4" fill="#0f172a" />
          <circle cx="39" cy="47" r="1.5" fill="#fff" />
          <circle cx="61" cy="47" r="1.5" fill="#fff" />
        </g>
      );

    case 'wolf':
      return (
        <g id="wolf-avatar">
          {/* Ears */}
          <polygon points="28,36 20,12 42,24" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="30,32 25,18 40,24" fill="#38bdf8" />
          <polygon points="72,36 80,12 58,24" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="70,32 75,18 60,24" fill="#38bdf8" />
          {/* Head */}
          <polygon points="50,88 18,48 82,48" fill="#475569" />
          <polygon points="50,88 28,52 50,52" fill="#94a3b8" />
          <polygon points="50,88 72,52 50,52" fill="#cbd5e1" />
          {/* Eyes */}
          <polygon points="34,44 42,46 35,48" fill="#38bdf8" />
          <polygon points="66,44 58,46 65,48" fill="#38bdf8" />
          <circle cx="38" cy="46" r="1.5" fill="#0f172a" />
          <circle cx="62" cy="46" r="1.5" fill="#0f172a" />
          {/* Nose */}
          <polygon points="47,78 53,78 50,83" fill="#0f172a" />
        </g>
      );

    case 'eagle':
      return (
        <g id="eagle-avatar">
          {/* Head plumage */}
          <ellipse cx="50" cy="46" rx="32" ry="30" fill="#f8fafc" />
          {/* Feathers fringe */}
          <polygon points="22,58 30,70 34,58" fill="#e2e8f0" />
          <polygon points="78,58 70,70 66,58" fill="#e2e8f0" />
          <polygon points="50,68 45,78 55,78" fill="#e2e8f0" />
          {/* Intense Eyes */}
          <path d="M 28,38 Q 38,36 42,44" stroke="#0f172a" strokeWidth="2.5" fill="none" />
          <circle cx="36" cy="44" r="4.5" fill="#f59e0b" />
          <circle cx="36" cy="44" r="2.5" fill="#0f172a" />
          <path d="M 72,38 Q 62,36 58,44" stroke="#0f172a" strokeWidth="2.5" fill="none" />
          <circle cx="64" cy="44" r="4.5" fill="#f59e0b" />
          <circle cx="64" cy="44" r="2.5" fill="#0f172a" />
          {/* Hooked Beak */}
          <path d="M 44,48 Q 50,44 56,48 L 54,68 Q 50,78 46,68 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
        </g>
      );

    case 'tiger':
      return (
        <g id="tiger-avatar">
          {/* Ears */}
          <circle cx="24" cy="26" r="8" fill="#c2410c" />
          <circle cx="24" cy="26" r="5" fill="#fff" />
          <circle cx="76" cy="26" r="8" fill="#c2410c" />
          <circle cx="76" cy="26" r="5" fill="#fff" />
          {/* Head */}
          <ellipse cx="50" cy="54" rx="34" ry="28" fill="#ea580c" />
          {/* Stripes */}
          <polygon points="50,28 47,38 53,38" fill="#1e293b" />
          <polygon points="38,30 40,40 34,36" fill="#1e293b" />
          <polygon points="62,30 60,40 66,36" fill="#1e293b" />
          <polygon points="20,52 30,50 22,58" fill="#1e293b" />
          <polygon points="80,52 70,50 78,58" fill="#1e293b" />
          {/* Muzzle */}
          <ellipse cx="44" cy="65" rx="8" ry="6" fill="#f8fafc" />
          <ellipse cx="56" cy="65" rx="8" ry="6" fill="#f8fafc" />
          <polygon points="46,59 54,59 50,65" fill="#0f172a" />
          {/* Eyes */}
          <circle cx="36" cy="48" r="4.5" fill="#fef08a" />
          <circle cx="36" cy="48" r="2.5" fill="#0f172a" />
          <circle cx="64" cy="48" r="4.5" fill="#fef08a" />
          <circle cx="64" cy="48" r="2.5" fill="#0f172a" />
        </g>
      );

    case 'bear':
      return (
        <g id="bear-avatar">
          {/* Ears */}
          <circle cx="24" cy="28" r="9" fill="#78350f" />
          <circle cx="24" cy="28" r="5" fill="#b45309" />
          <circle cx="76" cy="28" r="9" fill="#78350f" />
          <circle cx="76" cy="28" r="5" fill="#b45309" />
          {/* Head */}
          <circle cx="50" cy="54" r="32" fill="#92400e" />
          {/* Snout */}
          <ellipse cx="50" cy="64" rx="15" ry="12" fill="#d97706" />
          <ellipse cx="50" cy="59" rx="6" ry="4" fill="#1e293b" />
          <path d="M 50,63 L 50,69" stroke="#1e293b" strokeWidth="2" />
          {/* Eyes */}
          <circle cx="37" cy="48" r="3.5" fill="#1e293b" />
          <circle cx="63" cy="48" r="3.5" fill="#1e293b" />
          <circle cx="38" cy="47" r="1" fill="#fff" />
          <circle cx="62" cy="47" r="1" fill="#fff" />
        </g>
      );

    case 'panda':
      return (
        <g id="panda-avatar">
          {/* Ears */}
          <circle cx="24" cy="26" r="9" fill="#0f172a" />
          <circle cx="76" cy="26" r="9" fill="#0f172a" />
          {/* Head */}
          <circle cx="50" cy="54" r="32" fill="#ffffff" />
          {/* Eye Patches */}
          <ellipse cx="35" cy="49" rx="9" ry="7" fill="#0f172a" transform="rotate(-15 35 49)" />
          <ellipse cx="65" cy="49" rx="9" ry="7" fill="#0f172a" transform="rotate(15 65 49)" />
          {/* Eyes */}
          <circle cx="36" cy="48" r="3" fill="#ffffff" />
          <circle cx="36" cy="48" r="1.5" fill="#0f172a" />
          <circle cx="64" cy="48" r="3" fill="#ffffff" />
          <circle cx="64" cy="48" r="1.5" fill="#0f172a" />
          {/* Nose */}
          <ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#0f172a" />
          <path d="M 45,67 Q 50,72 55,67" stroke="#0f172a" strokeWidth="2" fill="none" />
        </g>
      );

    case 'koala':
      return (
        <g id="koala-avatar">
          {/* Big Fluffy Ears */}
          <circle cx="20" cy="34" r="14" fill="#94a3b8" />
          <circle cx="20" cy="34" r="9" fill="#e2e8f0" />
          <circle cx="80" cy="34" r="14" fill="#94a3b8" />
          <circle cx="80" cy="34" r="9" fill="#e2e8f0" />
          {/* Head */}
          <circle cx="50" cy="55" r="30" fill="#cbd5e1" />
          {/* Big Nose */}
          <ellipse cx="50" cy="58" rx="9" ry="14" fill="#1e293b" />
          <ellipse cx="48" cy="54" rx="3" ry="5" fill="#334155" />
          {/* Eyes */}
          <circle cx="34" cy="48" r="3.5" fill="#0f172a" />
          <circle cx="66" cy="48" r="3.5" fill="#0f172a" />
          <circle cx="35" cy="47" r="1" fill="#fff" />
          <circle cx="65" cy="47" r="1" fill="#fff" />
        </g>
      );

    case 'dragon':
      return (
        <g id="dragon-avatar">
          {/* Horns */}
          <path d="M 28,34 Q 14,10 8,18 Q 22,26 32,36" fill="#dc2626" />
          <path d="M 72,34 Q 86,10 92,18 Q 78,26 68,36" fill="#dc2626" />
          {/* Crest */}
          <polygon points="50,16 45,30 55,30" fill="#f59e0b" />
          {/* Head */}
          <polygon points="50,84 20,44 80,44" fill="#ef4444" />
          <polygon points="50,84 32,48 68,48" fill="#b91c1c" />
          {/* Reptile Eyes */}
          <ellipse cx="35" cy="45" rx="5" ry="3" fill="#fbbf24" transform="rotate(-10 35 45)" />
          <line x1="35" y1="42" x2="35" y2="48" stroke="#0f172a" strokeWidth="2" />
          <ellipse cx="65" cy="45" rx="5" ry="3" fill="#fbbf24" transform="rotate(10 65 45)" />
          <line x1="65" y1="42" x2="65" y2="48" stroke="#0f172a" strokeWidth="2" />
          {/* Nostrils & smoke */}
          <circle cx="45" cy="74" r="2" fill="#7f1d1d" />
          <circle cx="55" cy="74" r="2" fill="#7f1d1d" />
        </g>
      );

    case 'panther':
      return (
        <g id="panther-avatar">
          {/* Ears */}
          <polygon points="26,38 18,18 38,26" fill="#3b0764" />
          <polygon points="74,38 82,18 62,26" fill="#3b0764" />
          {/* Head */}
          <ellipse cx="50" cy="54" rx="32" ry="26" fill="#1e1b4b" />
          {/* Glowing Eyes */}
          <ellipse cx="36" cy="46" rx="5" ry="3" fill="#a855f7" />
          <circle cx="36" cy="46" r="1.5" fill="#f3e8ff" />
          <ellipse cx="64" cy="46" rx="5" ry="3" fill="#a855f7" />
          <circle cx="64" cy="46" r="1.5" fill="#f3e8ff" />
          {/* Muzzle */}
          <ellipse cx="44" cy="64" rx="7" ry="5" fill="#312e81" />
          <ellipse cx="56" cy="64" rx="7" ry="5" fill="#312e81" />
          <polygon points="46,58 54,58 50,64" fill="#a855f7" />
        </g>
      );

    case 'shark':
      return (
        <g id="shark-avatar">
          {/* Fin */}
          <path d="M 50,10 Q 56,26 62,34 L 44,34 Z" fill="#0369a1" />
          {/* Head */}
          <path d="M 20,68 Q 50,22 80,68 Q 50,90 20,68 Z" fill="#0284c7" />
          <path d="M 28,68 Q 50,42 72,68 Q 50,84 28,68 Z" fill="#e0f2fe" />
          {/* Gills */}
          <line x1="26" y1="52" x2="30" y2="58" stroke="#075985" strokeWidth="2" />
          <line x1="30" y1="50" x2="34" y2="56" stroke="#075985" strokeWidth="2" />
          {/* Eyes */}
          <circle cx="36" cy="42" r="3.5" fill="#0f172a" />
          <circle cx="37" cy="41" r="1" fill="#fff" />
          <circle cx="64" cy="42" r="3.5" fill="#0f172a" />
          <circle cx="63" cy="41" r="1" fill="#fff" />
          {/* Teeth */}
          <polygon points="44,66 46,70 48,66" fill="#fff" />
          <polygon points="48,66 50,71 52,66" fill="#fff" />
          <polygon points="52,66 54,70 56,66" fill="#fff" />
        </g>
      );

    default:
      // Generic majestic beast
      return (
        <g id="default-avatar">
          <circle cx="50" cy="50" r="32" fill={accent} />
          <circle cx="36" cy="44" r="5" fill="#0f172a" />
          <circle cx="64" cy="44" r="5" fill="#0f172a" />
          <circle cx="38" cy="42" r="1.5" fill="#ffffff" />
          <circle cx="62" cy="42" r="1.5" fill="#ffffff" />
          <polygon points="45,55 55,55 50,64" fill="#0f172a" />
          <path d="M 40,68 Q 50,74 60,68" stroke="#0f172a" strokeWidth="2" fill="none" />
        </g>
      );
  }
}
