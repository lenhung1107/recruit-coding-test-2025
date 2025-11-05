import { describe, expect, it } from 'vitest';
import { aggregate, parseLines } from './core.js';

describe('Q2 core', () => {
  it('parseLines: skips broken rows', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/a,200,100',
      'broken,row,only,three',
    ]);
    expect(rows.length).toBe(1);
  });

  // 基本的な集計のテスト
  it('aggregate basic', () => {
    const lines = [
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120',
      '2025-01-03T10:13:00Z,u2,/api/orders,200,180',
      '2025-01-03T11:00:00Z,u3,/api/users,200,90',
      '2025-01-04T00:10:00Z,u1,/api/orders,200,110',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-31',
      tz: 'jst',
      top: 2,
    });
    expect(result).toEqual([
      { date: '2025-01-03', path: '/api/orders', count: 2, avgLatency: 150 },
      { date: '2025-01-03', path: '/api/users', count: 1, avgLatency: 90 },
      { date: '2025-01-04', path: '/api/orders', count: 1, avgLatency: 110 },
    ]);
  });

  // from/to 範囲でフィルタリングを確認
  it('filters by from/to inclusive', () => {
    const lines = [
      '2025-01-01T00:00:00Z,u1,/api/orders,200,100',
      '2025-01-31T23:59:59Z,u2,/api/orders,200,200',
      '2025-02-01T00:00:00Z,u3,/api/orders,200,300',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-31',
      tz: 'ict',
      top: 5,
    });
    expect(result).toHaveLength(2);
  });

  // タイムゾーン変換の確認（UTC→JST/ICT）
  it('converts timezone correctly (UTC→JST/ICT)', () => {
    const lines = [
      '2025-01-03T23:00:00Z,u1,/api/orders,200,100', // +9h → 2025-01-04 JST
      '2025-01-03T23:00:00Z,u1,/api/orders,200,100', // +7h → 2025-01-04 ICT
    ];

    const jst = aggregate(lines.slice(0, 1), {
      from: '2025-01-03',
      to: '2025-01-04',
      tz: 'jst',
      top: 1,
    });
    expect(jst[0].date).toBe('2025-01-04');

    const ict = aggregate(lines.slice(1), {
      from: '2025-01-03',
      to: '2025-01-04',
      tz: 'ict',
      top: 1,
    });
    expect(ict[0].date).toBe('2025-01-04');
  });
});
