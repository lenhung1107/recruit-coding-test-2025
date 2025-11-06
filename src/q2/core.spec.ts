/* eslint-disable max-lines-per-function */
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

  // 入力データが正しい形式であることを確認
  it('parseLines: skips invalid input rows', () => {
    const lines = [
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120',
      'invalid-timestamp,u2,/api/orders,200,150',
      '2025-01-03T11:00:00Z,u3,/api/users,200,abc',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-31',
      tz: 'jst',
      top: 5,
    });
    expect(result).toEqual([
      { date: '2025-01-03', path: '/api/orders', count: 1, avgLatency: 120 },
    ]);
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
  it('filterByDate: filters by from/to inclusive', () => {
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
  it('filterByDate: returns empty array when all rows are out of range', () => {
    const lines = [
      '2024-12-31T23:59:59Z,u1,/api/orders,200,100',
      '2025-02-01T00:00:00Z,u2,/api/orders,200,200',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-31',
      tz: 'jst',
      top: 3,
    });
    expect(result).toHaveLength(0);
  });

  // タイムゾーン変換の確認（UTC→JST/ICT）
  it('toTZDate: converts timezone correctly (UTC→JST/ICT)', () => {
    const lines = [
      '2025-01-03T23:00:00Z,u1,/api/orders,200,100',
      '2025-01-03T23:00:00Z,u1,/api/orders,200,100',
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

  // top N 集計の確認
  it('rankTop: top N per date and storing stable order', () => {
    const lines = [
      '2025-01-03T10:00:00Z,u1,/api/orders,200,100',
      '2025-01-03T10:10:00Z,u2,/api/users,200,100',
      '2025-01-03T10:20:00Z,u3,/api/users,200,100',
      '2025-01-04T10:00:00Z,u4,/api/patients,200,100',
      '2025-01-04T10:10:00Z,u5,/api/patients,200,100',
      '2025-01-04T10:20:00Z,u6,/api/doctors,200,100',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-31',
      tz: 'jst',
      top: 1,
    });
    expect(result).toEqual([
      { date: '2025-01-03', path: '/api/users', count: 2, avgLatency: 100 },
      { date: '2025-01-04', path: '/api/patients', count: 2, avgLatency: 100 },
    ]);
  });

  // 出力順序のテスト：
  // 最終結果は「date 昇順 → count 降順 → path 昇順」でソートされることを確認する
  it('sorts final output by date asc, count desc, path asc', () => {
    const lines = [
      '2025-01-03T10:00:00Z,u1,/api/orders,200,100',
      '2025-01-03T10:10:00Z,u2,/api/users,200,100',
      '2025-01-03T10:00:00Z,u3,/api/patients,200,100',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-31',
      tz: 'jst',
      top: 5,
    });
    expect(result.map((r) => r.path)).toEqual([
      '/api/orders',
      '/api/patients',
      '/api/users',
    ]);
  });
});
