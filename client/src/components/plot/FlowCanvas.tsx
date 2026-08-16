import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../../store';
import { useUI } from '../../uiStore';
import { collectScenes } from '../../novelUtils';
import type { Novel } from '../../types';

type SceneData = {
  title: string;
  badge: string;
  hasDraft: boolean;
  selected: boolean;
};

function SceneNode({ data }: NodeProps<Node<SceneData>>) {
  return (
    <div className={`flow-node ${data.selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="fn-badge">{data.badge}</div>
      <div className="fn-title">{data.title}</div>
      {data.hasDraft && <div className="fn-draft">✓ 已有正文</div>}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { scene: SceneNode };

const NODE_W = 190;
const SCENE_GAP = 104;
const SECTION_GAP = 270;
const CHAPTER_GAP = 90;

function edge(source: string, target: string, dashed: boolean): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    style: dashed
      ? { stroke: '#4c8dff', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.45 }
      : { stroke: '#3b4b66', strokeWidth: 1.5 },
  };
}

function buildGraph(novel: Novel, selectedSceneId: string | null) {
  const nodes: Node<SceneData>[] = [];
  const edges: Edge[] = [];
  let y = 40;
  let prevChapterLast: string | null = null;

  for (const chapter of novel.chapters) {
    let x = 40;
    let rowHeight = 0;
    const firsts: string[] = [];
    const lasts: string[] = [];

    for (const section of chapter.sections) {
      section.scenes.forEach((scene, sci) => {
        nodes.push({
          id: scene.id,
          type: 'scene',
          position: { x, y: y + sci * SCENE_GAP },
          data: {
            title: scene.title || '（未命名场景）',
            badge: `${chapter.title} · ${section.title}`,
            hasDraft: !!scene.draft && scene.draft.trim().length > 0,
            selected: scene.id === selectedSceneId,
          },
        });
      });
      if (section.scenes.length > 0) {
        firsts.push(section.scenes[0].id);
        lasts.push(section.scenes[section.scenes.length - 1].id);
        for (let i = 1; i < section.scenes.length; i++) {
          edges.push(edge(section.scenes[i - 1].id, section.scenes[i].id, false));
        }
      }
      rowHeight = Math.max(rowHeight, section.scenes.length * SCENE_GAP);
      x += SECTION_GAP;
    }

    // 节与节之间（虚线）
    for (let i = 1; i < lasts.length; i++) {
      edges.push(edge(lasts[i - 1], firsts[i], true));
    }
    // 章与章之间（虚线）
    if (prevChapterLast && firsts.length > 0) {
      edges.push(edge(prevChapterLast, firsts[0], true));
    }
    prevChapterLast = lasts.length > 0 ? lasts[lasts.length - 1] : prevChapterLast;

    y += Math.max(NODE_W, rowHeight) + CHAPTER_GAP;
  }

  return { nodes, edges };
}

export default function FlowCanvas() {
  const novel = useStore((s) => s.novel)!;
  const selectedSceneId = useUI((s) => s.selectedSceneId);
  const selectScene = useUI((s) => s.selectScene);

  const { nodes, edges } = useMemo(
    () => buildGraph(novel, selectedSceneId),
    [novel, selectedSceneId],
  );

  const sceneCount = collectScenes(novel).length;

  return (
    <div className="plot-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => selectScene(node.id)}
        onPaneClick={() => selectScene(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} color="#1f2939" />
        <Controls />
        <MiniMap pannable zoomable nodeColor="#2c3950" maskColor="rgba(8,11,17,0.6)" />
      </ReactFlow>
      {sceneCount === 0 && <div className="flow-empty">还没有场景，请在左侧大纲中添加章节与场景。</div>}
    </div>
  );
}
