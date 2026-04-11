import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { applyDagreLayout } from './useLayout';

describe('applyDagreLayout', () => {
  it('keeps partners on the same level in TB layout', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'c', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'partner-a-b', source: 'a', target: 'b', type: 'partner' },
      { id: 'child-a-c', source: 'a', target: 'c', type: 'child' },
      { id: 'child-b-c', source: 'b', target: 'c', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const first = layouted.find((node) => node.id === 'a');
    const second = layouted.find((node) => node.id === 'b');

    expect(first?.position.y).toBe(second?.position.y);
  });

  it('keeps each generation on its own height level in TB layout', () => {
    const nodes: Node[] = [
      { id: 'grandpa', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'grandma', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'parent', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'partner', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'child', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'partner-grand', source: 'grandpa', target: 'grandma', type: 'partner' },
      { id: 'grandpa-parent', source: 'grandpa', target: 'parent', type: 'child' },
      { id: 'grandma-parent', source: 'grandma', target: 'parent', type: 'child' },
      { id: 'partner-parent', source: 'parent', target: 'partner', type: 'partner' },
      { id: 'parent-child', source: 'parent', target: 'child', type: 'child' },
      { id: 'partner-child', source: 'partner', target: 'child', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const grandpa = layouted.find((node) => node.id === 'grandpa');
    const grandma = layouted.find((node) => node.id === 'grandma');
    const parent = layouted.find((node) => node.id === 'parent');
    const partner = layouted.find((node) => node.id === 'partner');
    const child = layouted.find((node) => node.id === 'child');

    expect(grandpa?.position.y).toBe(grandma?.position.y);
    expect(parent?.position.y).toBe(partner?.position.y);
    expect((grandpa?.position.y ?? 0) + 200).toBeLessThan(parent?.position.y ?? 0);
    expect((parent?.position.y ?? 0) + 200).toBeLessThan(child?.position.y ?? 0);
  });

  it('keeps same-generation cards from overlapping horizontally in TB layout', () => {
    const nodes: Node[] = [
      { id: 'g1', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'g2', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'g3', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'g4', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'p1', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'p2', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'pair-1', source: 'g1', target: 'g2', type: 'partner' },
      { id: 'pair-2', source: 'g3', target: 'g4', type: 'partner' },
      { id: 'g1-p1', source: 'g1', target: 'p1', type: 'child' },
      { id: 'g2-p1', source: 'g2', target: 'p1', type: 'child' },
      { id: 'g3-p2', source: 'g3', target: 'p2', type: 'child' },
      { id: 'g4-p2', source: 'g4', target: 'p2', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const topRow = layouted
      .filter((node) => node.id.startsWith('g'))
      .sort((left, right) => left.position.x - right.position.x);

    for (let index = 1; index < topRow.length; index += 1) {
      expect(topRow[index].position.x - topRow[index - 1].position.x).toBeGreaterThanOrEqual(160);
    }
  });

  it('keeps unlinked co-parents on the same generation level in TB layout', () => {
    const nodes: Node[] = [
      { id: 'grandma', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'grandpa', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'mother', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'father', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'child', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'grandma-mother', source: 'grandma', target: 'mother', type: 'child' },
      { id: 'grandpa-mother', source: 'grandpa', target: 'mother', type: 'child' },
      { id: 'mother-child', source: 'mother', target: 'child', type: 'child' },
      { id: 'father-child', source: 'father', target: 'child', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const mother = layouted.find((node) => node.id === 'mother');
    const father = layouted.find((node) => node.id === 'father');

    expect(mother?.position.y).toBe(father?.position.y);
  });

  it('keeps the Christine → Kathrin/Astrid branch visually centered in TB layout', () => {
    const nodes: Node[] = [
      { id: 'unknown', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'thomas', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'weidauer', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'astrid', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'christine', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'dirk', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'doreen', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'felix', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'kathrin', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'rita', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'ronja', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'sofie', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'uwe', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'werner', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'dirk-astrid-ex', source: 'dirk', target: 'astrid', type: 'partner' },
      { id: 'astrid-thomas-ex', source: 'astrid', target: 'thomas', type: 'partner' },
      { id: 'kathrin-weidauer-ex', source: 'kathrin', target: 'weidauer', type: 'partner' },
      { id: 'rita-dirk', source: 'rita', target: 'dirk', type: 'child' },
      { id: 'werner-dirk', source: 'werner', target: 'dirk', type: 'child' },
      { id: 'dirk-felix', source: 'dirk', target: 'felix', type: 'child' },
      { id: 'astrid-felix', source: 'astrid', target: 'felix', type: 'child' },
      { id: 'unknown-astrid', source: 'unknown', target: 'astrid', type: 'child' },
      { id: 'christine-astrid', source: 'christine', target: 'astrid', type: 'child' },
      { id: 'astrid-doreen', source: 'astrid', target: 'doreen', type: 'child' },
      { id: 'thomas-doreen', source: 'thomas', target: 'doreen', type: 'child' },
      { id: 'christine-kathrin', source: 'christine', target: 'kathrin', type: 'child' },
      { id: 'kathrin-ronja', source: 'kathrin', target: 'ronja', type: 'child' },
      { id: 'weidauer-ronja', source: 'weidauer', target: 'ronja', type: 'child' },
      { id: 'kathrin-sofie', source: 'kathrin', target: 'sofie', type: 'child' },
      { id: 'weidauer-sofie', source: 'weidauer', target: 'sofie', type: 'child' },
      { id: 'uwe-christine', source: 'uwe', target: 'christine', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const kathrin = layouted.find((node) => node.id === 'kathrin');
    const weidauer = layouted.find((node) => node.id === 'weidauer');
    const ronja = layouted.find((node) => node.id === 'ronja');
    const sofie = layouted.find((node) => node.id === 'sofie');
    const christine = layouted.find((node) => node.id === 'christine');
    const astrid = layouted.find((node) => node.id === 'astrid');
    const uwe = layouted.find((node) => node.id === 'uwe');

    const kathrinFamilyCenter = ((kathrin?.position.x ?? 0) + (weidauer?.position.x ?? 0)) / 2;
    const kathrinChildrenCenter = ((ronja?.position.x ?? 0) + (sofie?.position.x ?? 0)) / 2;
    const christineChildrenCenter = ((astrid?.position.x ?? 0) + (kathrinFamilyCenter ?? 0)) / 2;

    expect(Math.abs(kathrinChildrenCenter - kathrinFamilyCenter)).toBeLessThanOrEqual(120);
    expect(Math.abs(christineChildrenCenter - (christine?.position.x ?? 0))).toBeLessThanOrEqual(128);
    expect((uwe?.position.y ?? 0) + 200).toBeLessThan(christine?.position.y ?? 0);
  });

  it('keeps patchwork hub persons between their partners in TB layout', () => {
    const nodes: Node[] = [
      { id: 'dirk', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'astrid', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'thomas', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'felix', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'doreen', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'mario', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'till', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'romina', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'leonidas', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'dirk-astrid', source: 'dirk', target: 'astrid', type: 'partner' },
      { id: 'astrid-thomas', source: 'astrid', target: 'thomas', type: 'partner' },
      { id: 'dirk-felix', source: 'dirk', target: 'felix', type: 'child' },
      { id: 'astrid-felix', source: 'astrid', target: 'felix', type: 'child' },
      { id: 'astrid-doreen', source: 'astrid', target: 'doreen', type: 'child' },
      { id: 'thomas-doreen', source: 'thomas', target: 'doreen', type: 'child' },
      { id: 'doreen-mario', source: 'doreen', target: 'mario', type: 'partner' },
      { id: 'doreen-till', source: 'doreen', target: 'till', type: 'partner' },
      { id: 'doreen-romina', source: 'doreen', target: 'romina', type: 'child' },
      { id: 'doreen-leonidas', source: 'doreen', target: 'leonidas', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const astrid = layouted.find((node) => node.id === 'astrid');
    const dirk = layouted.find((node) => node.id === 'dirk');
    const thomas = layouted.find((node) => node.id === 'thomas');
    const doreen = layouted.find((node) => node.id === 'doreen');
    const mario = layouted.find((node) => node.id === 'mario');
    const till = layouted.find((node) => node.id === 'till');

    expect((astrid?.position.x ?? 0)).toBeGreaterThan(dirk?.position.x ?? 0);
    expect((astrid?.position.x ?? 0)).toBeLessThan(thomas?.position.x ?? 0);
    expect((doreen?.position.x ?? 0)).toBeGreaterThan(Math.min(mario?.position.x ?? 0, till?.position.x ?? 0));
    expect((doreen?.position.x ?? 0)).toBeLessThan(Math.max(mario?.position.x ?? 0, till?.position.x ?? 0));
  });

  it('keeps production-like patchwork rows from overlapping in TB layout', () => {
    const nodes: Node[] = [
      { id: 'rita', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'werner', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'christine', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'unknown2', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'dirk', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'astrid', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'thomas', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'weidauer', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'kathrin', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'uwe', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'doreen', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'mario', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'till', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'felix', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'ronja', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'sofie', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'romina', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 'leonidas', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 's1', type: 'person', position: { x: 0, y: 0 }, data: {} },
      { id: 's2', type: 'person', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { id: 'rita-werner', source: 'rita', target: 'werner', type: 'partner' },
      { id: 'rita-dirk', source: 'rita', target: 'dirk', type: 'child' },
      { id: 'werner-dirk', source: 'werner', target: 'dirk', type: 'child' },
      { id: 'christine-unknown2', source: 'christine', target: 'unknown2', type: 'partner' },
      { id: 'christine-astrid', source: 'christine', target: 'astrid', type: 'child' },
      { id: 'unknown2-astrid', source: 'unknown2', target: 'astrid', type: 'child' },
      { id: 'christine-kathrin', source: 'christine', target: 'kathrin', type: 'child' },
      { id: 'unknown2-kathrin', source: 'unknown2', target: 'kathrin', type: 'child' },
      { id: 'christine-uwe', source: 'christine', target: 'uwe', type: 'child' },
      { id: 'unknown2-uwe', source: 'unknown2', target: 'uwe', type: 'child' },
      { id: 'dirk-astrid', source: 'dirk', target: 'astrid', type: 'partner' },
      { id: 'astrid-thomas', source: 'astrid', target: 'thomas', type: 'partner' },
      { id: 'dirk-felix', source: 'dirk', target: 'felix', type: 'child' },
      { id: 'astrid-felix', source: 'astrid', target: 'felix', type: 'child' },
      { id: 'astrid-doreen', source: 'astrid', target: 'doreen', type: 'child' },
      { id: 'thomas-doreen', source: 'thomas', target: 'doreen', type: 'child' },
      { id: 'weidauer-kathrin', source: 'weidauer', target: 'kathrin', type: 'partner' },
      { id: 'kathrin-ronja', source: 'kathrin', target: 'ronja', type: 'child' },
      { id: 'weidauer-ronja', source: 'weidauer', target: 'ronja', type: 'child' },
      { id: 'kathrin-sofie', source: 'kathrin', target: 'sofie', type: 'child' },
      { id: 'weidauer-sofie', source: 'weidauer', target: 'sofie', type: 'child' },
      { id: 'doreen-mario', source: 'doreen', target: 'mario', type: 'partner' },
      { id: 'doreen-till', source: 'doreen', target: 'till', type: 'partner' },
      { id: 'doreen-romina', source: 'doreen', target: 'romina', type: 'child' },
      { id: 'mario-romina', source: 'mario', target: 'romina', type: 'child' },
      { id: 'doreen-leonidas', source: 'doreen', target: 'leonidas', type: 'child' },
      { id: 'till-leonidas', source: 'till', target: 'leonidas', type: 'child' },
      { id: 'sofie-s1', source: 'sofie', target: 's1', type: 'child' },
      { id: 'sofie-s2', source: 'sofie', target: 's2', type: 'child' },
    ];

    const layouted = applyDagreLayout(nodes, edges, 'TB');
    const thomas = layouted.find((node) => node.id === 'thomas');
    const weidauer = layouted.find((node) => node.id === 'weidauer');
    const felix = layouted.find((node) => node.id === 'felix');
    const ronja = layouted.find((node) => node.id === 'ronja');

    expect(Math.abs((weidauer?.position.x ?? 0) - (thomas?.position.x ?? 0))).toBeGreaterThanOrEqual(196);
    expect(Math.abs((felix?.position.x ?? 0) - (ronja?.position.x ?? 0))).toBeGreaterThanOrEqual(196);
  });
});
