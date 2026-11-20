import { useId } from "react";

// Discovery glyphs from the reviewed Expressive marks.mjs.
// SHA-256 79c54b3337e9db821d2afbc7ca0ff0261d499a2eb2bfdd40dce7361796d3c263.
const paths = {
  "find": "M14 3a10 10 0 1 0 0 20 10 10 0 1 0 0-20ZM21 21l8 8M8 15l4-5 3 5 4-4",
  "filter": "M4 8h24M4 16h24M4 24h24m-18-20v8m14 0v8m-10 0v8",
  "pin": "M16 28S8 20 8 14a8 8 0 1 1 16 0c0 6-8 14-8 14Zm0-11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "arrow": "M5 16h21m-8-8 8 8-8 8",
  "info": "M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm0 10v8m0-13h.1",
  "chevron": "m7 12 9 9 9-9"
} as const;

export function SignatureIcon({ name, directional = false }: {
  name: keyof typeof paths; directional?: boolean;
}) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" width={20} height={20}
      fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
      data-signature-directional={directional || undefined}>
      <path fillRule="evenodd" d={paths[name]} />
    </svg>
  );
}

export function CareSignal() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const fold = `expressive-fold-${id}`;
  const ridge = `expressive-ridge-${id}`;
  return (
    <svg viewBox="0 0 373 240" aria-hidden="true">
      <defs>
        <linearGradient id={fold}><stop stopColor="#6240b8"/><stop offset=".6" stopColor="#17142b"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
        <linearGradient id={ridge} x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#6240b8" stopOpacity=".16"/></linearGradient>
      </defs>
      <g fill={`url(#${fold})`} stroke="#a78bfa" strokeOpacity=".7">
        <path d="M53 159C52 86 128 71 167 44c61-42 129-29 151 22 51 117-62 91-95 138-37 49-169 42-170-45Z"/>
      </g>
      <g fill="none" stroke={`url(#${ridge})`} strokeWidth="1.3">
        <path d="M40 160C39 84 116 68 158 40c66-45 142-39 167 23 50 121-59 101-95 144-39 48-186 55-190-47Z"/>
        <path d="M32 161C31 81 105 68 150 34c67-50 155-44 183 25 50 127-60 110-98 154-45 50-200 53-203-52Z"/>
        <path d="M23 163C18 78 96 63 144 29c72-53 167-48 196 25 54 134-59 117-99 162-45 52-215 57-218-53Z"/>
        <path d="M69 159c4-60 77-76 111-98 46-30 94-18 113 26 34 79-55 83-84 119-36 44-145 27-140-47Z"/>
        <path d="M83 156c6-52 71-67 101-90 40-30 83-14 99 29 20 60-50 78-82 108-37 34-122 24-118-47Z"/>
      </g>
        <path d="M159 117h28v-28h11v28h28v11h-28v28h-11v-28h-28Z" fill="#ffb88b"/>
        <circle cx="302" cy="74" r="6" fill="#ffb88b"/>
        <path d="M303 62v-17m12 28h24" stroke="#ffb88b" strokeOpacity=".68"/>
    </svg>
  );
}
