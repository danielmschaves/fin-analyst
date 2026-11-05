import { describe, expect, it } from 'vitest';
import { assetIndex } from '@/lib/mock/assets';
import { looksLikeTicker, resolveCommand, searchAssets } from '@/lib/search';

describe('busca da barra de comando', () => {
  it('reconhece tickers da B3', () => {
    expect(looksLikeTicker('VALE3')).toBe(true);
    expect(looksLikeTicker('taee11')).toBe(true);
    expect(looksLikeTicker('vale')).toBe(false);
  });

  it('ticker exato vem primeiro; nome sem acento também encontra', () => {
    expect(searchAssets(assetIndex, 'vale3')[0]?.ticker).toBe('VALE3');
    expect(searchAssets(assetIndex, 'itausa')[0]?.ticker).toBe('ITSA4');
    expect(searchAssets(assetIndex, 'csn')[0]?.ticker).toBe('CSNA3');
    expect(searchAssets(assetIndex, 'mineracao')[0]?.ticker).toBe('CMIN3');
  });

  it('ticker navega; texto livre vai para o assistente', () => {
    expect(resolveCommand(assetIndex, 'VALE3')).toEqual({ kind: 'asset', ticker: 'VALE3' });
    expect(resolveCommand(assetIndex, 'bbas3')).toEqual({ kind: 'asset', ticker: 'BBAS3' });
    expect(resolveCommand(assetIndex, 'por que fiquei abaixo do CDI?')).toEqual({
      kind: 'ask',
      question: 'por que fiquei abaixo do CDI?',
    });
    expect(resolveCommand(assetIndex, '  ')).toEqual({ kind: 'none' });
  });
});
