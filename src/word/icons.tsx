// Iconos SVG ligeros usados por la barra de herramientas del editor.
// Todos heredan el color con currentColor y un trazo uniforme.

type P = { className?: string };

const base = (children: React.ReactNode) => ({ className }: P) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const BoldIcon = base(
  <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 7H7z" />,
);
export const ItalicIcon = base(
  <>
    <line x1="19" y1="5" x2="11" y2="5" />
    <line x1="13" y1="19" x2="5" y2="19" />
    <line x1="15" y1="5" x2="9" y2="19" />
  </>,
);
export const UnderlineIcon = base(
  <>
    <path d="M7 4v6a5 5 0 0 0 10 0V4" />
    <line x1="5" y1="20" x2="19" y2="20" />
  </>,
);
export const StrikeIcon = base(
  <>
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M7 7a4 3 0 0 1 8 0M9 17a4 3 0 0 0 8 0" />
  </>,
);
export const SubscriptIcon = base(
  <>
    <path d="M5 6l8 9M13 6l-8 9" />
    <path d="M18 18h3m-3 0c0-1.2 3-1.4 3-3a1.5 1.5 0 0 0-3 0" />
  </>,
);
export const SuperscriptIcon = base(
  <>
    <path d="M5 9l8 9M13 9l-8 9" />
    <path d="M18 8h3m-3 0c0-1.2 3-1.4 3-3a1.5 1.5 0 0 0-3 0" />
  </>,
);

export const AlignLeftIcon = base(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="18" y2="18" />
  </>,
);
export const AlignCenterIcon = base(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="5" y1="18" x2="19" y2="18" />
  </>,
);
export const AlignRightIcon = base(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="6" y1="18" x2="20" y2="18" />
  </>,
);
export const AlignJustifyIcon = base(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </>,
);

export const ListBulletIcon = base(
  <>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
  </>,
);
export const ListOrderedIcon = base(
  <>
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M4 5h1.5v3M4 8h2M4 13h2l-2 3h2M4 18h2" />
  </>,
);
export const IndentIcon = base(
  <>
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M4 8l3 4-3 4z" fill="currentColor" />
  </>,
);
export const OutdentIcon = base(
  <>
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M7 8l-3 4 3 4z" fill="currentColor" />
  </>,
);

export const UndoIcon = base(
  <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1" />,
);
export const RedoIcon = base(
  <path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h1" />,
);

export const LinkIcon = base(
  <>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </>,
);
export const UnlinkIcon = base(
  <>
    <path d="M9 12l-2 2a4 4 0 0 0 6 6l1-1M15 12l2-2a4 4 0 0 0-6-6l-1 1" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </>,
);
export const ImageIcon = base(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-7 7" />
  </>,
);
export const TableIcon = base(
  <>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="15" y1="4" x2="15" y2="20" />
  </>,
);
export const HrIcon = base(
  <>
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="6" y1="7" x2="18" y2="7" opacity="0.4" />
    <line x1="6" y1="17" x2="18" y2="17" opacity="0.4" />
  </>,
);
export const QuoteIcon = base(
  <path d="M7 7H4v5h3c0 2-1 3-3 3v2c3 0 5-2 5-5V7zm10 0h-3v5h3c0 2-1 3-3 3v2c3 0 5-2 5-5V7z" />,
);
export const CodeIcon = base(
  <>
    <polyline points="8 6 3 12 8 18" />
    <polyline points="16 6 21 12 16 18" />
  </>,
);
export const ClearFormatIcon = base(
  <>
    <path d="M5 5h14M9 5l-2 14M13 5l-1 7" />
    <line x1="15" y1="15" x2="20" y2="20" />
    <line x1="20" y1="15" x2="15" y2="20" />
  </>,
);
export const TextColorIcon = base(
  <>
    <path d="M6 17L11 5l5 12M7.5 13h7" />
  </>,
);
export const HighlightIcon = base(
  <>
    <path d="M4 20h16" />
    <path d="M9 15l7-7 3 3-7 7H8z" />
  </>,
);

export const SearchIcon = base(
  <>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </>,
);
export const MenuIcon = base(
  <>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </>,
);
export const NewDocIcon = base(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <polyline points="14 3 14 8 19 8" />
    <line x1="12" y1="12" x2="12" y2="17" />
    <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
  </>,
);
export const OpenIcon = base(
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
);
export const SaveIcon = base(
  <>
    <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M8 3v5h7M8 21v-7h8v7" />
  </>,
);
export const DownloadIcon = base(
  <>
    <path d="M12 4v11" />
    <polyline points="7 11 12 16 17 11" />
    <line x1="5" y1="20" x2="19" y2="20" />
  </>,
);
export const PrintIcon = base(
  <>
    <polyline points="6 9 6 3 18 3 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="7" />
  </>,
);
export const TrashIcon = base(
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>,
);
export const CloseIcon = base(
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>,
);
export const SunIcon = base(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </>,
);
export const MoonIcon = base(
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
);
export const CheckIcon = base(<polyline points="20 6 9 17 4 12" />);
