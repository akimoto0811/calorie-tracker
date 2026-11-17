import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: P, strokeWidth = 2) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const ChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Plus = (p: P) => (
  <svg {...base(p, 2.4)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base(p, 2.4)}>
    <path d="M5 12l4 4 10-10" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
export const Barcode = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3" />
    <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
  </svg>
);
export const Camera = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const ImageIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="M21 16l-5-5-9 9" />
  </svg>
);
export const Pencil = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);
export const Alert = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.5" />
  </svg>
);
export const Lock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const Trash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const Home = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);
export const Chart = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 20V11M11 20V5M17 20v-6M3 20h18" />
  </svg>
);
export const Book = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h5a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" />
    <path d="M20 5h-5a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h6z" />
  </svg>
);
export const User = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const Logo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 1 8 8h-8z" />
  </svg>
);
export const Apple = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 3c-1.5.2-3 1.3-3.4 3 1.6.1 3-1 3.4-3z" />
    <path d="M12 7.5c-1 0-2-.7-3.3-.7C6.4 6.8 4.5 8.8 4.5 12c0 4 2.7 9 5 9 1 0 1.6-.6 2.5-.6s1.4.6 2.5.6c1.7 0 3.4-2.8 4.3-5.2-1.6-.7-2.6-2.1-2.6-3.8 0-1.5.8-2.8 2-3.5-.9-1.2-2.2-1.7-3.4-1.7-1.3 0-2 .7-2.8.7z" />
  </svg>
);
export const Google = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z" />
    <path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7A10 10 0 0 0 12 22z" />
    <path fill="#FBBC05" d="M6.2 13.6a6 6 0 0 1 0-3.8V7.1H2.7a10 10 0 0 0 0 9.2z" />
    <path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 4 1.5l3-3A10 10 0 0 0 2.7 7.1l3.5 2.7C7 7.7 9.3 5.9 12 5.9z" />
  </svg>
);
