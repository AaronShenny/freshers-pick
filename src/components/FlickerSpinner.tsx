import type { CSSProperties } from 'react';

export default function FlickerSpinner({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '1.950s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f0000110000011 { 0% { opacity: 0; } 30.76% { opacity: 0; } 30.77% { opacity: 1; } 46.14% { opacity: 1; } 46.15% { opacity: 0; } 84.61% { opacity: 0; } 84.62% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0001100000110 { 0% { opacity: 0; } 23.07% { opacity: 0; } 23.08% { opacity: 1; } 38.45% { opacity: 1; } 38.46% { opacity: 0; } 76.91% { opacity: 0; } 76.92% { opacity: 1; } 92.30% { opacity: 1; } 92.31% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0011000001100 { 0% { opacity: 0; } 15.37% { opacity: 0; } 15.38% { opacity: 1; } 30.76% { opacity: 1; } 30.77% { opacity: 0; } 69.22% { opacity: 0; } 69.23% { opacity: 1; } 84.61% { opacity: 1; } 84.62% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0110000011000 { 0% { opacity: 0; } 7.68% { opacity: 0; } 7.69% { opacity: 1; } 23.07% { opacity: 1; } 23.08% { opacity: 0; } 61.53% { opacity: 0; } 61.54% { opacity: 1; } 76.91% { opacity: 1; } 76.92% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f1100000110000 { 0% { opacity: 1; } 15.37% { opacity: 1; } 15.38% { opacity: 0; } 53.84% { opacity: 0; } 53.85% { opacity: 1; } 69.22% { opacity: 1; } 69.23% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f1000001100001 { 0% { opacity: 1; } 7.68% { opacity: 1; } 7.69% { opacity: 0; } 46.14% { opacity: 0; } 46.15% { opacity: 1; } 61.53% { opacity: 1; } 61.54% { opacity: 0; } 92.30% { opacity: 0; } 92.31% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0000011000011 { 0% { opacity: 0; } 38.45% { opacity: 0; } 38.46% { opacity: 1; } 53.84% { opacity: 1; } 53.85% { opacity: 0; } 84.61% { opacity: 0; } 84.62% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f1000011000001 { 0% { opacity: 1; } 7.68% { opacity: 1; } 7.69% { opacity: 0; } 38.45% { opacity: 0; } 38.46% { opacity: 1; } 53.84% { opacity: 1; } 53.85% { opacity: 0; } 92.30% { opacity: 0; } 92.31% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f1100001100000 { 0% { opacity: 1; } 15.37% { opacity: 1; } 15.38% { opacity: 0; } 46.14% { opacity: 0; } 46.15% { opacity: 1; } 61.53% { opacity: 1; } 61.54% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0110000110000 { 0% { opacity: 0; } 7.68% { opacity: 0; } 7.69% { opacity: 1; } 23.07% { opacity: 1; } 23.08% { opacity: 0; } 53.84% { opacity: 0; } 53.85% { opacity: 1; } 69.22% { opacity: 1; } 69.23% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0011000011000 { 0% { opacity: 0; } 15.37% { opacity: 0; } 15.38% { opacity: 1; } 30.76% { opacity: 1; } 30.77% { opacity: 0; } 61.53% { opacity: 0; } 61.54% { opacity: 1; } 76.91% { opacity: 1; } 76.92% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0001100001100 { 0% { opacity: 0; } 23.07% { opacity: 0; } 23.08% { opacity: 1; } 38.45% { opacity: 1; } 38.46% { opacity: 0; } 69.22% { opacity: 0; } 69.23% { opacity: 1; } 84.61% { opacity: 1; } 84.62% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000110000110 { 0% { opacity: 0; } 30.76% { opacity: 0; } 30.77% { opacity: 1; } 46.14% { opacity: 1; } 46.15% { opacity: 0; } 76.91% { opacity: 0; } 76.92% { opacity: 1; } 92.30% { opacity: 1; } 92.31% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle className="on" cx="3" cy="3" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
      <circle cx="9" cy="3" r="2" />
      <circle className="on" cx="9" cy="3" r="2" opacity={0} style={{ animation: 'f0001100000110 var(--dur) linear infinite' }} />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={0} style={{ animation: 'f0011000001100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={0} style={{ animation: 'f0110000011000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={1} style={{ animation: 'f1100000110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle className="on" cx="33" cy="3" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="39" cy="3" r="2" />
      <circle className="on" cx="39" cy="3" r="2" opacity={0} style={{ animation: 'f0000011000011 var(--dur) linear infinite' }} />
      <circle cx="3" cy="9" r="2" />
      <circle className="on" cx="3" cy="9" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f0001100000110 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f0011000001100 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f0110000011000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={1} style={{ animation: 'f1100000110000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle className="on" cx="39" cy="9" r="2" opacity={1} style={{ animation: 'f1000001100001 var(--dur) linear infinite' }} />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={1} style={{ animation: 'f1100001100000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f0001100000110 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f0011000001100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f0110000011000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle className="on" cx="39" cy="15" r="2" opacity={1} style={{ animation: 'f1100000110000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={0} style={{ animation: 'f0110000110000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={1} style={{ animation: 'f1100001100000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f0001100000110 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f0011000001100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={0} style={{ animation: 'f0110000011000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f0011000011000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f0110000110000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={1} style={{ animation: 'f1100001100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f0001100000110 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={0} style={{ animation: 'f0011000001100 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" opacity={0} style={{ animation: 'f0001100001100 var(--dur) linear infinite' }} />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" opacity={0} style={{ animation: 'f0011000011000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f0110000110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={1} style={{ animation: 'f1100001100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle className="on" cx="33" cy="33" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
      <circle cx="39" cy="33" r="2" />
      <circle className="on" cx="39" cy="33" r="2" opacity={0} style={{ animation: 'f0001100000110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="39" r="2" />
      <circle className="on" cx="3" cy="39" r="2" opacity={0} style={{ animation: 'f0000110000110 var(--dur) linear infinite' }} />
      <circle cx="9" cy="39" r="2" />
      <circle className="on" cx="9" cy="39" r="2" opacity={0} style={{ animation: 'f0001100001100 var(--dur) linear infinite' }} />
      <circle cx="15" cy="39" r="2" />
      <circle className="on" cx="15" cy="39" r="2" opacity={0} style={{ animation: 'f0011000011000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="39" r="2" />
      <circle className="on" cx="21" cy="39" r="2" opacity={0} style={{ animation: 'f0110000110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="39" r="2" />
      <circle className="on" cx="27" cy="39" r="2" opacity={1} style={{ animation: 'f1100001100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="39" r="2" />
      <circle className="on" cx="33" cy="39" r="2" opacity={1} style={{ animation: 'f1000011000001 var(--dur) linear infinite' }} />
      <circle cx="39" cy="39" r="2" />
      <circle className="on" cx="39" cy="39" r="2" opacity={0} style={{ animation: 'f0000110000011 var(--dur) linear infinite' }} />
    </svg>
  );
}
