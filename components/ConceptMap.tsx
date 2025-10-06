

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, Position, MarkerType, Node } from 'reactflow';
import { ThemeGroup, Collocation } from '../types';
import NodeContextMenu from './NodeContextMenu';
import ThemeNode from './ThemeNode';

interface ConceptMapProps {
  results: ThemeGroup[];
  onThemeDeepDive: (theme: string) => void;
  onCollocationDeepDive: (voce: string) => void;
  onQuiz: (collocation: Collocation) => void;
  onRolePlay: (collocation: Collocation) => void;
  onRenameTheme: (oldName: string, newName: string) => void;
}

const THEME_NODE_WIDTH = 180;
const THEME_NODE_HEIGHT = 50;
const COLLOCATION_NODE_WIDTH = 200;
const COLLOCATION_NODE_HEIGHT = 60;

const ConceptMap: React.FC<ConceptMapProps> = ({ results, onThemeDeepDive, onCollocationDeepDive, onQuiz, onRolePlay, onRenameTheme }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: Node | null;
  }>({ visible: false, x: 0, y: 0, node: null });
  const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const nodeTypes = useMemo(() => ({ themeNode: ThemeNode }), []);

  const toggleThemeCollapse = useCallback((themeId: string) => {
    setCollapsedThemes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(themeId)) {
        newSet.delete(themeId);
      } else {
        newSet.add(themeId);
      }
      return newSet;
    });
  }, []);
  
  const handleRenameRequest = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const handleRenameCommit = useCallback((nodeId: string, newLabel: string) => {
    const oldThemeName = nodeId.replace('theme-', '');
    if (newLabel && oldThemeName !== newLabel) {
        onRenameTheme(oldThemeName, newLabel);
    }
    setEditingNodeId(null);
  }, [onRenameTheme]);


  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges = [];

    const themes = results.filter(g => g.collocazioni.length > 0);
    const numThemes = themes.length;
    const themesPerRow = Math.ceil(Math.sqrt(numThemes)) || 1;
    const themeXSpacing = THEME_NODE_WIDTH + 600;
    const themeYSpacing = THEME_NODE_HEIGHT + 400;

    themes.forEach((group, themeIndex) => {
      const themeNodeId = `theme-${group.tema}`;
      const isCollapsed = collapsedThemes.has(themeNodeId);
      const isEditing = themeNodeId === editingNodeId;
      const themePosition = {
        x: (themeIndex % themesPerRow) * themeXSpacing,
        y: Math.floor(themeIndex / themesPerRow) * themeYSpacing,
      };

      newNodes.push({
        id: themeNodeId,
        data: { 
            label: isCollapsed ? `${group.tema} (+${group.collocazioni.length})` : group.tema, 
            type: 'theme',
            fullData: group,
            isEditing: isEditing,
            onLabelChange: (newLabel: string) => handleRenameCommit(themeNodeId, newLabel),
        },
        position: themePosition,
        type: 'themeNode',
      });

      if (!isCollapsed) {
        const numCollocazioni = group.collocazioni.length;
        const radius = 250 + (numCollocazioni > 5 ? (numCollocazioni - 5) * 15 : 0);

        group.collocazioni.forEach((collocation, collIndex) => {
          const angle = (collIndex / numCollocazioni) * 2 * Math.PI;
          const collocationNodeId = `coll-${group.tema}-${collocation.voce}`;
          const x = themePosition.x + radius * Math.cos(angle);
          const y = themePosition.y + radius * Math.sin(angle);

          newNodes.push({
            id: collocationNodeId,
            data: { label: collocation.voce, type: 'collocation', fullData: collocation },
            position: { x, y },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            type: 'default',
            style: {
              background: 'var(--color-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              width: COLLOCATION_NODE_WIDTH,
              minHeight: COLLOCATION_NODE_HEIGHT,
              padding: '10px',
              textAlign: 'center',
              fontSize: '14px',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--color-text-main)',
            },
          });

          newEdges.push({
            id: `edge-${themeNodeId}-${collocationNodeId}`,
            source: themeNodeId,
            target: collocationNodeId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: 'var(--color-border-hover)', strokeWidth: 1.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: 'var(--color-border-hover)',
            },
          });
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);

  }, [results, setNodes, setEdges, collapsedThemes, editingNodeId, handleRenameCommit]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node: node,
    });
  }, [setContextMenu]);

  const onPaneClick = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
    if(editingNodeId) {
        const editingNode = nodes.find(n => n.id === editingNodeId);
        if (editingNode) {
            handleRenameCommit(editingNodeId, editingNode.data.label);
        }
    }
  }, [setContextMenu, editingNodeId, nodes, handleRenameCommit]);

  return (
    <div className="w-full h-[70vh] bg-slate-50/50 dark:bg-slate-900/20 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-sm relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        minZoom={0.1}
      >
        <Controls />
        <Background gap={16} color="var(--color-border)" />
      </ReactFlow>
      {contextMenu.visible && contextMenu.node && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onThemeDeepDive={onThemeDeepDive}
          onCollocationDeepDive={onCollocationDeepDive}
          onQuiz={onQuiz}
          onClose={onPaneClick}
          onToggleCollapse={toggleThemeCollapse}
          isCollapsed={collapsedThemes.has(contextMenu.node.id)}
          onRolePlay={onRolePlay}
          onRename={handleRenameRequest}
        />
      )}
    </div>
  );
};

export default React.memo(ConceptMap);