import * as THREE from '../../libs/three/three.module.js';
import { STLExporter } from '../../libs/three/STLExporter.js';

export function exportSTL(sourceObject, filename, {
    rotateForPrint = true,
    rotation = { x: Math.PI / 2, y: 0, z: 0 },
    centerXY = true,
    placeOnBed = true,
    binary = false
} = {}) {
    if (!sourceObject || !sourceObject.isObject3D) {
        throw new TypeError('A valid Three.js Object3D is required for STL export.');
    }

    const exportObject = sourceObject.clone(true);

    exportObject.traverse((child) => {
        if (!child.isMesh) return;
        if (child.geometry) child.geometry = child.geometry.clone();
        if (Array.isArray(child.material)) {
            child.material = child.material.map((material) => material.clone());
        } else if (child.material) {
            child.material = child.material.clone();
        }
    });

    if (rotateForPrint) {
        exportObject.rotation.x += rotation.x || 0;
        exportObject.rotation.y += rotation.y || 0;
        exportObject.rotation.z += rotation.z || 0;
    }

    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(exportObject);
    if (!bounds.isEmpty()) {
        const center = bounds.getCenter(new THREE.Vector3());
        exportObject.position.add(new THREE.Vector3(
            centerXY ? -center.x : 0,
            centerXY ? -center.y : 0,
            placeOnBed ? -bounds.min.z : 0
        ));
    }

    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    const exporter = new STLExporter();
    const stlData = exporter.parse(exportObject, { binary });
    const blob = new Blob([stlData], { type: 'model/stl' });
    const safeName = String(filename || 'vekmaker-model.stl').trim();
    const finalName = safeName.toLowerCase().endsWith('.stl') ? safeName : `${safeName}.stl`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    exportObject.traverse((child) => {
        if (!child.isMesh) return;
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
        } else {
            child.material?.dispose();
        }
    });
}
