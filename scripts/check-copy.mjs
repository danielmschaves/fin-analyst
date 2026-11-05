#!/usr/bin/env node
// Bloqueia linguagem de recomendação nos textos da interface.
// Uso: node scripts/check-copy.mjs [dir ...]  (padrão: apps/web/app apps/web/components)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TERMS = [
  'compre',
  'comprem',
  'comprar agora',
  'vender',
  'venda agora',
  'venda já',
  'oportunidade',
  'recomendamos',
  'recomenda-se',
];

// Limites de palavra com suporte a acentos (o \b do JS não conhece "á").
export const FORBIDDEN = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${TERMS.join('|')})(?![\\p{L}\\p{N}_])`,
  'giu',
);

// Trechos permitidos: o disclaimer e os rótulos de colunas do relatório B3.
export const ALLOWLIST = [
  'A classificação é quantitativa, calculada a partir de dados públicos, e não é recomendação de compra ou venda.',
  'Não recomenda compra ou venda.',
  'Quantidade (Venda)',
  'Preço Médio (Venda)',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.mdx', '.json']);

export function findViolations(text) {
  let cleaned = text;
  for (const allowed of ALLOWLIST) cleaned = cleaned.split(allowed).join(' ');
  const violations = [];
  const lines = cleaned.split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(FORBIDDEN)) {
      violations.push({ line: index + 1, term: match[0] });
    }
  });
  return violations;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(full))) yield full;
  }
}

export function checkDirs(dirs, root = process.cwd()) {
  const problems = [];
  for (const dir of dirs) {
    const abs = resolve(root, dir);
    try {
      statSync(abs);
    } catch {
      continue;
    }
    for (const file of walk(abs)) {
      for (const v of findViolations(readFileSync(file, 'utf8'))) {
        problems.push({ file: relative(root, file), ...v });
      }
    }
  }
  return problems;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const dirs = process.argv.slice(2);
  const problems = checkDirs(dirs.length ? dirs : ['apps/web/app', 'apps/web/components'], root);
  if (problems.length) {
    console.error('Linguagem de recomendação encontrada:');
    for (const p of problems) console.error(`  ${p.file}:${p.line}  "${p.term}"`);
    process.exit(1);
  }
  console.log('copy-check: nenhum termo de recomendação encontrado.');
}
