// あそびの一覧（ホームの並びの順）。ゲームを足す時は、ここに1行足し、sw.js の FILES にファイルを足す。
// - id：画面と部品の名前（view-{id}・{id}-stage・{id}-play など）。猫は cats.js の GAME_CAT が決める
// - lines：ホームのカードの名前（1行ずつ）。name：ゲームの画面の上の名前
// - kind：決め方の仕組み（RS01-S07 の種類の数え方）。use：使える時（選択肢の数）
// - group：ホームの見出し（決め方の仕組みで分ける：RS01-S07）。同じ見出しのゲームは続けて並べる
// - max：扱える選択肢の数の上限（書かない時は 12）。いまの選択肢がこれより多い時、ホームのカードは うすくなり押せない（RS01-S08）
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
import { createSagasu } from './sagasu.js';
import { createSaikoro } from './saikoro.js';
import { createNegaeri } from './negaeri.js';
import { createMekuri } from './mekuri.js';
import { createWanage } from './wanage.js';
import { createTsuri } from './tsuri.js';
import { createTobiishi } from './tobiishi.js';
import { createHidamari } from './hidamari.js';
import { createCrane } from './crane.js';
import { createGacha } from './gacha.js';
import { createKanransha } from './kanransha.js';
import { createShabon } from './shabon.js';
import { createJarashi } from './jarashi.js';
import { createHikoki } from './hikoki.js';
import { createWatage } from './watage.js';
import { createHimo } from './himo.js';
import { createHyokkori } from './hyokkori.js';
import { createYubin } from './yubin.js';
import { createDaruma } from './daruma.js';

export const GAMES = [
  { id: 'roulette', group: 'まわる・ころがる', name: 'にくきゅうルーレット', lines: ['にくきゅう', 'ルーレット'], desc: 'はりが とまった ところ', play: 'まわす', kind: '回って止まる', use: '2〜12こ', create: createRoulette },
  { id: 'saikoro', group: 'まわる・ころがる', name: 'ねこ さいころ', lines: ['ねこ', 'さいころ'], desc: 'うえを むいた め', play: 'ころがす', kind: '転がって止まる', use: '2〜6こ', max: 6, create: createSaikoro },
  { id: 'kanransha', group: 'まわる・ころがる', name: 'ねこの かんらんしゃ', lines: ['ねこの', 'かんらんしゃ'], desc: 'てっぺんに とまった ゴンドラ', play: 'まわす', kind: '回って止まる（かんらんしゃ）', use: '2〜12こ', create: createKanransha },
  { id: 'stamp', group: 'めくって あつめる', name: 'にくきゅうスタンプ', lines: ['にくきゅう', 'スタンプ'], desc: 'アズの てで ぽんと おす', play: 'スタンプ', kind: 'めくる・集める', use: '2〜12こ', create: createStamp },
  { id: 'mekuri', group: 'めくって あつめる', name: 'ぺらぺら めくり', lines: ['ぺらぺら', 'めくり'], desc: 'めくるのを やめた ページ', play: 'めくる', kind: 'めくる（ページ）', use: '2〜12こ', create: createMekuri },
  { id: 'nobi', group: 'たかさに とどく', name: 'のびのび せいくらべ', lines: ['のびのび', 'せいくらべ'], desc: 'のびた たかさで きまる', play: 'のびる', kind: '高さ・量へ届く', use: '2〜12こ', create: createNobi },
  { id: 'tower', group: 'たかさに とどく', name: 'だんボール タワー', lines: ['だんボール', 'タワー'], desc: 'つみあがった たかさ', play: 'つむ', kind: '高さへ届く（積む）', use: '2〜12こ', create: createTower },
  { id: 'hana', group: 'ねこの きまぐれ', name: 'はなびら うらない', lines: ['はなびら', 'うらない'], desc: 'さいごに のこる 1まい', play: 'うらなう', kind: '猫の気まぐれ（のこる）', use: '2〜12こ', create: createHana },
  { id: 'negaeri', group: 'ねこの きまぐれ', name: 'ねこの ねがえり', lines: ['ねこの', 'ねがえり'], desc: 'あたまが むいた ほう', play: 'ごろん', kind: '猫の気まぐれ（向き）', use: '2〜8こ', max: 8, create: createNegaeri },
  { id: 'hidamari', group: 'ねこの きまぐれ', name: 'ひだまり ねこ', lines: ['ひだまり', 'ねこ'], desc: 'まるくなった ざぶとん', play: 'ひなたぼっこ', kind: '猫の気まぐれ（ひだまり）', use: '2〜12こ', create: createHidamari },
  { id: 'shabon', group: 'ねこの きまぐれ', name: 'ねこの しゃぼんだま', lines: ['ねこの', 'しゃぼんだま'], desc: 'さいごに のこった たま', play: 'ふーっ', kind: '猫の気まぐれ（しゃぼんだま）', use: '2〜12こ', create: createShabon },
  { id: 'jarashi', group: 'ねこの きまぐれ', name: 'ねこじゃらし', lines: ['ねこじゃらし', 'とびつき'], desc: 'アズが とびついた 1ぽん', play: 'ふりふり', kind: '猫の気まぐれ（とびつく）', use: '2〜12こ', create: createJarashi },
  { id: 'kuji', group: 'かくれた ものを あてる', name: 'まねきねこ おみくじ', lines: ['まねきねこ', 'おみくじ'], desc: 'でてきた ぼうの ばんごう', play: 'ふる', kind: '隠して当てる（くじ）', use: '2〜12こ', create: createKuji },
  { id: 'sagasu', group: 'かくれた ものを あてる', name: 'おもちゃ さがし', lines: ['おもちゃ', 'さがし'], desc: 'おもちゃが あった はこ', play: 'さがす', kind: '隠して当てる（さがす）', use: '2〜12こ', create: createSagasu },
  { id: 'gacha', group: 'かくれた ものを あてる', name: 'ねこ ガチャ', lines: ['ねこ', 'ガチャ'], desc: 'でてきた カプセルの ばんごう', play: 'まわす', kind: '隠して当てる（ガチャ）', use: '2〜12こ', create: createGacha },
  { id: 'himo', group: 'かくれた ものを あてる', name: 'ひもひき くじ', lines: ['ひもひき', 'くじ'], desc: 'ひっぱった ひもの さき', play: 'ひっぱる', kind: '隠して当てる（ひもくじ）', use: '2〜12こ', create: createHimo },
  { id: 'hyokkori', group: 'かくれた ものを あてる', name: 'ひょっこり こねこ', lines: ['ひょっこり', 'こねこ'], desc: 'かおを だした ままの あな', play: 'ひょっこり', kind: '隠して当てる（あな）', use: '2〜12こ', create: createHyokkori },
  { id: 'amida', group: 'みちを たどる', name: 'あしあと あみだ', lines: ['あしあと', 'あみだ'], desc: 'せんを たどった さき', play: 'あるく', kind: '線をたどる', use: '2〜12こ', create: createAmida },
  { id: 'maigo', group: 'みちを たどる', name: 'まいごの こねこ', lines: ['まいごの', 'こねこ'], desc: 'わかれみちの さきの でぐち', play: 'あるく', kind: '線をたどる（分かれ道）', use: '2〜12こ', create: createMaigo },
  { id: 'yubin', group: 'みちを たどる', name: 'ゆうびん ねこ', lines: ['ゆうびん', 'ねこ'], desc: 'てがみを とどけた いえ', play: 'とどける', kind: '道をたどる（とどける）', use: '2〜12こ', create: createYubin },
  { id: 'race', group: 'きょうそう', name: 'けいとだま レース', lines: ['けいとだま', 'レース'], desc: 'いちばんに ついた たま', play: 'よーい どん', kind: '競争する', use: '2〜12こ', create: createRace },
  { id: 'daruma', group: 'きょうそう', name: 'ねこの だるまさん', lines: ['だるまさんが', 'ころんだ'], desc: 'さいしょに タッチした こねこ', play: 'はじめる', kind: '競争する（とまって すすむ）', use: '2〜12こ', create: createDaruma },
  { id: 'mato', group: 'ねらって あてる', name: 'ねこパンチ まとあて', lines: ['ねこパンチ', 'まとあて'], desc: 'たまが あたった まと', play: 'ねらう', kind: '当てる（的当て）', use: '2〜12こ', create: createMato },
  { id: 'wanage', group: 'ねらって あてる', name: 'ねこの わなげ', lines: ['ねこの', 'わなげ'], desc: 'わが はいった ぼう', play: 'なげる', kind: '当てる（わなげ）', use: '2〜12こ', create: createWanage },
  { id: 'sugoroku', group: 'ぴょんぴょん すすむ', name: 'ねこ すごろく', lines: ['ねこ', 'すごろく'], desc: 'こまが とまった ます', play: 'さいころ', kind: '盤を進む', use: '2〜12こ', create: createSugoroku },
  { id: 'tobiishi', group: 'ぴょんぴょん すすむ', name: 'こねこの とびいし', lines: ['こねこの', 'とびいし'], desc: 'とまった いし', play: 'とぶ', kind: '盤を進む（とびいし）', use: '2〜12こ', create: createTobiishi },
  { id: 'otoshi', group: 'おちて はいる', name: 'カリカリ おとし', lines: ['カリカリ', 'おとし'], desc: 'おさらに はいった ところ', play: 'おとす', kind: '上から落ちて入る', use: '2〜12こ', create: createOtoshi },
  { id: 'hikoki', group: 'おちて はいる', name: 'かみひこうき', lines: ['かみ', 'ひこうき'], desc: 'ひこうきが おりた ばしょ', play: 'とばす', kind: '落ちて入る（とんで おりる）', use: '2〜12こ', create: createHikoki },
  { id: 'watage', group: 'おちて はいる', name: 'たんぽぽの わたげ', lines: ['たんぽぽの', 'わたげ'], desc: 'わたげが おりた はなだん', play: 'ふーっ', kind: '落ちて入る（風で とぶ）', use: '2〜12こ', create: createWatage },
  { id: 'tsuri', group: 'つりあげる', name: 'ねこの つりぼり', lines: ['ねこの', 'つりぼり'], desc: 'さかなが くいついた ふかさ', play: 'つる', kind: '釣る', use: '2〜12こ', create: createTsuri },
  { id: 'crane', group: 'つりあげる', name: 'ねこ クレーンゲーム', lines: ['クレーン', 'ゲーム'], desc: 'アームが つかんだ ぬいぐるみ', play: 'つかむ', kind: 'つかんで取る', use: '2〜12こ', create: createCrane },
];

// 扱える選択肢の数の上限
export const maxOf = (g) => g.max || 12;
