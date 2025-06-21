// Fixed AvatarViewer.jsx - Ensures lips return to neutral position after speech

import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function AvatarModel({ isSpeaking, visemeData }) {
  const { scene } = useGLTF("/models/avatar.glb");
  const modelRef = useRef();
  const [currentMorphTargets, setCurrentMorphTargets] = useState({});
  
  // Clip below y = 0 (show only upper body)
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.5);

  // Initialize morph targets
  useEffect(() => {
    if (scene) {
      // Log all bones in the model
      scene.traverse((child) => {
        if (child.isBone) {
          // Bone found
        }
      });
      // Log all morph targets in the model
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          // Available morph targets found
          
          // Store original morph target influences
          child.userData.originalMorphTargets = {};
          child.userData.targetMorphTargets = {};
          
          Object.keys(child.morphTargetDictionary).forEach(key => {
            const index = child.morphTargetDictionary[key];
            child.userData.originalMorphTargets[key] = child.morphTargetInfluences[index] || 0;
            child.userData.targetMorphTargets[key] = child.morphTargetInfluences[index] || 0;
          });
        }
      });
    }
  }, [scene]);

  // Reset all morph targets to neutral when speech ends
  useEffect(() => {
    if (scene && !isSpeaking) {
      // Speech ended - resetting morph targets to neutral
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          // Reset all targets to original neutral values
          Object.keys(child.userData.originalMorphTargets || {}).forEach(key => {
            child.userData.targetMorphTargets[key] = child.userData.originalMorphTargets[key];
          });
        }
      });
    }
  }, [scene, isSpeaking]);

  // Update lip sync animation with smoother transitions
  useEffect(() => {
    if (scene && visemeData && isSpeaking) {
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          // Reset all targets to original values first
          Object.keys(child.userData.originalMorphTargets || {}).forEach(key => {
            child.userData.targetMorphTargets[key] = child.userData.originalMorphTargets[key];
          });
          
          if (visemeData.current) {
            // Enhanced viseme mapping with stronger mouth movements
            const visemeMapping = {
              'PP': ['mouthClose', 'mouthFunnel', 'mouthPressLeft', 'mouthPressRight', 'mouthPucker'],
              'FF': ['mouthFrownLeft', 'mouthFrownRight', 'mouthLowerDownLeft', 'mouthLowerDownRight'],
              'TH': ['mouthDimpleLeft', 'mouthDimpleRight', 'tongueOut', 'mouthOpen'],
              'DD': ['mouthSmileLeft', 'mouthSmileRight', 'mouthOpen', 'jawOpen'],
              'kk': ['mouthOpen', 'jawOpen', 'jawForward'],
              'CH': ['mouthShrugUpper', 'mouthShrugLower', 'mouthOpen'],
              'SS': ['mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight'],
              'RR': ['mouthRollUpper', 'mouthRollLower', 'mouthOpen'],
              'aa': ['mouthOpen', 'jawOpen', 'mouthSmileLeft', 'mouthSmileRight'], // Wide open for 'ah' sounds
              'E': ['mouthSmileLeft', 'mouthSmileRight', 'mouthOpen', 'jawOpen'],
              'I': ['mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight'],
              'O': ['mouthFunnel', 'mouthPucker', 'mouthOpen', 'jawOpen'],
              'U': ['mouthFunnel', 'mouthPucker', 'mouthRollUpper', 'mouthRollLower'],
              'sil': [] // Silence - no movement, return to neutral
            };
            
            const currentViseme = visemeData.current;
            const intensity = (visemeData.intensity || 0.5) * 1.8; // Amplify intensity by 1.8x
            
            // Apply the current viseme with amplified intensity
            if (visemeMapping[currentViseme] && currentViseme !== 'sil') {
              visemeMapping[currentViseme].forEach(morphName => {
                if (child.morphTargetDictionary[morphName] !== undefined) {
                  // Use higher intensity values for more pronounced movements
                  const morphIntensity = morphName.includes('Open') || morphName.includes('jaw') 
                    ? Math.min(intensity * 1.2, 1.5) // Extra boost for mouth/jaw opening
                    : intensity;
                  child.userData.targetMorphTargets[morphName] = morphIntensity;
                }
              });
              
              // Add subtle random mouth movement for more natural speech
              const randomIntensity = intensity * (0.8 + Math.random() * 0.4);
              
              // Apply to common mouth morph targets
              ['mouthOpen', 'jawOpen'].forEach(morphName => {
                if (child.morphTargetDictionary[morphName] !== undefined) {
                  child.userData.targetMorphTargets[morphName] = Math.max(
                    child.userData.targetMorphTargets[morphName] || 0,
                    randomIntensity * 0.3
                  );
                }
              });
            }
            // If currentViseme is 'sil' or not found, targets remain at original values (neutral)
          }
        }
      });
    }
  }, [scene, isSpeaking, visemeData]);

  // Smooth morph target interpolation with faster response for better sync
  useFrame((state, delta) => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.userData.targetMorphTargets) {
          Object.keys(child.userData.targetMorphTargets).forEach(key => {
            const index = child.morphTargetDictionary[key];
            if (index !== undefined) {
              const current = child.morphTargetInfluences[index] || 0;
              const target = child.userData.targetMorphTargets[key];
              
              // Use different lerp speeds for closing vs opening mouth
              // Faster closing to prevent stuck-open mouth
              const isClosing = target < current;
              const lerpFactor = isClosing 
                ? Math.min(delta * 15, 1)  // Faster closing
                : Math.min(delta * 12, 1); // Normal opening speed
                
              child.morphTargetInfluences[index] = THREE.MathUtils.lerp(current, target, lerpFactor);
            }
          });
        }
      });
    }
  });

  return (
    <group position={[0, -3, 0]} ref={modelRef}>
      <primitive
        object={scene}
        scale={2}
        onBeforeRender={(renderer) => {
          renderer.clippingPlanes = [clipPlane];
        }}
        onAfterRender={(renderer) => {
          renderer.clippingPlanes = [];
        }}
      />
    </group>
  );
}

export default function AvatarViewer({ isSpeaking, visemeData }) {
  return (
    <div className="h-64 sm:h-80 md:h-96 w-full max-w-full sm:max-w-md">
      <Canvas
        camera={{
          position: [0, 0.5, 2.5],
          fov: 30,
          near: 0.1,
          far: 1000
        }}
        gl={{ localClippingEnabled: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <Environment preset="sunset" />
        <AvatarModel isSpeaking={isSpeaking} visemeData={visemeData} />
        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2}
          minAzimuthAngle={-Math.PI / 6}
          maxAzimuthAngle={Math.PI / 6}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}