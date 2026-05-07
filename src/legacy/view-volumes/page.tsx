// import React, { useState } from "react";
// import { CanvasWithControls } from "@/features/view-3d/components/CanvasWithControls";
// import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
// import { SmallTimeline } from "@/features/playback/SmallTimeline";
// import { VolumeScene } from "./VolumeScene";

// export function ViewVolumes() {
//   /**
//    * Displacement scales
//    */
//   const [scale, setScale] = useState(1);
//   const [displacementScale, setDisplacementScale] = useState(1);

//   function handleScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
//     setScale(parseFloat(e.target.value));
//   }
//   function handleDisplacementScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
//     setDisplacementScale(parseFloat(e.target.value));
//   }

//   return (
//     <div className="flex min-h-0 flex-1 flex-col">
//       <ResizablePanelGroup direction="vertical">
//         <ResizablePanel className="flex min-h-0 flex-1 flex-col">
//           <div className="relative h-full w-full">
//             <CanvasWithControls>
//               <VolumeScene scale={scale} displacementScale={displacementScale} />
//             </CanvasWithControls>

//             <div className="absolute right-0 bottom-0 left-0 flex w-full justify-between border-t-2 border-neutral-300 bg-neutral-200/80 p-2 backdrop-blur-sm">
//               <div className="flex items-center gap-2">
//                 <label className="flex gap-2 whitespace-nowrap">
//                   <input
//                     type="range"
//                     min="0"
//                     max={1}
//                     step={0.1}
//                     value={scale}
//                     onChange={handleScaleChange}
//                     className="w-full"
//                   />
//                   Scale: {scale.toFixed(2)}
//                 </label>
//                 <label className="flex gap-2 whitespace-nowrap">
//                   <input
//                     type="range"
//                     min="0"
//                     max={20}
//                     step={0.1}
//                     value={displacementScale}
//                     onChange={handleDisplacementScaleChange}
//                     className="w-full"
//                   />
//                   XZ: {displacementScale.toFixed(2)}
//                 </label>
//               </div>
//             </div>
//           </div>
//         </ResizablePanel>

//         <ResizableHandle withHandle />
//         <ResizablePanel defaultSize={30} minSize={20}>
//           <div className="h-1/2 border-b-2 border-neutral-300">
//             <SmallTimeline />
//           </div>
//           <div className="h-1/2">{/* <InterstoryDriftChart /> */}</div>
//         </ResizablePanel>
//       </ResizablePanelGroup>
//     </div>
//   );
// }
