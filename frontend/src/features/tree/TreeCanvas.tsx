import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../../api/client';
import type { CreatePersonResult } from '../../hooks/useCreatePerson';
import {
  useAddChild,
  useCreateRelationship,
  type RelationshipCreateInput,
} from '../../hooks/useRelationshipMutations';
import { useCanvasSearch } from '../../hooks/useCanvasSearch';
import { useContextMenu } from '../../hooks/useContextMenu';
import { useCustomDesign } from '../../hooks/useCustomDesign';
import { useTemplate } from '../../hooks/useTemplate';
import { useToastStore } from '../../hooks/useToast';
import EmptyState from '../../components/EmptyState';
import CanvasToolbar from '../../components/CanvasToolbar';
import ContextMenu from '../../components/ContextMenu';
import CustomDesignPanel from '../../design/CustomDesignPanel';
import type { EdgeData, PersonNodeData } from '../../api/tree';
import QuickAddPopover, {
  type QuickAddPreset,
  type QuickAddState,
} from '../persons/forms/QuickAddPopover';
import RelationshipDialog, {
  type RelationshipDialogState,
} from '../persons/forms/RelationshipDialog';
import FamilyEdge from './FamilyEdge';
import PersonNode from './PersonNode';
import { getQuickAddPresetFromHandle, isPartnerConnection } from './connectionHandles';

const nodeTypes = { person: PersonNode };
const edgeTypes = { partner: FamilyEdge, child: FamilyEdge };

type FlowNode = Node<PersonNodeData, 'person'>;
type FlowEdge = Edge<EdgeData, 'partner' | 'child'>;

type TreeCanvasProps = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedPersonId: string | null;
  layoutDir: 'TB' | 'LR';
  externalQuickAddState?: QuickAddState;
  onExternalQuickAddHandled?: () => void;
  onChangeLayoutDir: (dir: 'TB' | 'LR') => void;
  onRelayout: () => void;
  onSelectPerson: (personId: string | null) => void;
};

type ConnectEndState = {
  isValid?: boolean | null;
  fromNode?: { id: string } | null;
  fromHandle?: { id?: string | null; type?: string | null } | null;
};

type RelationshipRecord = {
  id: string;
  person1_id: string;
  person2_id?: string | null;
  rel_type: 'partner' | 'ex' | 'sibling' | 'adoption' | 'foster' | 'unknown';
  start_date?: string | null;
  end_date?: string | null;
  child_ids: string[];
};

type MiniMapPersonNodeProps = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  strokeColor?: string;
  selected?: boolean;
  onClick?: (event: ReactMouseEvent<SVGGElement>, id: string) => void;
};

function relationshipTypeFromRelType(
  relType: RelationshipRecord['rel_type'],
  edgeType: FlowEdge['type'],
): 'partner' | 'ex' | 'sibling' | 'biological' | 'adoption' | 'foster' | 'unknown' {
  if (relType === 'partner' && edgeType === 'child') {
    return 'biological';
  }

  return relType;
}

function findMatchingRelationship(edge: FlowEdge, relationships: RelationshipRecord[]): RelationshipRecord | undefined {
  if (edge.type === 'partner') {
    return relationships.find((relationship) => {
      const parents = [relationship.person1_id, relationship.person2_id].filter(Boolean);
      return parents.includes(edge.source) && parents.includes(edge.target);
    });
  }

  return relationships.find((relationship) => {
    const parents = [relationship.person1_id, relationship.person2_id].filter(Boolean);
    return parents.includes(edge.source) && relationship.child_ids.includes(edge.target);
  });
}

function getPointerPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('changedTouches' in event && event.changedTouches[0]) {
    return {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
    };
  }

  if ('touches' in event && event.touches[0]) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  return {
    x: (event as MouseEvent).clientX,
    y: (event as MouseEvent).clientY,
  };
}

function getCenteredQuickAddPosition(): { x: number; y: number } {
  return {
    x: Math.max(window.innerWidth / 2 - 150, 24),
    y: Math.max(window.innerHeight / 2 - 140, 84),
  };
}

function getPersonInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.trim().toUpperCase() || '?';
}

function getRelationshipStateFromPreset(
  result: CreatePersonResult,
  preset?: QuickAddPreset,
): RelationshipDialogState {
  if (!preset) {
    return null;
  }

  if (preset.relationshipKind === 'partner' || (preset.relationshipKind === 'sibling' && !preset.relationshipId)) {
    return {
      sourceNodeId: preset.sourceNodeId,
      targetNodeId: result.person.id,
      mode: 'partner',
      preferredType: preset.relationshipKind === 'sibling' ? 'sibling' : 'partner',
    };
  }

  if (preset.relationshipKind === 'parent') {
    return {
      sourceNodeId: result.person.id,
      targetNodeId: preset.sourceNodeId,
      mode: 'parent',
      preferredType: 'biological',
    };
  }

  return {
    sourceNodeId: preset.sourceNodeId,
    targetNodeId: result.person.id,
    mode: 'child',
    preferredType: 'biological',
  };
}

function buildDefaultRelationshipFromPreset(
  result: CreatePersonResult,
  preset?: QuickAddPreset,
): RelationshipCreateInput | null {
  if (!preset || (preset.relationshipKind === 'sibling' && preset.relationshipId)) {
    return null;
  }

  if (preset.relationshipKind === 'partner' || preset.relationshipKind === 'sibling') {
    const relType: RelationshipCreateInput['rel_type'] =
      preset.relationshipKind === 'sibling' ? 'sibling' : 'partner';

    return {
      person1_id: preset.sourceNodeId,
      person2_id: result.person.id,
      rel_type: relType,
      child_ids: [],
    };
  }

  if (preset.relationshipKind === 'parent') {
    return {
      person1_id: result.person.id,
      person2_id: null,
      rel_type: 'partner' as const,
      child_ids: [preset.sourceNodeId],
    };
  }

  return {
    person1_id: preset.sourceNodeId,
    person2_id: null,
    rel_type: 'partner' as const,
    child_ids: [result.person.id],
  };
}

export default function TreeCanvas({
  nodes,
  edges,
  selectedPersonId,
  layoutDir,
  externalQuickAddState,
  onExternalQuickAddHandled,
  onChangeLayoutDir,
  onRelayout,
  onSelectPerson,
}: TreeCanvasProps) {
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);
  const addChild = useAddChild();
  const createRelationship = useCreateRelationship();
  const backgroundType = useTemplate((state) => state.backgroundType);
  const showCustomPanel = useCustomDesign((state) => state.showPanel);
  const [quickAddState, setQuickAddState] = useState<QuickAddState>(null);
  const [relationshipState, setRelationshipState] = useState<RelationshipDialogState>(null);
  const { menu, onNodeContextMenu, closeMenu } = useContextMenu();
  const { query, setQuery, matchedIds, activeMatchId, focusMatch, resultCount } = useCanvasSearch(nodes);
  const fitViewOptions = useMemo(
    () => ({
      padding: 0.12,
      minZoom: 0.6,
      maxZoom: 1.05,
      duration: 280,
    }),
    [],
  );
  const minimapInitials = useMemo(
    () => new Map(nodes.map((node) => [node.id, getPersonInitials(node.data.first_name, node.data.last_name)])),
    [nodes],
  );
  const MiniMapPersonNode = useCallback(
    ({ id, x, y, width, height, color, strokeColor, selected, onClick }: MiniMapPersonNodeProps) => {
      const initials = minimapInitials.get(id) ?? '?';
      const cx = x + width / 2;
      const cy = y + height / 2;
      const radius = Math.max(42, Math.min(width, height) * 0.34);

      return (
        <g onClick={(event) => onClick?.(event, id)} style={{ cursor: onClick ? 'pointer' : 'default' }}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={selected ? 'var(--accent)' : (color ?? 'var(--accent)')}
            stroke={selected ? 'var(--node-name-color)' : (strokeColor ?? 'var(--node-border)')}
            strokeWidth={selected ? 8 : 6}
            opacity={0.96}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: selected ? '#08110A' : 'var(--node-name-color)',
              fontSize: Math.max(radius * 0.9, 34),
              fontWeight: 800,
              letterSpacing: '-0.04em',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {initials}
          </text>
        </g>
      );
    },
    [minimapInitials],
  );

  const openQuickAdd = useCallback((state?: QuickAddState) => {
    setQuickAddState(
      state ?? {
        position: getCenteredQuickAddPosition(),
      },
    );
    closeMenu();
  }, [closeMenu]);

  useEffect(() => {
    if (!externalQuickAddState) {
      return;
    }

    openQuickAdd(externalQuickAddState);
    onExternalQuickAddHandled?.();
  }, [externalQuickAddState, onExternalQuickAddHandled, openQuickAdd]);

  const handleContextMenu = useCallback<NodeMouseHandler<FlowNode>>(
    (event, node) => {
      onSelectPerson(node.id);
      onNodeContextMenu(event, node);
    },
    [onNodeContextMenu, onSelectPerson],
  );

  const handleDeletePerson = useCallback(
    async (personId: string) => {
      closeMenu();
      if (selectedPersonId === personId) {
        onSelectPerson(null);
      }

      try {
        await apiClient.delete(`/persons/${personId}`);
        await queryClient.invalidateQueries({ queryKey: ['tree'] });
        await queryClient.invalidateQueries({ queryKey: ['persons'] });
        addToast({ type: 'success', message: 'Person gelöscht.' });
      } catch (error) {
        addToast({ type: 'error', message: `Person konnte nicht gelöscht werden: ${getApiErrorMessage(error)}` });
      }
    },
    [addToast, closeMenu, onSelectPerson, queryClient, selectedPersonId],
  );

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedPersonId,
        style: {
          ...(node.style ?? {}),
          opacity: matchedIds === null || matchedIds.has(node.id) ? 1 : 0.2,
          transition: 'opacity 200ms ease, transform 200ms ease, box-shadow 200ms ease',
          boxShadow: node.id === activeMatchId ? '0 0 0 2px var(--accent), 0 12px 40px rgba(0,0,0,0.4)' : undefined,
        },
      })),
    [activeMatchId, matchedIds, nodes, selectedPersonId],
  );

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    const partnerConnection = isPartnerConnection(connection);

    setRelationshipState({
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      mode: partnerConnection ? 'partner' : 'child',
      preferredType: partnerConnection ? 'partner' : 'biological',
    });
  }, []);

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: ConnectEndState) => {
      if (!connectionState.isValid && connectionState.fromNode) {
        const preset = getQuickAddPresetFromHandle(connectionState.fromHandle);

        openQuickAdd({
          position: getPointerPosition(event),
          preset: {
            sourceNodeId: connectionState.fromNode.id,
            sourceHandleType: preset.sourceHandleType,
            relationshipKind: preset.relationshipKind,
          },
        });
      }
    },
    [openQuickAdd],
  );

  const openSiblingQuickAdd = useCallback(
    async (nodeId: string) => {
      const relationships = await apiClient
        .get('/relationships', { params: { person_id: nodeId } })
        .then((response) => response.data as RelationshipRecord[]);

      const parentRelationship = relationships.find((relationship) => relationship.child_ids.includes(nodeId));
      openQuickAdd({
        position: menu ? { x: menu.x, y: menu.y } : getCenteredQuickAddPosition(),
        preset: {
          sourceNodeId: nodeId,
          relationshipKind: 'sibling',
          sourceHandleType: parentRelationship ? 'source' : null,
          relationshipId: parentRelationship?.id ?? null,
        },
      });
    },
    [addToast, menu, openQuickAdd],
  );

  const handleEditRelationship = useCallback(
    async (edge: FlowEdge) => {
      try {
        const relationships = await apiClient
          .get('/relationships', { params: { person_id: edge.source } })
          .then((response) => response.data as RelationshipRecord[]);

        const relationship = findMatchingRelationship(edge, relationships);
        if (!relationship) {
          addToast({ type: 'error', message: 'Beziehung konnte nicht geladen werden.' });
          return;
        }

        setRelationshipState({
          relationshipId: relationship.id,
          sourceNodeId: relationship.person1_id,
          targetNodeId: relationship.person2_id ?? edge.target,
          mode: 'edit',
          preferredType: relationshipTypeFromRelType(relationship.rel_type, edge.type),
          startDate: relationship.start_date ?? '',
          endDate: relationship.end_date ?? '',
        });
      } catch (error) {
        addToast({ type: 'error', message: `Beziehung konnte nicht geladen werden: ${getApiErrorMessage(error)}` });
      }
    },
    [addToast],
  );

  const decoratedEdges = useMemo<FlowEdge[]>(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: {
          rel_type: edge.data?.rel_type ?? 'unknown',
          dashed: edge.data?.dashed,
          start_date: edge.data?.start_date,
          end_date: edge.data?.end_date,
          onEditRelationship: () => void handleEditRelationship(edge),
        },
      })),
    [edges, handleEditRelationship],
  );

  const backgroundConfig =
    backgroundType === 'lines'
      ? { variant: BackgroundVariant.Lines, gap: 24, size: 1 }
      : backgroundType === 'lines-dense'
        ? { variant: BackgroundVariant.Lines, gap: 14, size: 1 }
        : backgroundType === 'cross'
          ? { variant: BackgroundVariant.Cross, gap: 28, size: 1 }
          : backgroundType === 'dots-dense'
            ? { variant: BackgroundVariant.Dots, gap: 12, size: 0.9 }
            : backgroundType === 'dots-large'
              ? { variant: BackgroundVariant.Dots, gap: 26, size: 1.8 }
              : { variant: BackgroundVariant.Dots, gap: 18, size: 1.2 };

  useEffect(() => {
    if (!nodesInitialized || decoratedNodes.length === 0) {
      return;
    }

    const handle = window.requestAnimationFrame(() => {
      void fitView({
        nodes: decoratedNodes,
        ...fitViewOptions,
      });
    });

    return () => window.cancelAnimationFrame(handle);
  }, [decoratedNodes, fitView, fitViewOptions, nodesInitialized]);

  return (
    <div className={`rerooted-tree-shell${selectedPersonId ? ' is-panel-open' : ''}${showCustomPanel ? ' is-custom-panel-open' : ''}`}>
      <div className="rerooted-flow-area">
        <ReactFlow<FlowNode, FlowEdge>
          nodes={decoratedNodes}
          edges={decoratedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={fitViewOptions}
          minZoom={0.2}
          maxZoom={1.5}
          onNodeClick={(_event, node) => onSelectPerson(node.id)}
          onNodeContextMenu={handleContextMenu}
          onConnect={handleConnect}
          onConnectEnd={handleConnectEnd}
          onPaneClick={() => {
            onSelectPerson(null);
            closeMenu();
            setQuickAddState(null);
            setRelationshipState(null);
          }}
          style={{ background: 'var(--canvas-bg)', width: '100%', height: 'calc(100vh - 16px)', minHeight: '560px' }}
          proOptions={{ hideAttribution: true }}
        >
          {backgroundType !== 'none' ? (
            <Background
              id="rerooted-bg"
              variant={backgroundConfig.variant}
              gap={backgroundConfig.gap}
              size={backgroundConfig.size}
              color="var(--canvas-dot-color)"
            />
          ) : null}
          <Controls position="bottom-left" />
          <CanvasToolbar
            layoutDir={layoutDir}
            query={query}
            resultCount={resultCount}
            onQueryChange={setQuery}
            onFocusMatch={focusMatch}
            onOpenQuickAdd={() => openQuickAdd()}
            onChangeLayoutDir={onChangeLayoutDir}
            onRelayout={onRelayout}
          />
        </ReactFlow>

        {nodes.length === 0 ? (
          <div className="rerooted-empty-overlay">
            <EmptyState onCreateFirstPerson={() => openQuickAdd()} onImportGedcom={() => navigate('/import')} />
          </div>
        ) : null}
      </div>

      <AnimatePresence>{showCustomPanel ? <CustomDesignPanel /> : null}</AnimatePresence>

      <ContextMenu
        menu={menu}
        onAddChild={(nodeId) =>
          openQuickAdd({
            position: menu ? { x: menu.x, y: menu.y } : getCenteredQuickAddPosition(),
            preset: { sourceNodeId: nodeId, relationshipKind: 'child', sourceHandleType: 'source' },
          })
        }
        onAddPartner={(nodeId) =>
          openQuickAdd({
            position: menu ? { x: menu.x, y: menu.y } : getCenteredQuickAddPosition(),
            preset: { sourceNodeId: nodeId, relationshipKind: 'partner', sourceHandleType: null },
          })
        }
        onAddParent={(nodeId) =>
          openQuickAdd({
            position: menu ? { x: menu.x, y: menu.y } : getCenteredQuickAddPosition(),
            preset: { sourceNodeId: nodeId, relationshipKind: 'parent', sourceHandleType: 'target' },
          })
        }
        onAddSibling={(nodeId) => {
          void openSiblingQuickAdd(nodeId);
        }}
        onOpenDetails={(nodeId) => {
          closeMenu();
          onSelectPerson(nodeId);
        }}
        onDeletePerson={(nodeId) => {
          void handleDeletePerson(nodeId);
        }}
      />

      <QuickAddPopover
        state={quickAddState}
        onClose={() => setQuickAddState(null)}
        onCreated={(result, options) => {
          const nextRelationshipState = getRelationshipStateFromPreset(result, options.preset);
          const defaultRelationship = buildDefaultRelationshipFromPreset(result, options.preset);

          if (options.openPanel || !options.preset) {
            onSelectPerson(result.person.id);
          }

          if (options.preset?.relationshipKind === 'sibling' && options.preset.relationshipId) {
            void addChild.mutateAsync({ relationshipId: options.preset.relationshipId, childId: result.person.id });
            return;
          }

          if (options.preset && !options.openPanel && defaultRelationship) {
            void createRelationship.mutateAsync(defaultRelationship);
            return;
          }

          if (nextRelationshipState) {
            setRelationshipState(nextRelationshipState);
          }
        }}
      />

      <RelationshipDialog state={relationshipState} onClose={() => setRelationshipState(null)} />
    </div>
  );
}
