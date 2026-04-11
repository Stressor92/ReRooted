import { Handle, Position, useStore, type Node, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { resolveApiUrl } from '../../api/client';
import type { PersonNodeData } from '../../api/tree';

type PersonFlowNode = Node<PersonNodeData, 'person'>;

type SizeMode = 'full' | 'compact' | 'micro';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || '?';
}

function formatLifeDates(birthYear: string | null, deathYear: string | null): string {
  const birth = birthYear ? `* ${birthYear}` : '';
  const death = deathYear ? `† ${deathYear}` : '';
  return [birth, death].filter(Boolean).join('  ');
}

function getMode(zoom: number): SizeMode {
  if (zoom >= 0.6) {
    return 'full';
  }

  if (zoom >= 0.3) {
    return 'compact';
  }

  return 'micro';
}

function getStatusColor(isLiving: boolean | null): string {
  if (isLiving === true) {
    return 'var(--status-living)';
  }

  if (isLiving === false) {
    return 'var(--status-deceased)';
  }

  return 'var(--status-unknown)';
}

const PersonNode = memo(function PersonNode({
  data,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
}: NodeProps<PersonFlowNode>) {
  const zoom = useStore((store) => store.transform[2] ?? 1);
  const mode = getMode(zoom);
  const photoSize = mode === 'full' ? 80 : 64;
  const width = mode === 'full' ? 160 : mode === 'compact' ? 120 : 64;
  const label = `${data.first_name} ${data.last_name}`.trim();
  const lifeDates = formatLifeDates(data.birth_year, data.death_year);

  return (
    <motion.div
      className="rerooted-person-node"
      style={
        mode === 'micro'
          ? { width, height: 64, padding: 0, borderRadius: '50%' }
          : { width, minHeight: mode === 'full' ? 164 : 122 }
      }
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 230, damping: 18, mass: 0.7 }}
      title={label}
    >
      <Handle type="target" position={targetPosition} />
      <span className="rerooted-status-dot" style={{ background: getStatusColor(data.is_living) }} />

      {data.profile_image_url ? (
        <img
          className="rerooted-person-photo"
          src={resolveApiUrl(data.profile_image_url) ?? undefined}
          alt={label}
          style={{ width: photoSize, height: photoSize }}
        />
      ) : (
        <div
          className="rerooted-person-photo rerooted-person-photo--fallback"
          style={{ width: photoSize, height: photoSize }}
          aria-label={label}
        >
          {getInitials(data.first_name, data.last_name)}
        </div>
      )}

      {mode !== 'micro' ? <div className="rerooted-person-divider" aria-hidden="true" /> : null}

      {mode !== 'micro' ? (
        <div className="rerooted-person-copy">
          <div className="rerooted-person-name">{label}</div>
          {mode === 'full' && lifeDates ? <div className="rerooted-person-dates">{lifeDates}</div> : null}
        </div>
      ) : null}

      <Handle type="source" position={sourcePosition} />
    </motion.div>
  );
});

export default PersonNode;
