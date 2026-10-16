// あそびの一覧（ホームの並びの順）。ゲームを足す時は、ここに1行足し、sw.js の FILES にファイルを足す。
// - id：画面と部品の名前（view-{id}・{id}-stage・{id}-play など）。猫は cats.js の GAME_CAT が決める
// - lines：ホームのカードの名前（1行ずつ）。name：ゲームの画面の上の名前
// - kind：決め方の仕組み（RS01-S07 の種類の数え方）。use：使える時（選択肢の数）
import { createRoulette } from './roulette.js';
import { createStamp } from './stamp.js';
import { createNobi } from './nobi.js';
import { createHana } from './hana.js';
import { createKuji } from './kuji.js';
import { createAmida } from './amida.js';
import { createRace } from './race.js';
import { createMato } from './mato.js';
import { createSugoroku } from './sugoroku.js';
import { createOtoshi } from './otoshi.js';
import { createMaigo } from './maigo.js';
import { createTower } from './tower.js';

export const GAMES = [
  { id: 'roulette', name: 'にくきゅうルーレット', lines: ['にくきゅう', 'ルーレット'], desc: 'はりが とまった ところ', play: 'まわす', kind: '回って止まる', use: '2〜12こ', create: createRoulette },
  { id: 'stamp', name: 'にくきゅうスタンプ', lines: ['にくきゅう', 'スタンプ'], desc: 'ねこの てで ぽんと おす', play: 'スタンプ', kind: 'めくる・集める', use: '2〜12こ', create: createStamp },
  { id: 'nobi', name: 'のびのび せいくらべ', lines: ['のびのび', 'せいくらべ'], desc: 'のびた たかさで きまる', play: 'のびる', kind: '高さ・量へ届く', use: '2〜12こ', create: createNobi },
  { id: 'hana', name: 'はなびら うらない', lines: ['はなびら', 'うらない'], desc: 'さいごに のこる 1まい', play: 'うらなう', kind: '猫の気まぐれ（のこる）', use: '2〜12こ', create: createHana },
  { id: 'kuji', name: 'まねきねこ おみくじ', lines: ['まねきねこ', 'おみくじ'], desc: 'でてきた ぼうの ばんごう', play: 'ふる', kind: '隠して当てる（くじ）', use: '2〜12こ', create: createKuji },
  { id: 'amida', name: 'あしあと あみだ', lines: ['あしあと', 'あみだ'], desc: 'せんを たどった さき', play: 'あるく', kind: '線をたどる', use: '2〜12こ', create: createAmida },
  { id: 'race', name: 'けいとだま レース', lines: ['けいとだま', 'レース'], desc: 'いちばんに ついた たま', play: 'よーい どん', kind: '競争する', use: '2〜12こ', create: createRace },
  { id: 'mato', name: 'ねこパンチ まとあて', lines: ['ねこパンチ', 'まとあて'], desc: 'たまが あたった まと', play: 'ねらう', kind: '当てる（的当て）', use: '2〜12こ', create: createMato },
  { id: 'sugoroku', name: 'ねこ すごろく', lines: ['ねこ', 'すごろく'], desc: 'こまが とまった ます', play: 'さいころ', kind: '盤を進む', use: '2〜12こ', create: createSugoroku },
  { id: 'otoshi', name: 'カリカリ おとし', lines: ['カリカリ', 'おとし'], desc: 'おさらに はいった ところ', play: 'おとす', kind: '上から落ちて入る', use: '2〜12こ', create: createOtoshi },
  { id: 'maigo', name: 'まいごの こねこ', lines: ['まいごの', 'こねこ'], desc: 'わかれみちの さきの でぐち', play: 'あるく', kind: '線をたどる（分かれ道）', use: '2〜12こ', create: createMaigo },
  { id: 'tower', name: 'だんボール タワー', lines: ['だんボール', 'タワー'], desc: 'つみあがった たかさ', play: 'つむ', kind: '高さへ届く（積む）', use: '2〜12こ', create: createTower },
];
