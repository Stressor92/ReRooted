import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Position, ReactFlowProvider, type Edge, type Node } from '@xyflow/react';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { EdgeData, PersonNodeData, TreeData } from '../../api/tree';
import { usePersons } from '../../hooks/usePersons';
import { useTree } from '../../hooks/useTree';
import type { QuickAddState } from '../persons/forms/QuickAddPopover';
import PersonPanel, { type PersonPanelTab } from '../persons/PersonPanel';
import TreeCanvas from './TreeCanvas';
import { getHandleIdsForRelationshipEdge } from './connectionHandles';
import { applyDagreLayout, getGenerationMap } from './useLayout';

type FlowNode = Node<PersonNodeData, 'person'>;
type FlowEdge = Edge<EdgeData, 'partner' | 'child'>;

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class TreeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Tree render failed', error, info);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rerooted-centered-state">
          <div className="rerooted-state-card">
            <strong>Tree could not be rendered.</strong>
            <span>Please reload the page and try again.</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function toFlowNodes(
  tree: TreeData,
  layoutDir: 'TB' | 'LR',
  gendersById: Map<string, PersonNodeData['gender']>,
): FlowNode[] {
  const sourcePosition = layoutDir === 'LR' ? Position.Right : Position.Bottom;
  const targetPosition = layoutDir === 'LR' ? Position.Left : Position.Top;

  return tree.nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      gender: gendersById.get(node.id) ?? node.data.gender ?? null,
      generation: node.data.generation ?? 0,
    },
    draggable: false,
    sourcePosition,
    targetPosition,
  }));
}

function toFlowEdges(tree: TreeData, layoutDir: 'TB' | 'LR'): FlowEdge[] {
  return tree.edges.map((edge) => ({
    ...edge,
    ...getHandleIdsForRelationshipEdge(edge.type, layoutDir),
    animated: false,
  }));
}

function TreePageContent() {
  const { data, isPending, error, refetch } = useTree();
  const { data: persons = [] } = useQuery(usePersons());
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PersonPanelTab>('info');
  const [layoutDir, setLayoutDir] = useState<'TB' | 'LR'>('TB');
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [externalQuickAddState, setExternalQuickAddState] = useState<QuickAddState>(null);

  const gendersById = useMemo(
    () => new Map(persons.map((person) => [person.id, person.gender ?? null] as const)),
    [persons],
  );
  const flowNodes = useMemo(() => (data ? toFlowNodes(data, layoutDir, gendersById) : []), [data, layoutDir, gendersById]);
  const flowEdges = useMemo(() => (data ? toFlowEdges(data, layoutDir) : []), [data, layoutDir]);
  const layoutedNodes = useMemo(() => {
    const positioned = applyDagreLayout(flowNodes, flowEdges, layoutDir) as FlowNode[];
    const generationMap = getGenerationMap(flowNodes, flowEdges);
    const maxGeneration = Math.max(0, ...generationMap.values());

    return positioned.map((node) => ({
      ...node,
      data: {
        ...node.data,
        generation: Math.max(0, maxGeneration - (generationMap.get(node.id) ?? 0)),
      },
    }));
  }, [flowNodes, flowEdges, layoutDir, layoutVersion]);

  if (isPending) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="rerooted-centered-state">
        <div className="rerooted-state-card">
          <strong>Backend connection failed.</strong>
          <span>{error instanceof Error ? error.message : 'Unknown error'}</span>
          <button type="button" className="rerooted-template-button" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rerooted-tree-page">
      <ReactFlowProvider>
        <TreeCanvas
          nodes={layoutedNodes}
          edges={flowEdges}
          selectedPersonId={selectedPersonId}
          layoutDir={layoutDir}
          externalQuickAddState={externalQuickAddState}
          onExternalQuickAddHandled={() => setExternalQuickAddState(null)}
          onChangeLayoutDir={setLayoutDir}
          onRelayout={() => setLayoutVersion((current) => current + 1)}
          onSelectPerson={(personId) => {
            setSelectedPersonId(personId);
            if (personId) {
              setActiveTab('info');
            }
          }}
        />
      </ReactFlowProvider>

      <AnimatePresence initial={false}>
        {selectedPersonId ? (
          <PersonPanel
            key={selectedPersonId}
            personId={selectedPersonId}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            onClose={() => setSelectedPersonId(null)}
            onCreateRelative={(kind) => {
              if (!selectedPersonId) {
                return;
              }

              setExternalQuickAddState({
                position: {
                  x: Math.max(window.innerWidth / 2 - 150, 24),
                  y: Math.max(window.innerHeight / 2 - 140, 84),
                },
                preset: {
                  sourceNodeId: selectedPersonId,
                  relationshipKind: kind,
                  sourceHandleType: kind === 'parent' ? 'target' : kind === 'partner' || kind === 'sibling' ? null : 'source',
                },
              });
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function TreePage() {
  return (
    <TreeErrorBoundary>
      <TreePageContent />
    </TreeErrorBoundary>
  );
}
