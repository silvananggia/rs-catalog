/** Inline SVG icons for map tools — 24×24 viewBox */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function IconBoxDrag(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
      <path d="M8 10h8M8 14h5" className="opacity-60" strokeWidth="1.25" />
    </svg>
  );
}

export function IconLineCorners(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="6" cy="8" r="2.25" />
      <circle cx="18" cy="16" r="2.25" />
      <path d="M8.2 9.2 L15.8 14.8" strokeDasharray="3 2" />
    </svg>
  );
}

export function IconRuler(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 18 L18 6" />
      <path d="M6 16l1-1M9 13.5l1-1M12 11l1-1M15 8.5l1-1" className="opacity-80" />
    </svg>
  );
}

export function IconClearAoi(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="5" y="7" width="14" height="10" rx="1.5" />
      <path d="M9 11 L15 17 M15 11 L9 17" />
    </svg>
  );
}

/** Map / basemap layers (stack). */
export function IconLayers(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 4L4 8l8 4 8-4-8-4z" />
      <path d="M4 12l8 4 8-4" opacity="0.85" />
      <path d="M4 16l8 4 8-4" opacity="0.65" />
    </svg>
  );
}
