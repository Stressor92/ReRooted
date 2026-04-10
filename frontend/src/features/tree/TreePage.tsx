import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Position, ReactFlowProvider, type Edge, type Node } from '@xyflow/react';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { EdgeData, PersonNodeData, TreeData } from '../../api/tree';
import { useTree } from '../../hooks/useTree';
import type { QuickAddState } from '../persons/forms/QuickAddPopover';
import PersonPanel, { type PersonPanelTab } from '../persons/PersonPanel';
import TreeCanvas from './TreeCanvas';
import { applyDagreLayout } from './useLayout';

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

function toFlowNodes(tree: TreeData, layoutDir: 'TB' | 'LR'): FlowNode[] {
  const sourcePosition = layoutDir === 'LR' ? Position.Right : Position.Bottom;
  const targetPosition = layoutDir === 'LR' ? Position.Left : Position.Top;

  return tree.nodes.map((node) => ({
    ...node,
    draggable: false,
    sourcePosition,
    targetPosition,
  }));
}

function toFlowEdges(tree: TreeData): FlowEdge[] {
  return tree.edges.map((edge) => ({
    ...edge,
    animated: false,
  }));
}

function TreePageContent() {
  const { data, isPending, error, refetch } = useTree();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PersonPanelTab>('info');
  const [layoutDir, setLayoutDir] = useState<'TB' | 'LR'>('TB');
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [externalQuickAddState, setExternalQuickAddState] = useState<QuickAddState>(null);

  const flowNodes = useMemo(() => (data ? toFlowNodes(data, layoutDir) : []), [data, layoutDir]);
  const flowEdges = useMemo(() => (data ? toFlowEdges(data) : []), [data]);
  const layoutedNodes = useMemo(
    () => applyDagreLayout(flowNodes, flowEdges, layoutDir) as FlowNode[],
    [flowNodes, flowEdges, layoutDir, layoutVersion],
  );

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
                  sourceHandleType: kind === 'parent' ? 'target' : kind === 'partner' ? null : 'source',
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
