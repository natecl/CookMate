---
name: illustration-quality
description: Use when modifying illustration prompts, updating the STYLE_PREFIX, changing image generation logic in illustrationService.ts, or when generated cooking illustrations look poor and need prompt improvements
---

# Illustration Quality

## Overview

Guide for generating high-quality cooking illustrations via Gemini 2.5 Flash Image (aka "Nano Banana"). The model's strength is deep language understanding — describe scenes narratively, not as keyword lists.

## When to Use

- Editing `STYLE_PREFIX` or image generation prompts in `illustrationService.ts`
- Debugging poor illustration output (distorted, ugly, inconsistent)
- Adding new illustration types or scenes
- Updating motion frame prompts for GIF animations
- When a user reports illustrations don't match expected quality

## Reference Standard

Five reference images in `screenshots/` define the quality bar:

| Reference | Key Traits |
|-----------|-----------|
| Cucumber on cutting board (iStock) | Clean vector, 3D isometric perspective, soft gradients, natural shadows, professional editorial |
| Fried rice in wok (GIF) | Textured editorial, warm earthy palette, pencil grain texture, dynamic composition, floating ingredients |
| Mixing bowl with whisk | Simple charming line art, muted pastels, minimal detail, warm beige background |
| Hands cutting tomatoes | Top-down perspective, flat vector, warm saturated colors, hands showing technique |
| Man cooking soup | Flat vector character, minimal shadows, clean geometric shapes, warm palette |

**Common thread**: Warm color palettes, clean confident shapes, professional composition, instructional clarity.

## Prompt Engineering Rules

### Structure

Prompts must be **narrative paragraphs**, not keyword lists. Gemini responds best to descriptive scene-setting.

**Bad**: `"flat cartoon cooking illustration, clean vector art, knife cutting cucumber, white background"`

**Good**: `"A warm, inviting cooking illustration in a clean editorial vector style. A wooden cutting board sits at a slight isometric angle, with a whole cucumber being sliced into even rounds by a chef's knife. The style uses soft gradients, natural shadows, and a warm earthy color palette of greens, browns, and creams. No text or labels. The composition is centered and instructional, like a premium cookbook illustration."`

### Required Elements in Every Prompt

1. **Style anchor**: "clean editorial vector illustration" or "warm flat vector cooking art"
2. **Color direction**: Reference the warm palette — earthy browns, greens, creams, terracotta, gold
3. **Composition**: Specify angle (isometric, top-down, 3/4 view) and framing
4. **Mood**: "warm, inviting, instructional, like a premium cookbook"
5. **Negative constraint**: "No text, no labels, no watermarks, no photorealistic rendering"

### Resolution & Format

- Request specific output: `"Output at 1K resolution in 1:1 aspect ratio"`
- Use `responseModalities: ['IMAGE']` for image-only output
- For maximum quality, specify: `"high detail, sharp edges, clean line work"`

### Scene-Specific Guidance

| Scene Type | Prompt Focus |
|-----------|-------------|
| **Cutting/Slicing** | Show the cutting board at an angle, knife mid-action, visible sliced pieces, grain of the wood |
| **Mixing/Stirring** | Bowl with visible contents, utensil in motion, ingredients in various states of being combined |
| **Pouring/Drizzling** | Liquid stream with transparency, source container tilted, receiving vessel below |
| **Heating/Cooking** | Pan/pot on surface, steam or heat indicators, food changing color/state |
| **Kneading/Rolling** | Hands on dough (or show dough being worked), flour-dusted surface, dough texture |
| **Plating** | Arranged food on plate, garnishes, clean plate rim, appetizing presentation |

## Critique Checklist

Evaluate every generated illustration against these criteria:

| Criterion | Pass | Fail |
|-----------|------|------|
| **Proportions** | Objects are realistically sized relative to each other | Knife bigger than cutting board, tiny vegetables |
| **Perspective** | Consistent angle throughout the scene | Mixed perspectives, objects floating |
| **Color warmth** | Earthy, warm tones (browns, greens, creams, terracotta) | Cold blues, neon colors, muddy grays |
| **Line quality** | Clean, confident strokes with consistent weight | Wobbly, scratchy, or inconsistent lines |
| **Composition** | Clear focal point, balanced layout, instructional clarity | Cluttered, off-center subject, confusing layout |
| **Shadows** | Soft, consistent light direction | No shadows (flat) or contradictory shadow directions |
| **Detail level** | Appropriate detail for the scene (not too sparse, not too busy) | Over-detailed noise or empty/barren scene |
| **Text/artifacts** | No text, labels, watermarks, or UI elements | Any text or watermark present |
| **Style consistency** | Matches the clean vector / editorial illustration aesthetic | Photorealistic, 3D-rendered, or crude cartoon |

## Animation (GIF) Quality Rules

Motion sequences use 3 PNG frames stitched into a GIF at 900ms per frame.

### Frame Continuity

- **Same scene, same angle, same style** across all frames — only the action element changes
- Specify in each frame prompt: "Maintain identical background, lighting, color palette, and camera angle as the previous frame"
- Describe motion progression clearly: "beginning of action", "midway through action", "action nearly complete"

### Frame Prompt Template

```
Frame [N] of 3: [Stage description]. [Full scene description with style].
The scene shows [specific action state]. Maintain identical background,
lighting, camera angle, and art style across all frames. Only the
[moving element] changes position. Warm editorial vector style,
no text or labels.
```

### Common Animation Failures

| Problem | Fix |
|---------|-----|
| Style shifts between frames | Add "identical art style to previous frames" to each prompt |
| Background changes | Describe the exact same background in every frame prompt |
| Object proportions drift | Specify exact object sizes/positions in each frame |
| Color palette inconsistency | List the exact colors in every frame prompt |

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Keyword-list prompts | Generic, lifeless output | Use narrative paragraphs describing the scene |
| No color direction | Cold or random palette | Always specify "warm earthy palette" |
| Missing perspective | Inconsistent angles | State the camera angle explicitly |
| "Simple" or "basic" in prompt | Model produces crude output | Use "clean", "refined", "editorial" instead |
| No negative constraints | Text/watermarks appear | Always include "no text, no labels, no watermarks" |
| Vague action description | Static, unclear illustration | Describe the exact moment and technique being shown |

## Quick Reference

```
Model:       gemini-2.5-flash-image (Nano Banana)
Canvas:      320x320px (current), can request 1K for higher quality
Formats:     PNG (still), GIF (3 frames @ 900ms)
Style:       Clean editorial vector, warm palette, instructional
Palette:     Browns, greens, creams, terracotta, gold — NO cold blues or neons
Angles:      Isometric, top-down, or 3/4 view
Must have:   Style anchor, color direction, composition, mood, negative constraints
Must avoid:  Keyword lists, "simple/basic", missing perspective, no color guidance
```
