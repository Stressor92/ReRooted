import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import { memo, useState, type CSSProperties } from 'react';
import type { EdgeData } from '../../api/tree';

const EDGE_STYLES: Record<string, CSSProperties> = {
  biological: { stroke: 'var(--edge-biological)', strokeWidth: 2 },
  marriage: { stroke: 'var(--edge-marriage)', strokeWidth: 2.5 },
  divorced: { stroke: 'var(--edge-divorced)', strokeWidth: 1.5, strokeDasharray: '8 4' },
  adoption: { stroke: 'var(--edge-adoption)', strokeWidth: 2, strokeDasharray: '6 3' },
  foster: { stroke: 'var(--edge-foster)', strokeWidth: 1.5, strokeDasharray: '4 4' },
  unknown: { stroke: 'var(--edge-unknown)', strokeWidth: 1, strokeDasharray: '2 4' },
};

const NODE_W = 160;
const NODE_H = 164;

type FamilyFlowEdge = Edge<EdgeData, 'partner' | 'child'>;

function resolveEdgeStyle(edgeType: 'partner' | 'child', relType?: string): CSSProperties {
  if (relType === 'adoption') {
    return EDGE_STYLES.adoption;
  }

  if (relType === 'foster') {
    return EDGE_STYLES.foster;
  }

  if (relType === 'ex' || relType === 'divorced') {
    return EDGE_STYLES.divorced;
  }

  if (relType === 'unknown') {
    return EDGE_STYLES.unknown;
  }

  return edgeType === 'partner' ? EDGE_STYLES.marriage : EDGE_STYLES.biological;
}

function formatTypeLabel(edgeType: 'partner' | 'child', relType?: string): string {
  if (edgeType === 'child') {
    switch (relType) {
      case 'adoption':
        return 'Adoption';
      case 'foster':
        return 'Pflegekind';
      case 'unknown':
        return 'Unbekannt';
      default:
        return 'Biologisches Kind';
    }
  }

  switch (relType) {
    case 'partner':
      return 'Partner';
    case 'ex':
      return 'Getrennt';
    case 'adoption':
      return 'Adoption';
    case 'foster':
      return 'Pflege';
    case 'unknown':
      return 'Unbekannt';
    default:
      return 'Beziehung';
  }
}

function formatDate(value?: string): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('de-DE');
}

const FamilyEdge = memo(function FamilyEdge({
  id,
  type,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps<FamilyFlowEdge>) {
  const [hovered, setHovered] = useState(false);

  const isPartnerEdge = type === 'partner';
  const useHorizontalPartnerAnchors = isPartnerEdge && sourcePosition === 'bottom' && targetPosition === 'top';
  const sourceIsLeft = sourceX <= targetX;
  const partnerSourceX = sourceIsLeft ? sourceX + NODE_W / 2 : sourceX - NODE_W / 2;
  const partnerTargetX = sourceIsLeft ? targetX - NODE_W / 2 : targetX + NODE_W / 2;
  const partnerCenterY = (sourceY + targetY) / 2;

  const [edgePath, labelX, labelY] = useHorizontalPartnerAnchors
    ? getStraightPath({
        sourceX: partnerSourceX,
        sourceY: partnerCenterY,
        targetX: partnerTargetX,
        targetY: partnerCenterY,
      })
    : isPartnerEdge
      ? getStraightPath({ sourceX, sourceY, targetX, targetY })
      : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const mergedStyle: CSSProperties = {
    ...resolveEdgeStyle(type === 'partner' ? 'partner' : 'child', data?.rel_type),
    ...(data?.dashed ? { strokeDasharray: '6 3' } : null),
    animation: 'rerooted-edge-draw 0.55s ease both',
    ...style,
  };

  const period = [formatDate(data?.start_date), formatDate(data?.end_date)].filter(Boolean).join(' – ');

  return (
    <>
      <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <BaseEdge id={id} path={edgePath} style={mergedStyle} />
        <path d={edgePath} fill="none" stroke="transparent" strokeWidth={16} />
      </g>

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            left: labelX,
            top: labelY,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'all',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            className="rerooted-edge-label rerooted-edge-label-button"
            style={{ opacity: hovered ? 1 : 0.85 }}
            onClick={() => data?.onEditRelationship?.()}
          >
            {formatTypeLabel(type === 'partner' ? 'partner' : 'child', data?.rel_type)}
          </button>
          <div
            className="rerooted-edge-meta"
            style={{ opacity: hovered ? 1 : 0, transform: `translateY(${hovered ? '0px' : '4px'})` }}
          >
            {period ? `${period} · Bearbeiten` : 'Bearbeiten'}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

export default FamilyEdge;
