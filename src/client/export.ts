import type { DrawResult, DrawnCard, Language, Localized } from '../shared/types';
import { computeGrid } from './grid';
import { resolvedColors, type ThemeColors } from './theme';
import { loc, locAlt } from './util';

export interface ExportContext {
  lang: Language;
  bilingual: boolean;
  t(key: string): string;
}

function bilingualOf(value: Localized | undefined, context: ExportContext): string {
  const primary = loc(value, context.lang);
  const secondary = context.bilingual ? locAlt(value, context.lang) : '';
  return secondary ? `${primary}（${secondary}）` : primary;
}

function orientationOf(context: ExportContext, reversed: boolean): string {
  return context.t(reversed ? 'table.reversedBadge' : 'table.uprightBadge');
}

export function resultToJson(result: DrawResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

function cardSection(drawn: DrawnCard, index: number, context: ExportContext): string {
  const card = drawn.card;
  const meaning = drawn.reversed ? card.reversed : card.upright;
  const question = drawn.reversed ? card.questions.reversed : card.questions.upright;
  const lines: string[] = [];
  lines.push(`## ${index + 1}. ${bilingualOf(drawn.slot.label, context)} — ${bilingualOf(card.word, context)}${card.symbol ? ` ${card.symbol}` : ''}`);
  lines.push('');
  lines.push(`- **${context.t('table.position')}**：${bilingualOf(drawn.slot.label, context)}`);
  lines.push(`- **${context.t('table.slotMeaning')}**：${bilingualOf(drawn.slot.meaning, context)}`);
  lines.push(`- **${context.t('reading.orientation')}**：${orientationOf(context, drawn.reversed)}`);
  lines.push(`- **${context.t('reading.cardMeaning')}**：${bilingualOf(meaning, context)}`);
  if (drawn.slot.question) {
    lines.push(`- **${context.t('table.slotQuestion')}**：${bilingualOf(drawn.slot.question, context)}`);
  }
  lines.push(`- **${context.t('reading.cardQuestion')}**：${bilingualOf(question, context)}`);
  lines.push(`- **${context.t('reading.prompt')}**：${bilingualOf(drawn.prompt, context)}`);
  lines.push('');
  return lines.join('\n');
}

/** Markdown meant to be pasted straight into a novel notebook. */
export function resultToMarkdown(result: DrawResult, context: ExportContext): string {
  const lines: string[] = [];
  lines.push(`# ${loc(result.deckName, context.lang)} · ${loc(result.layoutName, context.lang)}`);
  lines.push('');
  lines.push(`- **${context.t('toolbar.seed')}**：\`${result.seed}\``);
  lines.push(`- **${context.t('toolbar.reversed')}**：${result.reversedProbability}%`);
  lines.push(`- **${context.t('toolbar.deck')}**：${loc(result.deckName, context.lang)} (\`${result.deckId}\`)`);
  lines.push(`- **${context.t('toolbar.layout')}**：${loc(result.layoutName, context.lang)} (\`${result.layoutId}\`)`);
  lines.push(`- **${context.t('toolbar.interpretation')}**：\`${result.interpretationId}\``);
  lines.push(`- **${context.t('table.generated')}**：${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  result.cards.forEach((drawn, index) => {
    lines.push(cardSection(drawn, index, context));
  });
  return lines.join('\n');
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, fileName: string, mime: string): void {
  download(new Blob([text], { type: `${mime};charset=utf-8` }), fileName);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  download(blob, fileName);
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('clipboard unavailable');
}

export interface PngOptions extends ExportContext {
  theme: ThemeColors;
}

const CARD_W = 196;
const CARD_H = 300;
const GAP = 30;
const MARGIN = 56;
const HEADER_H = 176;
const FOOTER_H = 72;
const CJK_FONT = '"Noto Sans SC","Source Han Sans SC","Microsoft YaHei","Hiragino Sans","Yu Gothic",sans-serif';

function font(size: number, weight = '400'): string {
  return `${weight} ${size}px ${CJK_FONT}`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Render the spread into a PNG. Slot x/y drive the placement, reversed words rotate 180°, seed is printed. */
export async function resultToPngBlob(result: DrawResult, options: PngOptions): Promise<Blob> {
  const colors = resolvedColors(options.theme);
  const grid = computeGrid(result.cards.map((drawn) => drawn.slot));
  const width = MARGIN * 2 + grid.cols * CARD_W + (grid.cols - 1) * GAP;
  const height = HEADER_H + grid.rows * CARD_H + (grid.rows - 1) * GAP + FOOTER_H;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(options.t('error.pngFailed'));
  ctx.scale(scale, scale);

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colors.text;
  ctx.font = font(38, '700');
  ctx.fillText(loc(result.deckName, options.lang), MARGIN, 74);

  ctx.fillStyle = colors.muted;
  ctx.font = font(22);
  ctx.fillText(loc(result.layoutName, options.lang), MARGIN, 108);

  ctx.fillStyle = colors.accent;
  ctx.font = font(20, '600');
  ctx.fillText(
    `${options.t('toolbar.seed')}: ${result.seed}   ·   ${options.t('toolbar.reversed')}: ${result.reversedProbability}%`,
    MARGIN,
    146,
  );

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, HEADER_H - 22);
  ctx.lineTo(width - MARGIN, HEADER_H - 22);
  ctx.stroke();

  result.cards.forEach((drawn, index) => {
    const col = grid.col(drawn.slot.x);
    const row = grid.row(drawn.slot.y);
    const x = MARGIN + (col - 1) * (CARD_W + GAP);
    const y = HEADER_H + (row - 1) * (CARD_H + GAP);

    ctx.save();
    ctx.fillStyle = colors.surface;
    roundedRect(ctx, x, y, CARD_W, CARD_H, 16);
    ctx.fill();
    ctx.strokeStyle = drawn.reversed ? colors.accent : colors.border;
    ctx.lineWidth = drawn.reversed ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = colors.muted;
    ctx.font = font(15);
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1}. ${loc(drawn.slot.label, options.lang)}`.slice(0, 22), x + 16, y + 30);

    const word = loc(drawn.card.word, options.lang);
    const altWord = options.bilingual ? locAlt(drawn.card.word, options.lang) : '';

    ctx.save();
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
    if (drawn.reversed) ctx.rotate(Math.PI);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    ctx.font = font(word.length > 4 ? 34 : 44, '700');
    ctx.fillText(word, 0, altWord ? -14 : 0);
    if (altWord) {
      ctx.fillStyle = colors.muted;
      ctx.font = font(20);
      ctx.fillText(altWord, 0, 26);
    }
    ctx.restore();

    if (drawn.card.symbol) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = colors.muted;
      ctx.font = font(20);
      ctx.fillText(drawn.card.symbol, x + CARD_W - 16, y + 30);
    }

    const badgeLabel = orientationOf(options, drawn.reversed);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = font(16, '600');
    ctx.fillStyle = drawn.reversed ? colors.accent : colors.muted;
    ctx.fillText(badgeLabel, x + 16, y + CARD_H - 18);

    ctx.restore();
  });

  const footerY = height - 34;
  ctx.fillStyle = colors.muted;
  ctx.font = font(16);
  ctx.textAlign = 'left';
  ctx.fillText(`${options.t('share.title')} · engine v${result.schemaVersion}`, MARGIN, footerY);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toISOString(), width - MARGIN, footerY);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(options.t('error.pngFailed'));
  return blob;
}
