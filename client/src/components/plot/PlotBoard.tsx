import OutlineTree from './OutlineTree';
import FlowCanvas from './FlowCanvas';
import ScenePanel from './ScenePanel';

export default function PlotBoard() {
  return (
    <div className="plot">
      <OutlineTree />
      <FlowCanvas />
      <ScenePanel />
    </div>
  );
}
