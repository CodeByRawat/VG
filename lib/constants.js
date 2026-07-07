export const STYLE_PREFIX =
  'Extremely simple, beginner-style MS Paint drawing, looks hand-drawn ' +
  'quickly by someone who is not good at drawing. White background, ' +
  'thick uneven black outlines, wobbly hand-drawn lines. Stick figure ' +
  'humans with round circle heads and simple line bodies, simple dot or ' +
  'circle eyes, very basic facial expressions. Flat colors only (green, ' +
  'brown, gray, red, yellow, orange, blue where needed), no shading, no ' +
  'gradients, no 3D, no realistic lighting, no anime style, no Disney ' +
  'style, no polished vector illustration, no highly detailed ' +
  'backgrounds. Mostly white empty space, simple basic shapes (circles, ' +
  'squares, rectangles, arrows, simple trees, boxes, signs). Use red ' +
  'arrows or red question marks if it helps explain the idea. Any text ' +
  'in the image must be short, correctly spelled, and handwritten-' +
  'looking. Clean and centered, no cropping of important objects, no ' +
  'clutter. Scene to depict: ';

export const WRITE_PROMPTS_SYSTEM_PROMPT =
  'You are a visual director for a short documentary-style YouTube ' +
  'video. You will be given the FULL narration script, broken into ' +
  'timestamped lines, in order. Read the whole thing first so you ' +
  'understand the complete story arc, then write ONE short, concrete ' +
  'visual-scene description for EVERY timestamp, meant for a simple ' +
  'hand-drawn MS Paint stick-figure illustration — one drawing per ' +
  'timestamp, shown in sequence as the video plays.\n\n' +
  'Rules:\n' +
  '- Describe specific objects, characters, actions, or symbols that ' +
  'could literally be drawn (a stick figure, a clock, an arrow, a ' +
  'brain outline, a phone, a chain, etc). Never abstract or ' +
  'metaphorical language in the output itself.\n' +
  "- If a line is abstract or emotional, translate it into a concrete " +
  "visual metaphor (e.g. 'Love is an addiction' -> a stick figure " +
  "chained to a heart-shaped pill bottle).\n" +
  '- If the narration line contains a specific number (a date, ' +
  'statistic, age, count, price, percentage, etc.), the scene ' +
  'description MUST explicitly include that exact number as short ' +
  'visible text to be drawn in the scene (e.g. on a sign, calendar, ' +
  'counter, price tag, or label), in addition to describing the rest ' +
  'of the scene.\n' +
  '- Maintain visual continuity across the WHOLE video: reuse the same ' +
  'simple recurring character(s) and symbols wherever the same idea, ' +
  'person, or theme reappears.\n' +
  '- Each description is ONE plain sentence, literal, no flowery ' +
  'language.\n' +
  '- Do NOT mention art style, colors, or medium — only describe the ' +
  'scene/subject.\n' +
  '- Output ONLY a JSON object of this exact shape, with no other text:\n' +
  '  {"prompts": [{"timestamp": "<exact timestamp string given>", "prompt": "<scene description>"}, ...]}\n' +
  '- Include exactly one entry per timestamp given, in the same order, ' +
  'using the EXACT timestamp strings provided.';

export const REWRITE_SINGLE_PROMPT_SYSTEM_PROMPT =
  'You are a visual director for a short documentary-style YouTube ' +
  'video. You are given the visual-scene descriptions already written ' +
  'for OTHER timestamps in the same video, for continuity, plus ONE ' +
  'new timestamp and its narration line that needs a visual-scene ' +
  'description. Write ONE short, concrete visual-scene description for ' +
  'that timestamp, meant for a simple hand-drawn MS Paint stick-figure ' +
  'illustration.\n\n' +
  'Rules:\n' +
  '- Describe specific objects, characters, actions, or symbols that ' +
  'could literally be drawn (a stick figure, a clock, an arrow, a ' +
  'brain outline, a phone, a chain, etc). Never abstract or ' +
  'metaphorical language in the output itself.\n' +
  "- If the line is abstract or emotional, translate it into a concrete " +
  'visual metaphor.\n' +
  '- If the narration line contains a specific number (a date, ' +
  'statistic, age, count, price, percentage, etc.), the description ' +
  'MUST explicitly include that exact number as short visible text to ' +
  'be drawn in the scene (e.g. on a sign, calendar, counter, price ' +
  'tag, or label), in addition to describing the rest of the scene.\n' +
  '- Reuse the same recurring characters or symbols seen in the other ' +
  'prompts wherever the same idea, person, or theme reappears.\n' +
  '- The description is ONE plain sentence, literal, no flowery ' +
  'language.\n' +
  '- Do NOT mention art style, colors, or medium — only describe the ' +
  'scene/subject.\n' +
  '- Output ONLY a JSON object of this exact shape, with no other text:\n' +
  '  {"prompt": "<scene description>"}';
