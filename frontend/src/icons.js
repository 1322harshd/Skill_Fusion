const ArrowPath = ({ d, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d={d} />
  </svg>
);

const FilledPath = ({ d, ...rest }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path d={d} />
  </svg>
);

const Icons = {
  ArrowUpRight: (props) => <ArrowPath d="M7 17L17 7 M7 7h10v10" {...props} />,

  Play: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  ),

  HubLine: (props) => (
    <ArrowPath d="M12 3l-3.5 5H4l3.5 5-3.5 5h4.5l3.5-5 3.5 5H20l-3.5-5L20 8h-4.5L12 3Z" strokeWidth={1.5} {...props} />
  ),

  MapLine: (props) => (
    <ArrowPath d="M15 5.1 9 3 3 5v16l6-2.1 6 2.1 6-2V3l-6 2.1Zm0 13.8-6-2.1V7.1l6-2.1v13.9Z" strokeWidth={1.5} {...props} />
  ),

  Hub: (props) => <FilledPath d="M12 2 8 8H4l4 6-4 6h4l4-6 4 6h4l-4-6 4-6h-4l-4-6Z" {...props} />,

  Map: (props) => <FilledPath d="M15 5.1 9 3 3 5v16l6-2.1 6 2.1 6-2V3l-6 2.1Zm0 13.8-6-2.1V7.1l6-2.1v13.9Z" {...props} />,

  CheckCircle: (props) => (
    <FilledPath
      d="M22 5.18 10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83L20.59 3.76 22 5.18ZM12 20c-4.42 0-8-3.58-8-8 0-1.57.46-3.03 1.24-4.26l1.46 1.46A5.92 5.92 0 0 0 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-.34-.03-.68-.08-1h2.02c.04.33.06.66.06 1 0 4.42-3.58 8-8 8Z"
      {...props}
    />
  ),

  Grid: (props) => <ArrowPath d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" {...props} />,

  ChartLine: (props) => (
    <ArrowPath d="M3 3v18h18M7 14l4-4 3 3 5-6" strokeWidth={1.5} {...props} />
  ),

  Chat: (props) => (
    <ArrowPath
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10ZM8 9h8M8 12.5h5"
      strokeWidth={1.5}
      {...props}
    />
  ),

  Doc: (props) => (
    <ArrowPath
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M9 13h6M9 17h6"
      strokeWidth={1.5}
      {...props}
    />
  ),

  List: (props) => (
    <ArrowPath d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" {...props} />
  ),

  Bolt: (props) => <ArrowPath d="M13 2 4.5 14H11l-1 8 8.5-12H12l1-8Z" strokeWidth={1.5} {...props} />,

  ArrowLeft: (props) => <ArrowPath d="M19 12H5M11 5l-7 7 7 7" {...props} />,

  Plus: (props) => <ArrowPath d="M12 5v14M5 12h14" {...props} />,

  Check: (props) => <ArrowPath d="M5 12.5l4.5 4.5L19 7" {...props} />,

  X: (props) => <ArrowPath d="M6 6l12 12M18 6 6 18" {...props} />,

  Dots: (props) => <ArrowPath d="M12 5h.01M12 12h.01M12 19h.01" strokeWidth={3} {...props} />,

  Flag: (props) => <ArrowPath d="M5 21V4M5 4h12l-2 3.5L17 11H5" strokeWidth={1.5} {...props} />,

  Refresh: (props) => (
    <ArrowPath d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" strokeWidth={1.5} {...props} />
  ),

  Send: (props) => <ArrowPath d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" strokeWidth={1.5} {...props} />,

  Download: (props) => (
    <ArrowPath d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeWidth={1.5} {...props} />
  ),

  Copy: (props) => (
    <ArrowPath d="M9 9h11v11H9V9ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" strokeWidth={1.5} {...props} />
  ),

  Users: (props) => (
    <ArrowPath
      d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      strokeWidth={1.5}
      {...props}
    />
  ),

  Shield: (props) => (
    <ArrowPath d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4" strokeWidth={1.5} {...props} />
  ),

  Lock: (props) => (
    <ArrowPath d="M5 11h14v10H5V11ZM7 11V7a5 5 0 0 1 10 0v4" strokeWidth={1.5} {...props} />
  ),

  Video: (props) => (
    <ArrowPath d="M23 7l-7 5 7 5V7ZM1 5h15v14H1V5Z" strokeWidth={1.5} {...props} />
  ),

  EyeOff: (props) => (
    <ArrowPath d="M1 1l22 22M22 12s-3 8-10 8-10-8-10-8 3-8 10-8a7.9 7.9 0 0 1 5.8 2.6M9.88 9.88a3 3 0 0 0 4.24 4.24" strokeWidth={1.5} {...props} />
  ),

  UserPlus: (props) => (
    <ArrowPath d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" strokeWidth={1.5} {...props} />
  ),

  Activity: (props) => (
    <ArrowPath d="M22 12h-4l-3 9L9 3l-3 9H2" strokeWidth={1.5} {...props} />
  ),

  Sparkles: (props) => (
    <ArrowPath d="M12 4l1.6 4.6L18.5 10l-4.9 1.4L12 16l-1.6-4.6L5.5 10l4.9-1.4L12 4ZM18.5 14.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" strokeWidth={1.5} {...props} />
  ),

  Settings: (props) => (
    <ArrowPath d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 9 15a1.65 1.65 0 0 0-1-1.51V13a1.65 1.65 0 0 0 1-1.51 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 13 7.4a1.65 1.65 0 0 0 1-1.51V5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1 1.51V11a1.65 1.65 0 0 0-1 1.51Z" strokeWidth={1.5} {...props} />
  ),

  LogOut: (props) => (
    <ArrowPath d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeWidth={1.5} {...props} />
  ),

  Type: (props) => (
    <ArrowPath d="M4 7V5h16v2M9 20h6M12 5v15" strokeWidth={1.5} {...props} />
  ),

  Bold: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-2 3.5 4.5 4.5 0 0 1 4 4.5A4.5 4.5 0 0 1 15.5 20H6z" />
      <path d="M6 8h7M6 16h9" />
    </svg>
  ),

  Glass: (props) => (
    <ArrowPath d="M8 2h8l4 8-8 12L4 10l4-8Z M4 10h16" strokeWidth={1.5} {...props} />
  ),

  Palette: (props) => (
    <ArrowPath d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM16 11.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8 11.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" strokeWidth={1.5} {...props} />
  ),
};

window.Icons = Icons;
