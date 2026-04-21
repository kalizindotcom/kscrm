/**
 * Message interpolation utilities for campaign messages.
 *
 *  - Variables:  {{nome}}, {{primeiro_nome}}, {{telefone}}, {{campo_customizado}}
 *                Missing keys render as empty string (no "{{foo}}" literal leaks).
 *
 *  - Spintax:    {a|b|c}  → randomly picks one, recursively (nested supported).
 *                Escape literal "{" with "\{".
 */

type Vars = Record<string, unknown>;

const VAR_RE = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g;
const SPIN_RE = /\{([^{}]*?)\}/; // innermost brace group (no nested braces)

export function interpolate(template: string, vars: Vars = {}): string {
  if (!template) return '';

  // 1. spintax (resolve innermost groups repeatedly)
  let out = template;
  // temporarily protect escaped braces
  out = out.replace(/\\\{/g, '\u0001').replace(/\\\}/g, '\u0002');

  // Limit iterations to avoid pathological inputs
  for (let i = 0; i < 100; i++) {
    const m = SPIN_RE.exec(out);
    if (!m) break;
    const inner = m[1];
    if (inner.includes('|')) {
      const parts = inner.split('|');
      const pick = parts[Math.floor(Math.random() * parts.length)];
      out = out.slice(0, m.index) + pick + out.slice(m.index + m[0].length);
    } else {
      // leave alone — it's not spintax (single choice), strip braces to avoid re-match
      out = out.slice(0, m.index) + '\u0003' + inner + '\u0004' + out.slice(m.index + m[0].length);
    }
  }
  out = out.replace(/\u0003/g, '{').replace(/\u0004/g, '}');
  out = out.replace(/\u0001/g, '{').replace(/\u0002/g, '}');

  // 2. variables
  out = out.replace(VAR_RE, (_m, key: string) => {
    const v = readPath(vars, key);
    return v === undefined || v === null ? '' : String(v);
  });

  return out;
}

function readPath(vars: Vars, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(vars, path)) return vars[path];
  // simple dot-path (vars.extra.nome) — optional
  const segs = path.split('.');
  let cur: any = vars;
  for (const s of segs) {
    if (cur && typeof cur === 'object' && s in cur) cur = cur[s];
    else return undefined;
  }
  return cur;
}
