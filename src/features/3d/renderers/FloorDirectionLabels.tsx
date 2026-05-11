import { useGlobalStore } from "@/state";
import { Text } from "@react-three/drei";

const SCENE_LABEL_FONT = "/Atkinson_Hyperlegible_Next/AtkinsonHyperlegibleNext-VariableFont_wght.ttf";
const SCENE_LABEL_CHARACTERS = "+-XYNESW";

export function FloorDirectionLabels() {
  const colorTheme = useGlobalStore((s) => s.colorTheme);

  return (
    <>
      <Text
        position={[0, 116, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        +Y
      </Text>
      <Text
        position={[0, -116, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, Math.PI]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        -Y
      </Text>
      <Text
        position={[116, 0, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, -Math.PI / 2]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        +X
      </Text>
      <Text
        position={[-116, 0, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        -X
      </Text>

      {/* Diagonal Direction indicators */}
      <Text
        position={[100, 100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, -Math.PI / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        NE
      </Text>
      <Text
        position={[-100, 100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, Math.PI / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        NW
      </Text>
      <Text
        position={[100, -100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, (-3 * Math.PI) / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        SE
      </Text>
      <Text
        position={[-100, -100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, (3 * Math.PI) / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        SW
      </Text>
    </>
  );
}
