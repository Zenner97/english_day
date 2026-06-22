#!/usr/bin/env node
/**
 * Генерация озвучки для тренажёра через ElevenLabs — запускается ЛОКАЛЬНО у тебя на машине.
 * Ключ передаётся через переменную окружения и НЕ попадает в репозиторий.
 * Готовые mp3 кладутся в ./audio и коммитятся на GitHub вместе с index.html.
 *
 * Нужен Node.js 18+ (встроенный fetch).
 *
 * Запуск (голос уже прописан по умолчанию):
 *   ELEVENLABS_API_KEY=sk_твой_ключ node generate_audio.mjs
 *
 * Перегенерировать поверх существующих файлов:
 *   FORCE=1 ELEVENLABS_API_KEY=sk_... node generate_audio.mjs
 *
 * Сменить голос/модель при желании:
 *   VOICE_ID=другой_id MODEL_ID=eleven_turbo_v2_5 ELEVENLABS_API_KEY=sk_... node generate_audio.mjs
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";

const API_KEY  = process.env.ELEVENLABS_API_KEY;                 // НЕ хардкодим ключ в файл
const VOICE_ID = process.env.VOICE_ID || "aKUMgdkpitgitOAQ9gZN"; // твой голос по умолчанию
const MODEL_ID = process.env.MODEL_ID || "eleven_multilingual_v2";
const FORCE    = process.env.FORCE === "1";
const OUT_DIR  = "audio";
const OUTPUT_FORMAT = "mp3_44100_128";

// id и текст совпадают с ITEMS в index.html (для связок берём чистую фразу).
const ITEMS = [
  ["01", "I woke up a bit earlier than usual this morning."],
  ["02", "The first thing I did was make myself a coffee to wake up properly."],
  ["03", "I had my coffee slowly while playing with my cat."],
  ["04", "Then I fed him and topped up his water."],
  ["05", "After that, I squeezed in a quick workout."],
  ["06", "I did a bit of yoga to stretch and get my body moving."],
  ["07", "In the morning, I gave my friend a call."],
  ["08", "We decided to meet up at a coffee shop."],
  ["09", "We wanted to put together some content for our Reels."],
  ["10", "So we spent a while brainstorming ideas and sorting out the details."],
  ["11", "It was so nice to finally catch up with her."],
  ["12", "Afterwards, we decided to do a bit of shopping."],
  ["13", "I'd been meaning to update my wardrobe."],
  ["14", "I ended up getting a pair of pants and a nice T-shirt."],
  ["15", "The prices were pretty reasonable, so I was happy with what I got."],
  ["16", "After that, I headed back home."],
  ["17", "I made myself something nice for dinner."],
  ["18", "While dinner was cooking, I played with my cat for a bit."],
  ["19", "Then I curled up with a book for a while."],
  ["20", "I had dinner and put on my favorite show."],
  ["21", "By the end of the day, I was exhausted, so I went to bed."],
  ["22", "On a typical day, I tend to wake up around eight."],
  ["23", "I can't really get going without my morning coffee."],
  ["24", "During the day, I'm usually busy working on my content."],
  ["25", "In the evening, I like to wind down with a book."],
  ["26", "I try to get to bed before midnight, but it doesn't always work out."],
  ["27", "I've got a pretty packed day ahead of me."],
  ["28", "First, I'm going to grab a coffee and do a bit of yoga."],
  ["29", "After that, I'm meeting up with my friend."],
  ["30", "Later on, we're planning to shoot some Reels together."],
  ["31", "In the evening, I'll probably just cook dinner and chill."],
  ["32", "Hopefully, everything goes according to plan."],
  ["33", "To start with,"],
  ["34", "Right after that,"],
  ["35", "A bit later on,"],
  ["36", "By the end of the day,"],
  ["37", "To be honest with you,"],
  ["38", "Or something like that."]
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function exists(p){ try{ await access(p, constants.F_OK); return true; }catch{ return false; } }

async function synth(text){
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true }
    })
  });
  if(!res.ok){
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${t.slice(0,300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main(){
  if(!API_KEY){
    console.error("❌ Не задан ELEVENLABS_API_KEY. Запусти так:\n   ELEVENLABS_API_KEY=sk_... node generate_audio.mjs");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`🎙  Голос: ${VOICE_ID} · модель: ${MODEL_ID}\n`);

  let made = 0, skipped = 0, failed = 0;
  for(const [id, text] of ITEMS){
    const file = `${OUT_DIR}/${id}.mp3`;
    if(!FORCE && await exists(file)){ skipped++; console.log(`· ${id} уже есть, пропускаю (FORCE=1 чтобы перезаписать)`); continue; }
    try{
      const buf = await synth(text);
      await writeFile(file, buf);
      made++;
      console.log(`✓ ${id}  ${text}`);
      await sleep(350); // бережём лимиты
    }catch(e){
      failed++;
      console.error(`✗ ${id}  ${e.message}`);
    }
  }
  console.log(`\nГотово. Создано: ${made}, пропущено: ${skipped}, ошибок: ${failed}.`);
  if(failed) process.exit(1);
}

main();
