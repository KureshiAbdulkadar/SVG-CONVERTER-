import { ImageType } from './vector-engine/types';

export interface SampleItem {
  id: string;
  name: string;
  category: ImageType;
  description: string;
  thumbnail: string;
  generateDataUrl: () => string;
}

export const SAMPLE_IMAGES: SampleItem[] = [
  {
    id: 'tech-logo',
    name: 'Apex Robotics Logo',
    category: 'logo',
    description: 'Crisp geometric brand mark with sharp 45° angles and dual corporate colors',
    thumbnail: '⚡ Apex Logo',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);

      // Primary Hexagon
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.moveTo(200, 70);
      ctx.lineTo(310, 135);
      ctx.lineTo(310, 265);
      ctx.lineTo(200, 330);
      ctx.lineTo(90, 265);
      ctx.lineTo(90, 135);
      ctx.closePath();
      ctx.fill();

      // Inner Cutout / Accent Shape
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(200, 120);
      ctx.lineTo(270, 160);
      ctx.lineTo(270, 240);
      ctx.lineTo(200, 280);
      ctx.lineTo(130, 240);
      ctx.lineTo(130, 160);
      ctx.closePath();
      ctx.fill();

      // Core lightning bolt
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(215, 140);
      ctx.lineTo(165, 210);
      ctx.lineTo(195, 210);
      ctx.lineTo(185, 260);
      ctx.lineTo(235, 190);
      ctx.lineTo(205, 190);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL('image/png');
    },
  },
  {
    id: 'modern-icon',
    name: 'Cosmic Compass Icon',
    category: 'icon',
    description: 'High-contrast app symbol designed for 24px/32px grid snapping',
    thumbnail: '🧭 Compass Icon',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Dark circle back
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(150, 150, 130, 0, Math.PI * 2);
      ctx.fill();

      // Outer gold ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(150, 150, 100, 0, Math.PI * 2);
      ctx.stroke();

      // Compass North Arrow (Crimson)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(150, 60);
      ctx.lineTo(175, 150);
      ctx.lineTo(150, 135);
      ctx.closePath();
      ctx.fill();

      // Compass North-West
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(150, 60);
      ctx.lineTo(125, 150);
      ctx.lineTo(150, 135);
      ctx.closePath();
      ctx.fill();

      // Compass South Arrow (Silver)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(150, 240);
      ctx.lineTo(175, 150);
      ctx.lineTo(150, 165);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(150, 240);
      ctx.lineTo(125, 150);
      ctx.lineTo(150, 165);
      ctx.closePath();
      ctx.fill();

      // Center pivot pin
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(150, 150, 12, 0, Math.PI * 2);
      ctx.fill();

      return canvas.toDataURL('image/png');
    },
  },
  {
    id: 'ink-sketch',
    name: 'Botanical Leaf Sketch',
    category: 'sketch',
    description: 'Hand-drawn ink style with delicate branch contours and varying line pressure',
    thumbnail: '🌿 Ink Sketch',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, 400, 400);

      ctx.strokeStyle = '#1e293b';
      ctx.fillStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Main Stem
      ctx.beginPath();
      ctx.moveTo(80, 340);
      ctx.quadraticCurveTo(180, 260, 320, 80);
      ctx.stroke();

      // Leaves
      const drawLeaf = (cx: number, cy: number, angle: number, size: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(size * 0.6, -size * 0.4, size, 0);
        ctx.quadraticCurveTo(size * 0.6, size * 0.4, 0, 0);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      drawLeaf(140, 280, -0.6, 60);
      drawLeaf(170, 240, 0.7, 70);
      drawLeaf(210, 190, -0.7, 65);
      drawLeaf(250, 150, 0.8, 60);
      drawLeaf(290, 110, -0.5, 50);
      drawLeaf(320, 80, 0.4, 40);

      return canvas.toDataURL('image/png');
    },
  },
  {
    id: 'organic-photo',
    name: 'Monarch Butterfly',
    category: 'photo',
    description: 'Multi-color organic specimen with intricate wing veins and vibrant orange gradients',
    thumbnail: '🦋 Monarch Art',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 450;
      canvas.height = 350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 450, 350);

      // Left Wing Orange Field
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(170, 160, 90, 110, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Right Wing Orange Field
      ctx.beginPath();
      ctx.ellipse(280, 160, 90, 110, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Wing Yellow Highlights
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(160, 140, 50, 60, -0.2, 0, Math.PI * 2);
      ctx.ellipse(290, 140, 50, 60, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Black Vein Borders
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(170, 160, 90, 110, -0.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(280, 160, 90, 110, 0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Butterfly Body
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(225, 175, 12, 65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(225, 105, 10, 0, Math.PI * 2);
      ctx.fill();

      // White Spots on Wing Margins
      ctx.fillStyle = '#ffffff';
      const spots = [
        [100, 120], [90, 160], [105, 200], [130, 240],
        [350, 120], [360, 160], [345, 200], [320, 240]
      ];
      for (const [sx, sy] of spots) {
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas.toDataURL('image/png');
    },
  },
  {
    id: 'retro-illustration',
    name: 'Sunset Mountain Crest',
    category: 'illustration',
    description: 'Stylized layered landscape vector with depth tiers and sunset palette',
    thumbnail: '🌄 Mountain Art',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Sunset Sun
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(200, 200, 120, 0, Math.PI * 2);
      ctx.fill();

      // Distant Ridge (Purple)
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(40, 320);
      ctx.lineTo(130, 190);
      ctx.lineTo(210, 250);
      ctx.lineTo(290, 160);
      ctx.lineTo(360, 320);
      ctx.closePath();
      ctx.fill();

      // Mid Ridge (Pink/Magenta)
      ctx.fillStyle = '#db2777';
      ctx.beginPath();
      ctx.moveTo(50, 340);
      ctx.lineTo(160, 220);
      ctx.lineTo(240, 290);
      ctx.lineTo(340, 200);
      ctx.lineTo(360, 340);
      ctx.closePath();
      ctx.fill();

      // Foreground Dark Mountain (Navy)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(30, 360);
      ctx.lineTo(190, 240);
      ctx.lineTo(260, 300);
      ctx.lineTo(370, 360);
      ctx.closePath();
      ctx.fill();

      // Sharp White Snow Peak on Foreground Crest
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(190, 240);
      ctx.lineTo(210, 260);
      ctx.lineTo(198, 255);
      ctx.lineTo(190, 265);
      ctx.lineTo(182, 255);
      ctx.lineTo(170, 260);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL('image/png');
    },
  },
];
