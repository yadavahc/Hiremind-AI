// React Three Fiber (v8) augments the *global* JSX namespace, but React 19's
// @types/react removed it. Re-declare the intrinsic elements so <mesh>, <points>,
// <bufferGeometry>… type-check under the React 19 JSX transform.
import "@react-three/fiber";
import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
