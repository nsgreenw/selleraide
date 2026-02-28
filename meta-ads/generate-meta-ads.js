#!/usr/bin/env node
/**
 * Generate Meta ad images via Gemini (nano-banana-pro-preview)
 * Uses generateContent API (same as working TikTok pipeline)
 * Square format for Meta feed ads
 */
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync('/Users/admin/ai/selleraide/tiktok-marketing/config.json', 'utf-8'));
const apiKey = config.imageGen.apiKey;
const model = config.imageGen.model || 'nano-banana-pro-preview';

const prompts = [
  {
    dir: 'angle-1-hidden-score',
    file: 'ad1-phone-score.png',
    prompt: 'Photorealistic close-up of a hand holding a smartphone. The screen shows a large red number 34 with a circular progress gauge. Dark moody background with dramatic lighting. The phone screen glows, casting light on the hand. Professional product photography style. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-1-hidden-score',
    file: 'ad2-before-after.png',
    prompt: 'Photorealistic split-screen product photography. Left side: a dim laptop showing a messy e-commerce product listing with red warning indicators. Right side: the same laptop brightly lit showing a clean professional listing with green success indicators. Dark background, dramatic contrast between the two sides. Warm gold ambient lighting on the right side. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-2-suppression',
    file: 'ad1-invisible.png',
    prompt: 'Photorealistic shot of a frustrated online seller staring at a laptop screen in a dark room. The laptop screen shows search results where one product listing is visually fading away, becoming transparent and invisible. Red warning glow from the screen illuminating the face. Cinematic lighting, moody atmosphere. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-2-suppression',
    file: 'ad2-warning.png',
    prompt: 'Photorealistic close-up of a laptop screen showing an e-commerce seller dashboard with multiple red warning indicators and a product listing marked with a red suppressed badge. The screen casts a harsh red glow on the desk surface. A coffee cup sits untouched nearby. Dark dramatic anxiety-inducing mood. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-3-competitor',
    file: 'ad1-sidebyside.png',
    prompt: 'Photorealistic overhead shot of a desk with two phones side by side. Left phone shows a product listing with very few reviews and a dull product photo. Right phone shows a similar product with hundreds of reviews and a premium product photo. The right phone has subtle gold ambient light around it. Dark desk surface, clean composition. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-3-competitor',
    file: 'ad2-scoregap.png',
    prompt: 'Photorealistic shot of a wide monitor displaying two side-by-side quality dashboards. Left dashboard shows a red score of 31 with warning indicators. Right dashboard shows a green score of 88 with all checkmarks green. The green side glows warmly. Dark office environment, professional workspace. Dramatic contrast between red and green sides. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-4-roi',
    file: 'ad1-burning-money.png',
    prompt: 'Photorealistic shot of a laptop showing an advertising campaign dashboard with declining performance graphs and high spend numbers. Next to the laptop, scattered dollar bills with a subtle orange glow suggesting money being wasted. Dark moody office setting. Cinematic lighting with warm and cold contrast. Square composition 1:1 aspect ratio.'
  },
  {
    dir: 'angle-4-roi',
    file: 'ad2-fix-first.png',
    prompt: 'Photorealistic shot of a clean modern desk with a laptop showing an upward-trending sales graph in green. Next to it, a phone displays a quality score of 92 in a green circular gauge. Gold ambient lighting, successful and optimistic mood. Clean minimal and premium feel. Dark background with warm gold accents. Square composition 1:1 aspect ratio.'
  }
];

async function generate(p) {
  const outPath = path.join('/Users/admin/ai/selleraide/meta-ads', p.dir, p.file);
  console.log(`Generating ${p.dir}/${p.file}...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${p.prompt}\n\nOutput requirements: square image 1:1 aspect ratio, high realism, no text overlay, no watermark, no logos.` }]
      }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    })
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    console.log(`  ❌ API Error: ${data?.error?.message || `HTTP ${res.status}`}`);
    return;
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find(p => p.inlineData?.data);
  if (!inline?.inlineData?.data) {
    console.log(`  ❌ No image data returned`);
    return;
  }

  fs.writeFileSync(outPath, Buffer.from(inline.inlineData.data, 'base64'));
  console.log(`  ✅ ${p.file}`);
}

async function main() {
  for (const p of prompts) {
    await generate(p);
  }
  console.log('\nDone! All images at /Users/admin/ai/selleraide/meta-ads/');
}

main();
