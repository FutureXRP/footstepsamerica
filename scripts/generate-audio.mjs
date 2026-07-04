#!/usr/bin/env node
/* Generate ElevenLabs narration + character-level timestamps for a story.
   Audio is the source of truth: once generated and approved, never edit
   the story JSON text except to match the audio (FOOTSTEPS_AMERICA.md §3).

   Usage:
     ELEVENLABS_API_KEY=sk_... node scripts/generate-audio.mjs era02-story03 [more ids...]

   Voice: one voice per tier, never changed mid-tier (§7).
   Writes:
     audio/tier1/<id>.mp3
     audio/tier1/<id>.json   (characters + character_start_times_seconds +
                              character_end_times_seconds, the format
                              js/player.js consumes)

   Long stories are split at paragraph boundaries into <=4500-char chunks;
   chunk timestamps are offset and concatenated. previous_text/next_text
   keep the narrator's prosody continuous across chunks. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TIER1_VOICE_ID = '0dPqNXnhg2bmxQv1WKDp';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';
const MAX_CHUNK_CHARS = 4500;

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('ELEVENLABS_API_KEY is not set. Get one at elevenlabs.io (profile -> API Keys).');
  process.exit(1);
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('Usage: node scripts/generate-audio.mjs <story-id> [more ids...]');
  process.exit(1);
}

function storyPath(id) {
  const m = /^era(\d\d)-story(\d\d)$/.exec(id);
  if (!m) throw new Error('Bad story id: ' + id);
  return join(ROOT, 'data', 'tier1', 'era-' + m[1], 'story-' + m[2] + '.json');
}

// Pack whole paragraphs into chunks under the character limit.
function chunkParagraphs(paragraphs) {
  const chunks = [];
  let current = [];
  let len = 0;
  for (const p of paragraphs) {
    const pLen = p.length + 2; // joined with \n\n
    if (len + pLen > MAX_CHUNK_CHARS && current.length) {
      chunks.push(current.join('\n\n'));
      current = [];
      len = 0;
    }
    current.push(p);
    len += pLen;
  }
  if (current.length) chunks.push(current.join('\n\n'));
  return chunks;
}

async function ttsWithTimestamps(text, previousText, nextText) {
  const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + TIER1_VOICE_ID +
    '/with-timestamps?output_format=' + OUTPUT_FORMAT;
  const body = {
    text,
    model_id: MODEL_ID,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 }
  };
  if (previousText) body.previous_text = previousText.slice(-500);
  if (nextText) body.next_text = nextText.slice(0, 500);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error('ElevenLabs ' + res.status + ': ' + (await res.text()).slice(0, 500));
  }
  return res.json(); // { audio_base64, alignment: { characters, character_start_times_seconds, character_end_times_seconds }, ... }
}

async function generate(id) {
  const story = JSON.parse(readFileSync(storyPath(id), 'utf8'));
  const chunks = chunkParagraphs(story.paragraphs);
  console.log(id + ': "' + story.title + '", ' +
    story.paragraphs.join('\n\n').length + ' chars in ' + chunks.length + ' chunk(s)');

  const audioBuffers = [];
  const characters = [];
  const starts = [];
  const ends = [];
  let timeOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write('  chunk ' + (i + 1) + '/' + chunks.length + '... ');
    const out = await ttsWithTimestamps(chunks[i], chunks[i - 1], chunks[i + 1]);
    const a = out.alignment;
    audioBuffers.push(Buffer.from(out.audio_base64, 'base64'));
    for (let c = 0; c < a.characters.length; c++) {
      characters.push(a.characters[c]);
      starts.push(a.character_start_times_seconds[c] + timeOffset);
      ends.push(a.character_end_times_seconds[c] + timeOffset);
    }
    timeOffset = ends[ends.length - 1];
    console.log('ok (' + timeOffset.toFixed(1) + 's total)');
  }

  const outDir = join(ROOT, 'audio', 'tier1');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, id + '.mp3'), Buffer.concat(audioBuffers));
  writeFileSync(join(outDir, id + '.json'), JSON.stringify({
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends
  }));
  console.log('  wrote audio/tier1/' + id + '.mp3 (' +
    (Buffer.concat(audioBuffers).length / 1e6).toFixed(1) + ' MB) + timestamps (' +
    timeOffset.toFixed(1) + 's)');
}

for (const id of ids) {
  await generate(id);
}
